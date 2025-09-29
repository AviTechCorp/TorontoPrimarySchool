// auth.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// Your web app's Firebase configuration
const firebaseConfig = {
 apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
 authDomain: "school-website-66326.firebaseapp.com",
 databaseURL: "https://school-website-66326-default-rtdb.firebaseio.com",
 projectId: "school-website-66326",
 storageBucket: "school-website-66326.firebasestorage.app",
 messagingSenderId: "660829781706",
 appId: "1:660829781706:web:bf447db1d80fc094d9be33"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Get the auth service instance
const db = getFirestore(app); // Get the Firestore service instance

// Get references to elements for form switching
const loginLink = document.getElementById('show-login');
const registerLink = document.getElementById('show-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Get references to elements for the Register form
const registerRoleSelect = document.getElementById('role-select');
// **CORRECTED:** Renamed to learnerFields and linked to HTML ID 'learner-fields'
const learnerFields = document.getElementById('learner-fields'); 
const parentFields = document.getElementById('parent-fields');
const teacherFields = document.getElementById('teacher-fields');
const adminFields = document.getElementById('admin-fields');
const registerPasswordInput = document.getElementById('registerPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const registerSubmitButton = document.getElementById('registerSubmit');

// Get references to elements for the Login form
const loginRoleSelect = document.getElementById('login-role-select');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const loginSubmitButton = document.getElementById('loginSubmit');

/**
* Handles the logic for displaying the correct form fields based on the selected role.
*/
function handleRoleSelection() {
 const selectedRole = registerRoleSelect.value;
 
 // Hide all role-specific fields
 // **CORRECTED:** Use learnerFields
 learnerFields.style.display = 'none'; 
 parentFields.style.display = 'none';
 teacherFields.style.display = 'none';
 adminFields.style.display = 'none';
 
 // Show the fields for the selected role
 switch (selectedRole) {
  // **CORRECTED:** Use 'learner' role value
  case 'learner': 
   learnerFields.style.display = 'block';
   break;
  case 'parent':
   parentFields.style.display = 'block';
   break;
  case 'teacher':
   teacherFields.style.display = 'block';
   break;
  case 'admin':
   adminFields.style.display = 'block';
   break;
 }
}

// Event listener for the role select dropdown
if(registerRoleSelect) {
 registerRoleSelect.addEventListener('change', handleRoleSelection);
 // Initial call to set the correct display on page load
 handleRoleSelection();
}


/**
* Gathers data from the correct form fields based on the selected role.
* @param {string} role - The selected role ('learner', 'parent', 'teacher', or 'admin').
* @returns {object} An object containing the user data.
*/
function collectUserData(role) {
 let userData = {
  role: role,
 };

 // **CORRECTED:** Use 'learner' role and correct input names from HTML
 if (role === 'learner') { 
  userData.fullName = document.querySelector('input[name="learner-fullName"]').value;
  userData.admissionNumber = document.querySelector('input[name="learner-admissionNumber"]').value;
  userData.email = document.querySelector('input[name="learner-email"]').value; 
  userData.dob = document.querySelector('input[name="learner-dob"]').value;
  userData.grade = document.querySelector('select[name="learner-grade"]').value;
  userData.gender = document.querySelector('select[name="learner-gender"]').value;
 } else if (role === 'parent') {
  userData.email = document.querySelector('input[name="parent-email"]').value;
  userData.surname = document.querySelector('input[name="parent-surname"]').value;
  userData.name = document.querySelector('input[name="parent-name"]').value;
  userData.contact = document.querySelector('input[name="parent-contact"]').value;
  userData.relationship = document.querySelector('input[name="relationship"]').value;
  userData.admissionNumber = document.querySelector('input[name="admission-number"]').value;
  userData.learnerSurname = document.querySelector('input[name="learner-surname"]').value;
  userData.learnerFirstName = document.querySelector('input[name="learner-first-name"]').value;
  userData.learnerMiddleName = document.querySelector('input[name="learner-middle-name"]').value;
  userData.learnerDOB = document.querySelector('input[name="learner-dob"]').value;
  userData.learnerGender = document.querySelector('select[name="learner-gender"]').value;
  userData.learnerGrade = document.querySelector('select[name="learner-grade"]').value;
 } else if (role === 'teacher') {
  userData.email = document.querySelector('input[name="teacher-email"]').value;
  userData.surname = document.querySelector('input[name="teacher-surname"]').value;
  userData.preferredName = document.querySelector('input[name="teacher-preferred-name"]').value;
 } else if (role === 'admin') {
  userData.email = document.querySelector('input[name="admin-email"]').value;
  userData.surname = document.querySelector('input[name="admin-surname"]').value;
  userData.preferredName = document.querySelector('input[name="admin-preferred-name"]').value;
  userData.specialId = document.querySelector('input[name="admin-special-id"]').value;
 }

 return userData;
}

// Event Listener for REGISTER button
if(registerSubmitButton) {
 registerSubmitButton.addEventListener('click', async function(event) {
  event.preventDefault(); // Prevent default form submission

  const role = registerRoleSelect.value;
  const email = collectUserData(role).email;
  const password = registerPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  // Basic form validation
  if (!email || !password || !confirmPassword || !role) {
   alert('Please fill in all required fields.');
   return;
  }

  if (password !== confirmPassword) {
   alert('Passwords do not match!');
   return;
  }
  
  // Check if role-specific fields are filled
  const roleForm = document.getElementById(`${role}-fields`);
  const requiredInputs = roleForm ? roleForm.querySelectorAll('[required]') : [];
  for (let input of requiredInputs) {
   if (!input.value) {
    alert('Please fill in all required fields for your role.');
    return;
   }
  }

  try {
   // Create user with email and password in Firebase Authentication
   const userCredential = await createUserWithEmailAndPassword(auth, email, password);
   const user = userCredential.user;
   
   // Collect additional user data from the form
   const userData = collectUserData(role);

   // Save additional user data to Firestore
   await setDoc(doc(db, "users", user.uid), userData);

   alert(`Registration successful! Welcome, ${userData.name || userData.preferredName || userData.surname || userData.admissionNumber || userData.fullName}!`);
   // Switch to the login form after successful registration
   loginLink.click();
  } catch (error) {
   console.error("Registration Error:", error);
   alert(`Registration Error: ${error.message}`);
  }
 });
}


// Event Listener for LOGIN button
if(loginSubmitButton) {
 loginSubmitButton.addEventListener('click', async function(event) {
  event.preventDefault(); // Prevent default form submission

  const email = loginEmailInput.value;
  const password = loginPasswordInput.value;
  const role = loginRoleSelect.value;
  
  // Basic validation
  if (!email || !password || !role) {
   alert('Please enter your email, password, and select your role.');
   return;
  }

  try {
   const userCredential = await signInWithEmailAndPassword(auth, email, password);
   const user = userCredential.user;

   const userDocRef = doc(db, 'users', user.uid);
   const userDocSnap = await getDoc(userDocRef);
   
   if (userDocSnap.exists()) {
    const userData = userDocSnap.data();
    if (userData.role === role) {
     
     // Store user data in sessionStorage for access on other pages
     sessionStorage.setItem('currentUser', JSON.stringify(userData));
     
     alert(`Welcome back, ${userData.name || userData.preferredName || userData.surname || userData.admissionNumber || userData.fullName || 'User'}!`);

     // Redirect based on the selected role
     switch(role) {
      // **CORRECTED:** Redirect to 'learners-portal.html'
      case 'learner': 
       window.location.href = "learners-portal.html";
       break;
      case 'parent':
       window.location.href = "parents-portal.html";
       break;
      case 'teacher':
       window.location.href = "teachers-portal.html";
       break;
      case 'admin':
       window.location.href = "admins-portal.html";
       break;
      default:
       // Fallback for an unknown role
       window.location.href = "index.html";
       break;
     }
    } else {
     alert("The role you selected does not match the role you registered as. Please try again.");
     // Sign the user out immediately if roles don't match
     await signOut(auth);
    }
   } else {
    alert("User data not found. Please contact support.");
    await signOut(auth);
   }
  } catch (error) {
   console.error("Login Error:", error);
   alert(`Login Error: ${error.message}`);
  }
 });
}

// Form switching logic
if (loginLink) {
 loginLink.addEventListener('click', () => {
  registerForm.classList.remove('active-form');
  loginForm.classList.add('active-form');
  // Update the active button style
  loginLink.classList.add('active');
  registerLink.classList.remove('active');
 });
}

if (registerLink) {
 registerLink.addEventListener('click', () => {
  loginForm.classList.remove('active-form');
  registerForm.classList.add('active-form');
  // Update the active button style
  registerLink.classList.add('active');
  loginLink.classList.remove('active');
 });
}


// Check for authentication state change to redirect users who are not logged in.
onAuthStateChanged(auth, (user) => {
 const currentPath = window.location.pathname;
 const isLoggedIn = !!user;

 // List of protected portal pages
 const protectedPages = [
  'learners-portal.html', // **CORRECTED:** Updated portal file name
  'parents-portal.html',
  'teachers-portal.html',
  'admins-portal.html'
 ];
 
 // Check if the current page is a protected page and the user is not logged in
 if (protectedPages.some(page => currentPath.endsWith(page)) && !isLoggedIn) {
  alert("You must be logged in to view this page.");
  window.location.href = "auth.html";
 }
});


/**
* Handle user logout.
* This function signs the user out of Firebase and redirects them to the login page.
*/
function handleLogout() {
 signOut(auth).then(() => {
  // Clear user data from session storage on logout
  sessionStorage.removeItem('currentUser');
  alert("You have been logged out successfully.");
  window.location.href = "auth.html";
 }).catch((error) => {
  // An error happened.
  console.error("Logout Error:", error);
  alert("Logout failed. Please try again.");
 });
}

// Attach the logout function to all buttons with the class 'btn-logout'
document.querySelectorAll('.btn-logout').forEach(button => {
 button.addEventListener('click', (e) => {
  e.preventDefault(); // Prevent the default link behavior
  handleLogout();
 });
});