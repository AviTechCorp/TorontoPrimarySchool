// ===============================================
// === 1. FIREBASE INITIALIZATION & IMPORTS ===
// ===============================================

// Import the necessary functions from the Firebase SDKs.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// Your web app's Firebase configuration.
const firebaseConfig = {
  apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
  authDomain: "school-website-66326.firebaseapp.com",
  databaseURL: "https://school-website-66326-default-rtdb.firebaseio.com",
  projectId: "school-website-66326",
  storageBucket: "school-website-66326.firebasestorage.app",
  messagingSenderId: "660829781706",
  appId: "1:660829781706:web:b83301caa822e9b0d9be33"
};

// Initialize Firebase services.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);


// ===============================================
// === 2. AUTHENTICATION (REGISTER & LOGIN) ===
// ===============================================

// Get references to all relevant elements for Auth forms.
const registerForm = document.getElementById('register-form');
const registerSubmitButton = document.getElementById('registerSubmit');
const loginForm = document.getElementById('login-form');
const loginSubmitButton = document.getElementById('loginSubmit');
const loginLink = document.getElementById('show-login');
const registerLink = document.getElementById('show-register');
const loginRoleSelect = document.getElementById('login-role-select');
const registerPasswordInput = document.getElementById('registerPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Get references for role-specific fields.
const roleSelect = document.getElementById('role-select');
const parentFields = document.getElementById('parent-fields');
const teacherFields = document.getElementById('teacher-fields');
const adminFields = document.getElementById('admin-fields');

/**
 * Handles the display logic for different user roles in the registration form.
 */
function handleRoleSelection() {
  const selectedRole = roleSelect.value;
  // Hide all role-specific fields first.
  parentFields.style.display = 'none';
  teacherFields.style.display = 'none';
  adminFields.style.display = 'none';

  // Show fields based on the selected role.
  if (selectedRole === 'parent') {
    parentFields.style.display = 'block';
  } else if (selectedRole === 'teacher') {
    teacherFields.style.display = 'block';
  } else if (selectedRole === 'admin') {
    adminFields.style.display = 'block';
  }
}

/**
 * Collects and returns form data for a given role.
 * @param {string} role - The selected user role ('parent', 'teacher', or 'admin').
 * @returns {object} The collected user data.
 */
function collectUserData(role) {
  const fields = document.getElementById(`${role}-fields`);
  if (!fields) return {};

  let userData = { role };

  const inputElements = fields.querySelectorAll('input, select, textarea');
  inputElements.forEach(input => {
    const key = input.name.replace(`${role}-`, '').replace('-', '');
    userData[key] = input.value;
  });

  // Special handling for nested learner data for 'parent' role.
  if (role === 'parent') {
    const learnerInputs = parentFields.querySelectorAll('[name^="learner-"]');
    userData.learner = {};
    learnerInputs.forEach(input => {
      const key = input.name.replace('learner-', '').replace('-', '');
      userData.learner[key] = input.value;
    });
  }

  return userData;
}

/**
 * Validates registration form data.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @param {string} confirmPassword - The password confirmation.
 * @returns {string|null} An error message if validation fails, otherwise null.
 */
function validateRegistration(email, password, confirmPassword) {
  if (!email || !password || !confirmPassword) {
    return "Please fill in all required fields.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters long.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match!";
  }
  return null;
}

// Event listener for the REGISTER button.
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const selectedRole = roleSelect.value;
  if (!selectedRole) {
    alert("Please select a role.");
    return;
  }

  const emailInput = document.getElementById(`${selectedRole}-fields`).querySelector('input[type="email"]');
  const email = emailInput ? emailInput.value : '';
  const password = registerPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  const validationError = validateRegistration(email, password, confirmPassword);
  if (validationError) {
    alert(validationError);
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDataToSave = collectUserData(selectedRole);
    
    // Save user profile data to the Realtime Database.
    const userRef = ref(database, `${selectedRole}s/${user.uid}`);
    await set(userRef, userDataToSave);

    alert(`User ${user.email} created successfully as a ${selectedRole}!`);
    loginLink.click();
  } catch (error) {
    let errorMessage = "An unknown error occurred during registration.";
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email address is already in use.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak. Please choose a stronger one.';
          break;
        default:
          errorMessage = error.message;
      }
    }
    alert(`Registration Error: ${errorMessage}`);
    console.error("Firebase Registration Error:", error);
  }
});

