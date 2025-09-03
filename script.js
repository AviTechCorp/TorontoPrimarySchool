// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

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
const auth = getAuth(app);
const database = getDatabase(app);

// Get references to elements for the Register form
const registerForm = document.getElementById('register-form');
const registerSubmitButton = document.getElementById('registerSubmit');
const roleSelect = document.getElementById('role-select');
const parentFields = document.getElementById('parent-fields');
const teacherFields = document.getElementById('teacher-fields');
const adminFields = document.getElementById('admin-fields');
const confirmPasswordInput = document.getElementById('confirmPassword');
const registerPasswordInput = document.getElementById('registerPassword');

// Get references to elements for the Login form
const loginForm = document.getElementById('login-form');
const loginSubmitButton = document.getElementById('loginSubmit');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const loginRoleSelect = document.getElementById('login-role-select');

// Form switching logic
const loginLink = document.getElementById('show-login');
const registerLink = document.getElementById('show-register');

loginLink.addEventListener('click', () => {
    registerForm.classList.remove('active-form');
    loginForm.classList.add('active-form');
});

registerLink.addEventListener('click', () => {
    loginForm.classList.remove('active-form');
    registerForm.classList.add('active-form');
});

// Role-based form switching (Registration)
roleSelect.addEventListener('change', function() {
    const selectedRole = roleSelect.value;
    
    parentFields.style.display = 'none';
    teacherFields.style.display = 'none';
    adminFields.style.display = 'none';
    
    if (selectedRole === 'parent') {
        parentFields.style.display = 'block';
    } else if (selectedRole === 'teacher') {
        teacherFields.style.display = 'block';
    } else if (selectedRole === 'admin') {
        adminFields.style.display = 'block';
    }
});

// Event Listener for REGISTER button
registerSubmitButton.addEventListener('click', function(event) {
    event.preventDefault();

    const selectedRole = roleSelect.value;
    if (!selectedRole) {
        alert("Please select a role.");
        return;
    }

    const email = document.getElementById(selectedRole + '-fields').querySelector('input[type="email"]').value;
    const password = registerPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Save user role and details to the database
            const userRef = ref(database, 'users/' + user.uid);
            set(userRef, {
                role: selectedRole,
                email: email,
            });

            alert(`User ${user.email} created successfully as a ${selectedRole}!`);
            loginLink.click();
        })
        .catch((error) => {
            const errorMessage = error.message;
            alert(`Registration Error: ${errorMessage}`);
        });
});

// Event Listener for LOGIN button
loginSubmitButton.addEventListener('click', function(event) {
    event.preventDefault();

    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    const selectedRole = loginRoleSelect.value;

    if (!selectedRole) {
        alert("Please select a role.");
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            alert(`Welcome back, ${user.email}!`);
            
            // Redirect based on the selected role
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
            const errorMessage = error.message;
            alert(`Login Error: ${errorMessage}`);
        });
});

// Check authentication state on page load
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in.
    } else {
        // User is signed out.
    }
});


