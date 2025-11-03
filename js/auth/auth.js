// auth.js

// =========================================================
// === FIREBASE IMPORTS, CONFIGURATION, AND INITIALIZATION ===
// =========================================================

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
// *** MODIFICATION: Import sendPasswordResetEmail ***
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
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
  // *** NEW: Get references for form links to switch to login/register after reset attempt ***
  const formLinks = document.querySelector('.form-links'); 
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  // *** NEW: Get references for Forgot Password form elements ***
  const forgotPasswordLink = document.getElementById('show-forgot-password');
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  const forgotEmailInput = document.getElementById('forgotEmail');
  const forgotSubmitButton = document.getElementById('forgotSubmit');


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

  // Get references for new teacher fields
  const isClassTeacherSelect = document.getElementById('is-class-teacher');
  const classTeacherDetailsContainer = document.getElementById('class-teacher-details-container');
  const teachingAssignmentsContainer = document.getElementById('teaching-assignments-container');
  const responsiblePhaseSelect = document.getElementById('responsible-phase');
  const responsibleGradeSelect = document.getElementById('responsible-grade');
  const addAssignmentBtn = document.getElementById('add-assignment-btn');

  // Role-select -> show role-specific fields (registration form)
  if (registerRoleSelect) {
    const roleFields = Array.from(document.querySelectorAll('.role-fields'));
    function showRoleFields(value) {
      roleFields.forEach(el => {
        el.style.display = 'none'; // Use style for direct manipulation
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

  // Class-teacher-select -> show responsible class dropdown
  if (isClassTeacherSelect) {
    isClassTeacherSelect.addEventListener('change', () => {
      if (isClassTeacherSelect.value === 'yes') {
        classTeacherDetailsContainer.style.display = 'grid';
        teachingAssignmentsContainer.style.display = 'block';
      } else if (isClassTeacherSelect.value === 'no') {
        classTeacherDetailsContainer.style.display = 'none';
        teachingAssignmentsContainer.style.display = 'block';
      } else {
        classTeacherDetailsContainer.style.display = 'none';
        teachingAssignmentsContainer.style.display = 'none';
      }
    });
  }

  // Phase-select -> populate grade dropdown
  if (responsiblePhaseSelect) {
    responsiblePhaseSelect.addEventListener('change', () => {
      const selectedPhase = responsiblePhaseSelect.value;
      responsibleGradeSelect.innerHTML = ''; // Clear existing options
      responsibleGradeSelect.disabled = true;

      if (!selectedPhase) {
        responsibleGradeSelect.add(new Option('-- Select Phase First --', ''));
        return;
      }

      let grades = [];
      if (selectedPhase === 'foundation') {
        grades = [
          { value: 'R', text: 'Grade R' },
          { value: '1', text: 'Grade 1' },
          { value: '2', text: 'Grade 2' },
          { value: '3', text: 'Grade 3' },
        ];
      } else if (selectedPhase === 'intersen') {
        grades = [
          { value: '4', text: 'Grade 4' },
          { value: '5', text: 'Grade 5' },
          { value: '6', text: 'Grade 6' },
          { value: '7', text: 'Grade 7' },
        ];
      }

      responsibleGradeSelect.add(new Option('-- Select Grade --', ''));
      grades.forEach(grade => responsibleGradeSelect.add(new Option(grade.text, grade.value)));
      responsibleGradeSelect.disabled = false;
    });
  }

  // Dynamic Teaching Assignments
  if (addAssignmentBtn) {
    addAssignmentBtn.addEventListener('click', () => {
      addAssignmentRow();
    });
  }

  function addAssignmentRow() {
    const list = document.getElementById('assignments-list');
    const row = document.createElement('div');
    row.className = 'assignment-row';

    row.innerHTML = `
      <div class="form-group">
        <select class="assignment-grade" name="assignment-grade">
          <option value="">Grade</option>
          <option value="R">R</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
          <option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option>
        </select>
      </div>
      <div class="form-group">
        <input type="text" class="assignment-section" name="assignment-section" placeholder="Section (e.g., A)" maxlength="10" style="text-transform: uppercase;">
      </div>
      <div class="form-group">
        <select class="assignment-subject" name="assignment-subject">
          <option value="">Subject</option>
          <option value="Sepedi HL">Sepedi HL</option>
          <option value="Englis FAL">Englis FAL</option>
          <option value="Mathematics">Mathematics</option>
          <option value="NS-Tech">NS-Tech</option>
          <option value="N.S">N.S</option>
          <option value="Technology">Technology</option>
          <option value="Creative Arts">Creative Arts</option>
          <option value="L.O">L.O</option>
          <option value="Life Skills">Life Skills</option>
          <option value="Coding and Robotics">Coding and Robotics</option>
          <option value="All Subjects (Foundation)">All Subjects (Foundation)</option>
        </select>
      </div>
      <button type="button" class="remove-assignment-btn"><i class="fas fa-times"></i></button>
    `;

    list.appendChild(row);

    // Add event listener to the new remove button
    row.querySelector('.remove-assignment-btn').addEventListener('click', () => {
      row.remove();
    });
  }

  // Add one row by default when the container becomes visible
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'style') {
        const assignmentsContainer = mutation.target;
        if (assignmentsContainer.style.display === 'block' && document.getElementById('assignments-list').children.length === 0) {
          addAssignmentRow();
        }
      }
    }
  });
  if (teachingAssignmentsContainer) observer.observe(teachingAssignmentsContainer, { attributes: true });

  // Helper to get values from a group of checkboxes
  function getCheckedValues(name) {
    const checked = Array.from(document.querySelectorAll(`input[name="${name}"]:checked`));
    return checked.map(checkbox => checkbox.value);
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
        // Collect new teacher data
        const isClassTeacher = document.getElementById('is-class-teacher')?.value === 'yes';
        userData.isClassTeacher = isClassTeacher;
        if (isClassTeacher) {
          const phase = document.getElementById('responsible-phase')?.value || '';
          const grade = document.getElementById('responsible-grade')?.value || '';
          const section = document.getElementById('responsible-section')?.value || '';
          userData.phase = phase;
          userData.responsibleClass = (grade && section) ? `${grade}${section}` : null;
          // For a class teacher, their assigned class is also their responsible class
          // The assignedClasses field will now be derived from the more flexible 'assignedGrades'
        } else {
          userData.phase = null;
          userData.responsibleClass = null;
        }

        // Collect the detailed teaching assignments
        const assignments = [];
        document.querySelectorAll('.assignment-row').forEach(row => {
          const grade = row.querySelector('.assignment-grade').value;
          const section = row.querySelector('.assignment-section').value.toUpperCase();
          const subject = row.querySelector('.assignment-subject').value;
          if (grade && section && subject) {
            assignments.push({ grade, section, subject, fullClass: `${grade}${section}` });
          }
        });
        userData.teachingAssignments = assignments;
        // For backward compatibility and easy filtering, create arrays of unique grades and subjects
        userData.assignedGrades = [...new Set(assignments.map(a => a.grade))];
        userData.assignedClasses = [...new Set(assignments.map(a => a.fullClass))];
        userData.assignedSubjects = [...new Set(assignments.map(a => a.subject))];
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
            // *** FIX: Include the user UID in the session storage data ***
            const sessionData = { ...userData, uid: user.uid };
            sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
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

  // *** NEW: Forgot Password Handler ***
  if (forgotSubmitButton) {
    forgotSubmitButton.addEventListener('click', async function(event) {
      event.preventDefault();
      const email = forgotEmailInput?.value || '';

      if (!email) {
        alert('Please enter your email address.');
        return;
      }

      try {
        await sendPasswordResetEmail(auth, email);
        alert(`Password reset link sent to ${email}. Please check your inbox.`);
        // Switch back to login form after successful send
        setVisible('login');
      } catch (error) {
        console.error("Password Reset Error:", error);
        alert(`Password Reset Error: ${error.message}`);
      }
    });
  }

  // =========================================================
  // === Inserted form switching & role toggle snippet ===
  // This restores accessible switching and hash-based initial state
  // =========================================================

  const register = registerForm;
  const login = loginForm;
  // *** NEW: Add forgot password form to form variables ***
  const forgot = forgotPasswordForm; 
  const showRegister = registerLink;
  const showLogin = loginLink;
  // *** NEW: Add forgotten password link ***
  const showForgot = forgotPasswordLink; 


function setVisible(formToShow) {
    // Collect all forms to hide
    const allForms = [register, login, forgot];
    const formLinksContainer = formLinks; 
    
    // **FIXED LOGIC START**
    // Use the allForms array to hide everything safely
    // By checking if the form exists before accessing its properties, we prevent the error.
    allForms.forEach(form => {
        if (form) {
            form.style.display = 'none';
        }
    });

    if (formLinksContainer) formLinksContainer.style.display = 'flex'; // Show links by default

    let targetForm;
    let hash = '';
    // **FIXED LOGIC END**

    if (formToShow === 'register' && register) {
        targetForm = register;
        register.style.display = 'block';
        hash = '#register';
        if (formLinksContainer) formLinksContainer.style.display = 'flex';
    } else if (formToShow === 'login' && login) {
        targetForm = login;
        login.style.display = 'block';
        hash = '#login';
        if (formLinksContainer) formLinksContainer.style.display = 'flex';
    } else if (formToShow === 'forgot' && forgot) {
        targetForm = forgot;
        forgot.style.display = 'block';
        hash = '#forgot-password';
        if (formLinksContainer) formLinksContainer.style.display = 'none';
    }

    if (targetForm) {
        // The active-form/hidden classes are not strictly necessary with display: block/none,
        // but we'll keep them for consistency with the CSS if needed.
        targetForm.classList.remove('hidden');
        targetForm.classList.add('active-form');
        targetForm.setAttribute('aria-hidden', 'false');
        
        // Focus the first form element for accessibility
        const focusEl = targetForm.querySelector('input, select, button');
        if (focusEl) focusEl.focus();
    }
    
    // Update hash only if a valid form was selected
    if (hash) {
      history.replaceState(null, '', hash);
    }
  }

  // Initialize form state based on URL hash or default to register
  const currentHash = location.hash;
    if (currentHash === '#register') {
      setVisible('register');
    } else if (currentHash === '#forgot-password') {
      setVisible('forgot');
    } else {
      // Default to login if hash is empty or anything else
      setVisible('login');
    }

  if (showRegister) {
    showRegister.addEventListener('click', (e) => {
      e.preventDefault();
      setVisible('register');
    });
  }
  if (showLogin) {
    showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      setVisible('login');
    });
  }
  // *** NEW: Event listener for Forgot Password link ***
  if (showForgot) {
    showForgot.addEventListener('click', (e) => {
      e.preventDefault();
      setVisible('forgot');
      // Copy login email if available
      if (loginEmailInput?.value) {
        forgotEmailInput.value = loginEmailInput.value;
      }
    });
  }

  // --- Show/Hide Password Icon Logic ---
  document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', () => {
      const passwordInput = icon.previousElementSibling;
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        icon.setAttribute('aria-label', 'Hide password');
      } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        icon.setAttribute('aria-label', 'Show password');
      }
    });
  });


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
        window.location.href = "../../html/auth/auth.html";
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
        window.location.href = "../../html/auth/auth.html"; 
    }).catch((error) => {
        console.error("Logout Error:", error);
        alert("Logout failed. Please try again.");
    });
}

// make the function available to non-module scripts
window.handleLogout = handleLogout;