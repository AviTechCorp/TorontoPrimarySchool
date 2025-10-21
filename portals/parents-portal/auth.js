// auth.js
// Import the functions you need from the Modular SDK v12.4.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


// Your web app's Firebase configuration (Keep your current config)
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
const db = getFirestore(app); // Get the firestore service instance

// =========================================================
// === USER REGISTRATION FUNCTION ===
// =========================================================

const registerForm = document.getElementById('register-form');
const registerEmailInput = document.getElementById('registerEmail');
const registerPasswordInput = document.getElementById('registerPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const registerRoleSelect = document.getElementById('register-role-select');
const registerMessage = document.getElementById('register-message');
const registerSubmitButton = document.getElementById('registerSubmit');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = registerEmailInput.value;
        const password = registerPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const role = registerRoleSelect.value;
        
        if (password !== confirmPassword) {
            registerMessage.textContent = "Error: Passwords do not match.";
            return;
        }

        if (role === "") {
            registerMessage.textContent = "Error: Please select a role.";
            return;
        }

        registerMessage.textContent = "Registering...";
        registerSubmitButton.disabled = true;

        try {
            // 1. Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Add user role/profile to Firestore
            await setDoc(doc(db, "user_roles", user.uid), {
                email: email,
                role: role,
                createdAt: new Date().toISOString()
            });

            registerMessage.textContent = "Registration successful! You can now log in.";
            // Optionally clear the form
            registerForm.reset(); 

        } catch (error) {
            console.error("Registration Error:", error);
            // Firebase error codes provide context (e.g., 'auth/email-already-in-use')
            let errorMessage = "Registration failed.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email is already registered.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Password must be at least 6 characters.";
            } else if (error.message) {
                errorMessage = error.message;
            }
            registerMessage.textContent = `Error: ${errorMessage}`;
        } finally {
            registerSubmitButton.disabled = false;
        }
    });
}


// =========================================================
// === USER LOGIN FUNCTION ===
// =========================================================

const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const loginRoleSelect = document.getElementById('login-role-select');
const loginMessage = document.getElementById('login-message');
const loginSubmitButton = document.getElementById('loginSubmit');


if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        const selectedRole = loginRoleSelect.value;
        
        if (selectedRole === "") {
            loginMessage.textContent = "Error: Please select your role.";
            return;
        }

        loginMessage.textContent = "Logging in...";
        loginSubmitButton.disabled = true;

        try {
            // 1. Sign in with Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // 2. Fetch user role from Firestore
            const roleDoc = await getDoc(doc(db, "user_roles", user.uid));
            
            if (!roleDoc.exists()) {
                // If role is missing, sign out and show error
                await signOut(auth);
                loginMessage.textContent = "Error: User profile not found. Contact administrator.";
                return;
            }

            const userData = roleDoc.data();
            const actualRole = userData.role;

            // 3. Role Check: Ensure selected role matches the stored role
            if (actualRole !== selectedRole) {
                await signOut(auth); // Sign out if role mismatch
                loginMessage.textContent = `Error: Credentials correct, but you logged in as a '${selectedRole}' which does not match your registered role of '${actualRole}'.`;
                return;
            }

            // 4. Successful Login - Store role and redirect
            // Store the user data (including role) in session storage for portal access
            const currentUser = {
                uid: user.uid,
                email: user.email,
                role: actualRole
            };
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            loginMessage.textContent = "Login successful. Redirecting...";

            // Determine redirect page based on role
            let redirectPage = 'auth.html'; 
            switch (actualRole) {
                case 'learner':
                    redirectPage = '../portals/learners-portal.html';
                    break;
                case 'parent':
                    redirectPage = '../portals/parents-portal.html';
                    break;
                case 'teacher':
                    redirectPage = '../portals/teachers-portal.html';
                    break;
                case 'admissions-team':
                    redirectPage = '../portals/admission-team-portal.html';
                    break;
                case 'admin':
                    redirectPage = '../portals/admins-portal.html';
                    break;
                default:
                    // If an unknown role, redirect to the login page and sign out
                    await signOut(auth);
                    loginMessage.textContent = "Error: Unknown user role. Contact administrator.";
                    return;
            }

            // Redirect to the appropriate portal page
            window.location.href = redirectPage;

        } catch (error) {
            console.error("Login Error:", error);
            let errorMessage = "Invalid email or password.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "Invalid email or password.";
            } else if (error.message) {
                 errorMessage = error.message;
            }
            loginMessage.textContent = `Error: ${errorMessage}`;
        } finally {
            loginSubmitButton.disabled = false;
        }
    });
}


// =========================================================
// === UI/FORM SWITCHING (REGISTER/LOGIN) ===
// =========================================================

const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const registerFormDiv = document.getElementById('register-form');
const loginFormDiv = document.getElementById('login-form');
const registerLink = document.getElementById('show-register');
const loginLink = document.getElementById('show-login');

// Initial state and link click handlers
if (registerFormDiv && loginFormDiv && registerLink && loginLink) {
    // Set initial state to Login
    loginFormDiv.style.display = 'block';
    registerFormDiv.style.display = 'none';
    loginLink.classList.add('active');
    registerLink.classList.remove('active');

    // Show Register handler
    showRegisterLink.addEventListener('click', () => {
        loginFormDiv.style.display = 'none';
        registerFormDiv.style.display = 'block';
        registerLink.classList.add('active');
        loginLink.classList.remove('active');
    });

    // Show Login handler
    showLoginLink.addEventListener('click', () => {
        loginFormDiv.style.display = 'block';
        registerFormDiv.style.display = 'none';
        loginLink.classList.add('active');
        registerLink.classList.remove('active');
    });
}


// =========================================================
// === AUTH STATE CHECK & REDIRECT ===
// =========================================================

    // Check for authentication state change to redirect users who are not logged in.
    onAuthStateChanged(auth, (user) => {
        const currentPath = window.location.pathname;
        const isLoggedIn = !!user;

    // List of protected portal pages
    const protectedPages = [
        'learners-portal.html', 
        'parents-portal.html',
        'teachers-portal.html',
        'admins-portal.html',
        'admission-team-portal.html' // NEW PORTAL ADDED
    ];

    // Check if the current page is a protected page and the user is not logged in
    if (protectedPages.some(page => currentPath.endsWith(page)) && !isLoggedIn) {
        alert("You must be logged in to view this page.");
        window.location.href = "auth.html";
    }
});


// =========================================================
// === LOGOUT FUNCTIONALITY ===
// =========================================================

/**
 * Handle user logout.
 * This function signs the user out of Firebase and redirects them to the login page.
 */
function handleLogout() {
    signOut(auth).then(() => {
        // Clear user data from session storage on logout
        sessionStorage.removeItem('currentUser');
        alert("You have been logged out successfully.");
        // Redirect to the auth page from any nested folder
        window.location.href = "../../html/auth/auth.html"; 
    }).catch((error) => {
        // An error happened.
        console.error("Logout Error:", error);
        alert("Logout failed. Please try again.");
    });
}

// Attach the logout function to all buttons with the class 'btn-logout'
document.querySelectorAll('.btn-logout').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });
});