// Event listener for the LOGIN button.
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = loginEmailInput.value;
  const password = loginPasswordInput.value;
  const selectedRole = loginRoleSelect.value;

  if (!selectedRole) {
    alert("Please select a role.");
    return;
  }
  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      alert(`Welcome back, ${user.email}!`);
      
      // Redirect based on the selected role.
      if (selectedRole === 'parent') {
        window.location.href = 'parents-portal.html';
      } else if (selectedRole === 'teacher') {
        window.location.href = 'teachers-portal.html';
      } else if (selectedRole === 'admin') {
        window.location.href = 'admins-portal.html';
      } else {
        window.location.href = 'index.html'; 
      }
    })
    .catch((error) => {
      let errorMessage = "An unknown error occurred during login.";
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-email':
          case 'auth/user-disabled':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = 'Invalid email or password. Please try again.';
            break;
          default:
            errorMessage = error.message;
        }
      }
      alert(`Login Error: ${errorMessage}`);
      console.error("Firebase Login Error:", error);
    });
});

// Check authentication state on page load.
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in.
    console.log("User is signed in:", user.email);
  } else {
    // User is signed out.
    console.log("User is signed out.");
  }
});


// ===============================================
// === 3. GOOGLE APPS SCRIPT FORM SUBMISSION ===
// ===============================================

const applicationForm = document.getElementById('application-form');
const mainContentSection = document.getElementById('main-content');
const scriptURL = 'https://script.google.com/macros/s/AKfycbzW-J9sMy6yZtW2_8OpEvO-HTyfPQbafzgj0GyvUGiArreIBUrD6Qr2wsnnjhbKHImW8Q/exec';
const documentUploadURL = 'https://docs.google.com/forms/d/e/1FAIpQLScm97c_E481h9iF2z-J4-u-gVl3p-f-gL9XoJ4m_L9A6X0fG_A/viewform?usp=sf_link';

if (applicationForm && mainContentSection) {
  applicationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Display a temporary "submitting" message.
    mainContentSection.innerHTML = `
      <div class="confirmation-message">
        <h2>Submitting your application...</h2>
        <p>Please wait a moment. Do not close this page.</p>
      </div>
    `;

    try {
      const formData = new FormData(applicationForm);
      const response = await fetch(scriptURL, { method: 'POST', body: formData });

      if (response.ok) {
        // Upon successful submission, replace content with the confirmation message.
        mainContentSection.innerHTML = `
          <div class="confirmation-message">
            <h2>Application Submitted Successfully!</h2>
            <p>Thank you for submitting your application. Your information has been received.</p>
            <p>Please use the link below to submit your supporting documents, such as a birth certificate or ID.</p>
            <a href="${documentUploadURL}" target="_blank">Submit Supporting Documents</a>
          </div>
        `;
      } else {
        // Handle error from the Google Apps Script.
        const errorText = await response.text();
        mainContentSection.innerHTML = `
          <div class="confirmation-message">
            <h2>Submission Failed</h2>
            <p>An error occurred while submitting your application. Please try again later. Error: ${errorText}</p>
            <a href="application-form.html">Try Again</a>
          </div>
        `;
      }
    } catch (error) {
      // Handle network or other errors.
      mainContentSection.innerHTML = `
        <div class="confirmation-message">
          <h2>Submission Failed</h2>
          <p>A network error occurred. Please check your internet connection and try again.</p>
          <a href="application-form.html">Try Again</a>
        </div>
      `;
      console.error('Error:', error);
    }
  });
}


// ===============================================
// === 4. GENERAL PAGE LOGIC & EVENT LISTENERS ===
// ===============================================

// Wait for the DOM to be fully loaded before adding event listeners.
document.addEventListener('DOMContentLoaded', () => {
  // Form switching logic for Auth pages.
  if (loginLink && registerLink) {
    loginLink.addEventListener('click', () => {
      registerForm.classList.remove('active-form');
      loginForm.classList.add('active-form');
    });

    registerLink.addEventListener('click', () => {
      loginForm.classList.remove('active-form');
      registerForm.classList.add('active-form');
    });
  }

  // Role-based form switching on registration page.
  if (roleSelect) {
    roleSelect.addEventListener('change', handleRoleSelection);
    // Initial call to set the correct fields on page load.
    handleRoleSelection();
  }
});