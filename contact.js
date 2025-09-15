const firebaseConfig = {
  apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
  authDomain: "school-website-66326.firebaseapp.com",
  databaseURL: "https://school-website-66326-default-rtdb.firebaseio.com",
  projectId: "school-website-66326",
  storageBucket: "school-website-66326.appspot.com", // Corrected URL
  messagingSenderId: "660829781706",
  appId: "1:660829781706:web:8f25196634637fe4d9be33"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const contactForm = document.querySelector('.contact-form');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;

  // Add data to Firestore
  db.collection('contact-form-submissions').add({
      name: name,
      email: email,
      subject: subject,
      message: message,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      alert("Your message has been sent successfully! We'll get back to you shortly.");
      contactForm.reset();
    })
    .catch((error) => {
      console.error("Error writing document: ", error);
      alert("Oops! Something went wrong. Please try again later.");
    });
});