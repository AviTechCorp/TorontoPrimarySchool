// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
  authDomain: "school-website-66326.firebaseapp.com",
  databaseURL: "https://school-website-66326-default-rtdb.firebaseio.com",
  projectId: "school-website-66326",
  storageBucket: "school-website-66326.firebasestorage.app",
  messagingSenderId: "660829781706",
  appId: "1:660829781706:web:b83301caa822e9b0d9be33"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Get references to elements for the Register form (already exists)
const registerForm = document.getElementById('register-form');
const registerSubmitButton = document.getElementById('registerSubmit');
const roleSelect = document.getElementById('role-select');
const parentFields = document.getElementById('parent-fields');
const teacherFields = document.getElementById('teacher-fields');
const adminFields = document.getElementById('admin-fields');
const confirmPasswordInput = document.getElementById('confirmPassword');
const registerPasswordInput = document.getElementById('registerPassword');

// Get references to elements for the Login form (already exists)
const loginForm = document.getElementById('login-form');
const loginSubmitButton = document.getElementById('loginSubmit');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const loginRoleSelect = document.getElementById('login-role-select');

// Form switching logic (already exists)
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

// Role-based form switching (Registration) (already exists)
roleSelect.addEventListener('change', function() {
    const selectedRole = roleSelect.value;
    
    // Hide all role-specific fields
    parentFields.style.display = 'none';
    teacherFields.style.display = 'none';
    adminFields.style.display = 'none';
    
    // Show only the selected role's fields
    if (selectedRole === 'parent') {
        parentFields.style.display = 'block';
    } else if (selectedRole === 'teacher') {
        teacherFields.style.display = 'block';
    } else if (selectedRole === 'admin') {
        adminFields.style.display = 'block';
    }
});

function collectFormData(role) {
    let userData = {};
    if (role === 'parent') {
        userData = {
            // No need for 'role: role' here as it's implied by the database path,
            // but keeping it is fine if you want it duplicated in the data.
            role: role, // Keeping it for consistency and potential later queries
            surname: parentFields.querySelector('[name="parent-surname"]').value,
            name: parentFields.querySelector('[name="parent-name"]').value,
            email: parentFields.querySelector('[name="parent-email"]').value,
            contactNumber: parentFields.querySelector('[name="parent-contact"]').value,
            relationshipToLearner: parentFields.querySelector('[name="relationship"]').value,
            admissionNumber: parentFields.querySelector('[name="admission-number"]').value,
            learner: { // Nested object for learner details
                surname: parentFields.querySelector('[name="learner-surname"]').value,
                firstName: parentFields.querySelector('[name="learner-first-name"]').value,
                middleName: parentFields.querySelector('[name="learner-middle-name"]').value,
                dateOfBirth: parentFields.querySelector('[name="learner-dob"]').value,
                gender: parentFields.querySelector('[name="learner-gender"]').value,
                grade: parentFields.querySelector('[name="learner-grade"]').value,
            }
        };
    } else if (role === 'teacher') {
        userData = {
            role: role,
            surname: teacherFields.querySelector('[name="teacher-surname"]').value,
            preferredName: teacherFields.querySelector('[name="teacher-preferred-name"]').value,
            email: teacherFields.querySelector('[name="teacher-email"]').value,
        };
    } else if (role === 'admin') {
        userData = {
            role: role,
            surname: adminFields.querySelector('[name="admin-surname"]').value,
            preferredName: adminFields.querySelector('[name="admin-preferred-name"]').value,
            email: adminFields.querySelector('[name="admin-email"]').value,
            specialId: adminFields.querySelector('[name="admin-special-id"]').value,
        };
    }
    return userData;
}

// Event Listener for REGISTER button
registerSubmitButton.addEventListener('click', async function(event) {
    event.preventDefault();

    const selectedRole = roleSelect.value;
    if (!selectedRole) {
        alert("Please select a role.");
        return;
    }

    const emailInput = document.getElementById(selectedRole + '-fields').querySelector('input[type="email"]');
    const email = emailInput ? emailInput.value : '';

    const password = registerPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!email) {
        alert("Please enter your email.");
        return;
    }
    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        // 1. Authenticate the user (create the Firebase Auth user)
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user; // This contains the user's UID

        // 2. Collect all the specific form data for the selected role
        const userDataToSave = collectFormData(selectedRole);

        // 3. Save user details to the Realtime Database under the specific role path
        //    <--  THIS LINE IS THE KEY CHANGE!  -->
        const userRef = ref(database, `${selectedRole}s/${user.uid}`); // e.g., 'parents/uid', 'teachers/uid', 'admins/uid'
        await set(userRef, userDataToSave);

        alert(`User ${user.email} created successfully as a ${selectedRole}! Your profile data has been saved under ${selectedRole}s.`);
        loginLink.click();
    } catch (error) {
        let errorMessage = "An unknown error occurred during registration.";
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'This email address is already in use by another account.';
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

// Event Listener for LOGIN button (remains unchanged as it deals with Auth only)
loginSubmitButton.addEventListener('click', function(event) {
    event.preventDefault();

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

// Check authentication state on page load (remains unchanged)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in.
    } else {
        // User is signed out.
    }
});
