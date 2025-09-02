// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
  authDomain: "school-website-66326.firebaseapp.com",
  projectId: "school-website-66326",
  storageBucket: "school-website-66326.firebasestorage.app",
  messagingSenderId: "660829781706",
  appId: "1:660829781706:web:b83301caa822e9b0d9be33"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Get the auth service instance

// Get references to elements for the Register form
const registerEmailInput = document.getElementById('registerEmail');
const registerPasswordInput = document.getElementById('registerPassword');
const registerSubmitButton = document.getElementById('registerSubmit');

// Get references to elements for the Login form
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const loginSubmitButton = document.getElementById('loginSubmit');


// Event Listener for REGISTER button
registerSubmitButton.addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default form submission

    const email = registerEmailInput.value;
    const password = registerPasswordInput.value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed up 
            const user = userCredential.user;
            alert(`User ${user.email} created successfully!`);
            // You might want to switch to the login form or redirect here
            loginLink.click();
        })
        .catch((error) => {
            const errorMessage = error.message;
            alert(`Registration Error: ${errorMessage}`);
        });
});

// Event Listener for LOGIN button
loginSubmitButton.addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default form submission

    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    signInWithEmailAndPassword(auth, email, password) // Use signInWithEmailAndPassword for login
        .then((userCredential) => {
            // Signed in 
            const user = userCredential.user;
            alert(`Welcome back, ${user.email}!`);
            // Redirect or update UI for logged-in user
            
        })
        .catch((error) => {
            const errorMessage = error.message;
            alert(`Login Error: ${errorMessage}`);
        });
});


// Your existing form switching logic (keep this as is)
const loginLink = document.getElementById('show-login');
const registerLink = document.getElementById('show-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

loginLink.addEventListener('click', () => {
    registerForm.classList.remove('active-form');
    loginForm.classList.add('active-form');
});

registerLink.addEventListener('click', () => {
    loginForm.classList.remove('active-form');
    registerForm.classList.add('active-form');
});

