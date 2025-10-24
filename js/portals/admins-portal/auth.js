// auth.js

// =========================================================
// === FIREBASE IMPORTS, CONFIGURATION, AND INITIALIZATION ===
// =========================================================

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

// =========================================================
// === DOM-DEPENDENT LOGIC - initialize on DOMContentLoaded ===
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  // Get references to elements for form switching
  const loginLink = document.getElementById('show-login');
  const registerLink = document.getElementById('show-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Get references to elements for the Register form
  const registerRoleSelect = document.getElementById('role-select');
  const learnerFields = document.getElementById('learner-fields'); 
  const parentFields = document.getElementById('parent-fields');
  const teacherFields = document.getElementById('teacher-fields');
  const admissionsTeamFields = document.getElementById('admissions-team-fields'); 
  const adminFields = document.getElementById('admin-fields');
  const registerPasswordInput = document.getElementById('registerPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const registerSubmitButton = document.getElementById('registerSubmit');

  // Get references to elements for the Login form
  const loginRoleSelect = document.getElementById('login-role-select');
  const loginEmailInput = document.getElementById('loginEmail');
  const loginPasswordInput = document.getElementById('loginPassword');
  const loginSubmitButton = document.getElementById('loginSubmit');

  // Role-select -> show role-specific fields (registration form)
  if (registerRoleSelect) {
    const roleFields = Array.from(document.querySelectorAll('.role-fields'));
    function showRoleFields(value) {
      roleFields.forEach(el => {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      });
      if (!value) return;
      const id = `${value}-fields`;
      const target = document.getElementById(id);
      if (target) {
        target.style.display = 'grid';
        target.setAttribute('aria-hidden', 'false');
      }
    }
    registerRoleSelect.addEventListener('change', () => showRoleFields(registerRoleSelect.value));
    // initialize if already selected
    showRoleFields(registerRoleSelect.value);
  }

  // Helper: collect user data (kept local to DOMContentLoaded)
  function collectUserData(role) {
    let userData = { role };
    try {
      if (role === 'learner') { 
        userData.fullName = document.querySelector('input[name="learner-fullName"]')?.value || '';
        userData.admissionNumber = document.querySelector('input[name="learner-admissionNumber"]')?.value || '';
        userData.email = document.querySelector('input[name="learner-email"]')?.value || ''; 
        userData.dob = document.querySelector('input[name="learner-dob"]')?.value || '';
        userData.grade = document.querySelector('select[name="learner-grade"]')?.value || '';
        userData.gender = document.querySelector('select[name="learner-gender"]')?.value || '';
      } else if (role === 'parent') {
        userData.email = document.querySelector('input[name="parent-email"]')?.value || '';
        userData.surname = document.querySelector('input[name="parent-surname"]')?.value || '';
        userData.name = document.querySelector('input[name="parent-name"]')?.value || '';
        userData.contact = document.querySelector('input[name="parent-contact"]')?.value || '';
        userData.relationship = document.querySelector('input[name="relationship"]')?.value || '';
        userData.admissionNumber = document.querySelector('input[name="admission-number"]')?.value || '';
        userData.learnerSurname = document.querySelector('input[name="learner-surname"]')?.value || '';
        userData.learnerFirstName = document.querySelector('input[name="learner-first-name"]')?.value || '';
        userData.learnerMiddleName = document.querySelector('input[name="learner-middle-name"]')?.value || '';
        userData.learnerDOB = document.querySelector('input[name="learner-dob"]')?.value || '';
        userData.learnerGender = document.querySelector('select[name="learner-gender"]')?.value || '';
        userData.learnerGrade = document.querySelector('select[name="learner-grade"]')?.value || '';
      } else if (role === 'teacher') {
        userData.email = document.querySelector('input[name="teacher-email"]')?.value || '';
        userData.surname = document.querySelector('input[name="teacher-surname"]')?.value || '';
        userData.preferredName = document.querySelector('input[name="teacher-preferred-name"]')?.value || '';
      } else if (role === 'admissions-team') { 
        userData.email = document.querySelector('input[name="admissions-email"]')?.value || '';
        userData.surname = document.querySelector('input[name="admissions-surname"]')?.value || '';
        userData.preferredName = document.querySelector('input[name="admissions-preferred-name"]')?.value || '';
        userData.specialId = document.querySelector('input[name="admissions-special-id"]')?.value || '';
      } else if (role === 'admin') {
        userData.email = document.querySelector('input[name="admin-email"]')?.value || '';
        userData.surname = document.querySelector('input[name="admin-surname"]')?.value || '';
        userData.preferredName = document.querySelector('input[name="admin-preferred-name"]')?.value || '';
        userData.specialId = document.querySelector('input[name="admin-special-id"]')?.value || '';
      }
    } catch (err) {
      console.warn('collectUserData: missing field', err);
    }
    return userData;
  }

  // Registration handler
  if (registerSubmitButton) {
    registerSubmitButton.addEventListener('click', async function(event) {
      event.preventDefault();
      const role = registerRoleSelect?.value;
      const userData = collectUserData(role);
      const email = userData.email;
      const password = registerPasswordInput?.value || '';
      const confirmPassword = confirmPasswordInput?.value || '';

      if (!email || !password || !confirmPassword || !role) {
        alert('Please fill in all required fields.');
        return;
      }
      if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }

      // validate role-specific required inputs
      const roleForm = document.getElementById(`${role}-fields`);
      const requiredInputs = roleForm ? roleForm.querySelectorAll('[required]') : [];
      for (let input of requiredInputs) {
        if (!input.value) {
          alert('Please fill in all required fields for your role.');
          return;
        }
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), userData);
        alert(`Registration successful! Welcome, ${userData.name || userData.preferredName || userData.surname || userData.admissionNumber || userData.fullName}!`);
        // switch to login view if available
        if (loginLink) loginLink.click();
      } catch (error) {
        console.error("Registration Error:", error);
        alert(`Registration Error: ${error.message}`);
      }
    });
  }

  // Login handler
  if (loginSubmitButton) {
    loginSubmitButton.addEventListener('click', async function(event) {
      event.preventDefault();
      const email = loginEmailInput?.value || '';
      const password = loginPasswordInput?.value || '';
      const role = loginRoleSelect?.value || '';

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
            sessionStorage.setItem('currentUser', JSON.stringify(userData));
            alert(`Welcome back, ${userData.name || userData.preferredName || userData.surname || userData.admissionNumber || userData.fullName || 'User'}!`);
            let portalPath = '';
            switch(role) {
              case 'learner': portalPath = "learners-portal.html"; break;
              case 'parent': portalPath = "parents-portal.html"; break;
              case 'teacher': portalPath = "teachers-portal.html"; break;
              case 'admissions-team': portalPath = "admission-team-portal.html"; break;
              case 'admin': portalPath = "admins-portal.html"; break;
              default: portalPath = "index.html"; break;
            }
            window.location.href = portalPath;
          } else {
            alert("The role you selected does not match the role you registered as. Please try again.");
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

  // =========================================================
  // === Inserted form switching & role toggle snippet ===
  // This restores accessible switching and hash-based initial state
  // =========================================================

  const register = registerForm;
  const login = loginForm;
  const showRegister = registerLink;
  const showLogin = loginLink;

  function setVisible(formToShow) {
    const showRegisterForm = formToShow === 'register';

    if (showRegisterForm) {
      register?.classList.remove('hidden'); register?.classList.add('active-form');
      register?.setAttribute('aria-hidden', 'false');
      login?.classList.add('hidden'); login?.classList.remove('active-form');
      login?.setAttribute('aria-hidden', 'true');
      const focusEl = register?.querySelector('input, select, button');
      if (focusEl) focusEl.focus();
    } else {
      login?.classList.remove('hidden'); login?.classList.add('active-form');
      login?.setAttribute('aria-hidden', 'false');
      register?.classList.add('hidden'); register?.classList.remove('active-form');
      register?.setAttribute('aria-hidden', 'true');
      const focusEl = login?.querySelector('input, select, button');
      if (focusEl) focusEl.focus();
    }
  }

  if (location.hash === '#login') setVisible('login');
  else setVisible('register');

  if (showRegister) {
    showRegister.addEventListener('click', (e) => {
      e.preventDefault();
      setVisible('register');
      history.replaceState(null, '', '#register');
    });
  }
  if (showLogin) {
    showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      setVisible('login');
      history.replaceState(null, '', '#login');
    });
  }

  // Logout button attachment (requires DOM)
  document.querySelectorAll('.btn-logout').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });

}); // end DOMContentLoaded

// =========================================================
// === AUTH STATE LISTENER & PAGE PROTECTION ===
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
        'admission-team-portal.html' 
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
        sessionStorage.removeItem('currentUser');
        alert("You have been logged out successfully.");
        window.location.href = "auth.html"; 
    }).catch((error) => {
        console.error("Logout Error:", error);
        alert("Logout failed. Please try again.");
    });
}

// make the function available to non-module scripts
window.handleLogout = handleLogout;