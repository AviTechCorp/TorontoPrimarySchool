const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();

// Set the SendGrid API key from the environment variables.
// It's good practice to handle cases where config might be missing.
const SENDGRID_API_KEY = functions.config().sendgrid.key;
sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * A callable Cloud Function to send an email from a teacher to a parent.
 *
 * @param {object} data - The data passed from the client.
 * @param {string} data.parentEmail - The recipient's email address.
 * @param {string} data.subject - The email subject.
 * @param {string} data.messageBody - The plain text body of the email.
 * @param {string} data.teacherName - The name of the sending teacher.
 * @param {string} data.learnerName - The name of the learner being discussed.
 *
 * @param {functions.https.CallableContext} context - The context of the function call.
 * @returns {Promise<{success: boolean, message: string}>} - A promise that resolves with the result.
 */
exports.sendEmailFromTeacher = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check: Ensure the user is a logged-in teacher.
  if (!context.auth || !context.auth.token.email) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const teacherEmail = context.auth.token.email;

  // 2. Construct the email message.
  const msg = {
    to: data.parentEmail,
    from: {
      email: "noreply@your-school-domain.com", // Use a verified sender from SendGrid
      name: `${data.teacherName} (via Toronto Primary Portal)`,
    },
    replyTo: teacherEmail, // When the parent replies, it goes to the teacher's actual email.
    subject: data.subject,
    text: data.messageBody,
    html: `
      <p>Dear Parent/Guardian,</p>
      <p>${data.messageBody.replace(/\n/g, "<br>")}</p>
      <hr>
      <p>This message is regarding the learner: <strong>${data.learnerName}</strong>.</p>
      <p>Sent by: <strong>${data.teacherName}</strong></p>
      <p><em>Please reply directly to this email to respond to the teacher.</em></p>
    `,
  };

  // 3. Send the email.
  try {
    await sgMail.send(msg);
    console.log(`Email sent from ${teacherEmail} to ${data.parentEmail}`);
    return {success: true, message: "Email sent successfully!"};
  } catch (error) {
    console.error("SendGrid Error:", error.response?.body || error);
    throw new functions.https.HttpsError(
        "internal",
        "An error occurred while trying to send the email.",
    );
  }
});

/**
 * A callable Cloud Function to generate an assessment using a Generative AI model.
 * This function acts as a secure backend to protect your API keys.
 *
 * @param {object} data - The data passed from the client.
 * @param {string} data.prompt - The user-provided topic for the assessment.
 * @param {string} data.model - The specific model to use (e.g., 'gemini-1.5-flash-latest').
 * @param {string} data.format - The desired output format ('json' or 'text').
 * @param {string} data.systemInstruction - A system prompt to guide the AI's response.
 *
 * @param {functions.https.CallableContext} context - The context of the function call.
 * @returns {Promise<{success: boolean, assessment: string}>} - A promise that resolves with the result.
 */
exports.generateAssessment = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check: Ensure the user is a logged-in teacher.
  if (!context.auth || !context.auth.token.email) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  // You could add a role check here for extra security
  // const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  // if (!userDoc.exists || userDoc.data().role !== 'teacher') {
  //   throw new functions.https.HttpsError('permission-denied', 'Only teachers can generate assessments.');
  // }

  const {prompt, model, format, systemInstruction} = data;

  // 2. Validate input
  if (!prompt || !model) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a 'prompt' and 'model'.",
    );
  }

  // 3. Set up the AI client
  // NOTE: Your project must have the Vertex AI API enabled.
  // The Cloud Function's service account needs the "Vertex AI User" role.
  const auth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/cloud-platform",
  });
  const client = new discuss.DiscussServiceClient({auth});
  // 3. Set up the Gemini AI client
  // Ensure you have set the Gemini API key in your Firebase environment config
  // firebase functions:config:set gemini.key="YOUR_API_KEY"
  const GEMINI_API_KEY = functions.config().gemini.key;
  if (!GEMINI_API_KEY) {
      throw new functions.https.HttpsError(
          "failed-precondition",
          "The Gemini API key is not configured.",
      );
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const aiModel = genAI.getGenerativeModel({ model: model });

  // 4. Construct the request to the Gemini API
  const fullPrompt = `
    System Instruction: ${systemInstruction}
    User Prompt: ${prompt}
    Output Format: ${format}
  `;
  const fullPrompt = `${systemInstruction}\n\nUser Prompt: "${prompt}"`;

  try {
    const result = await client.generateMessage({
      model: `models/${model}`, // The API expects the model name in this format
      prompt: {
        messages: [{content: fullPrompt}],
      },
    });
    const result = await aiModel.generateContent(fullPrompt);
    const response = await result.response;
    const assessmentContent = response.text();

    // Extract the text content from the response
    const assessmentContent = result[0].candidates[0].content;

    return {success: true, assessment: assessmentContent};
  } catch (error) {
    console.error("Error calling Generative AI API:", error);
    throw new functions.https.HttpsError(
        "internal",
        "An error occurred while generating the assessment.",
        error.message,
    );
  }
});