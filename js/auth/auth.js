// auth.js

// =========================================================
// === FIREBASE IMPORTS, CONFIGURATION, AND INITIALIZATION ===
// =========================================================

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
// *** MODIFICATION: Import sendPasswordResetEmail ***
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


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

  // *** NEW: Get reference for learner self-registration button ***
  const findMyDetailsBtn = document.getElementById('find-my-details-btn');


  // Get references to elements for the Register form
  const registerRoleSelect = document.getElementById('role-select');
  const learnerFields = document.getElementById('learner-fields'); 
  const parentFields = document.getElementById('parent-fields');
  const teacherFields = document.getElementById('teacher-fields');
  const admissionsTeamFields = document.getElementById('admissions-team-fields'); 
  const smtFields = document.getElementById('smt-fields');
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

  // *** NEW: Add event listener for the learner "Find Me" button ***
  if (findMyDetailsBtn) {
    findMyDetailsBtn.addEventListener('click', findLearnerForSelf);
  }

  // SMT role -> show DH-specific fields
  const smtRoleSelect = document.querySelector('select[name="smt-specific-role"]');
  if (smtRoleSelect) {
      const dhFields = document.getElementById('dh-specific-fields');
      smtRoleSelect.addEventListener('change', () => {
          dhFields.style.display = (smtRoleSelect.value === 'dh') ? 'block' : 'none';
      });
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
    const form = document.getElementById('register-form'); // Get the form element
    try {
      if (role === 'learner') { 
        // **MODIFIED**: Collect data from the new learner registration fields
        userData.email = document.getElementById('learner-reg-email')?.value || '';
        userData.learnerName = document.getElementById('learner-reg-name')?.value || '';
        userData.learnerSurname = document.getElementById('learner-reg-surname')?.value || '';
      } else if (role === 'parent') {
        userData.email = document.querySelector('input[name="parent-email"]')?.value || '';
        // **FIX**: Read the admission number from the correct input field by its ID.
        userData.admissionNumber = document.getElementById('parent-admission-number-lookup')?.value || '';
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
      } else if (role === 'smt') {
        userData.email = document.querySelector('input[name="smt-email"]')?.value || '';
        userData.surname = document.querySelector('input[name="smt-surname"]')?.value || '';
        userData.preferredName = document.querySelector('input[name="smt-preferred-name"]')?.value || '';
        userData.smtRole = document.querySelector('select[name="smt-specific-role"]')?.value || '';
        // **NEW**: Collect DH-specific data if the role is 'dh'
        if (userData.smtRole === 'dh') {
            userData.dhDepartments = getCheckedValues('dh-department');
            userData.dhGrades = getCheckedValues('dh-grade');
        }
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

  // --- NEW: Parent Registration Step 1: Find Learner ---
  const findLearnerBtn = document.getElementById('find-learner-btn');
  if (findLearnerBtn) {
      findLearnerBtn.addEventListener('click', async () => {
          const admissionInput = document.getElementById('parent-admission-number-lookup');
          const admissionNumber = admissionInput.value.trim();
          const detailsContainer = document.getElementById('parent-details-container');

          if (admissionNumber.length < 3) {
              alert('Please enter a valid admission number.');
              return;
          }

          findLearnerBtn.disabled = true;
          findLearnerBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i>';

          try {
              const q = query(collection(db, 'sams_registrations'), where('admissionId', '==', admissionNumber), limit(1));
              const querySnapshot = await getDocs(q);

              if (querySnapshot.empty) {
                  alert('No learner found with that admission number. Please check the number and try again.');
                  detailsContainer.style.display = 'none';
                  return;
              }

              const learnerData = querySnapshot.docs[0].data();

              // Populate the display fields
              document.getElementById('parent-name-display').value = learnerData.parent1Name || '';
              document.getElementById('parent-surname-display').value = learnerData.parent1Surname || '';
              document.getElementById('parent-contact-display').value = learnerData.parent1Contact || '';
              document.getElementById('learner-name-display').value = `${learnerData.learnerName || ''} ${learnerData.learnerSurname || ''}`;
              
              // Show the details and the rest of the form
              detailsContainer.style.display = 'block';
              admissionInput.readOnly = true; // Lock the admission number field

          } catch (error) {
              console.error("Error finding learner:", error);
              alert("An error occurred while searching for the learner. Please try again.");
          } finally {
              findLearnerBtn.disabled = false;
              findLearnerBtn.textContent = 'Find Learner';
          }
      });
  }

  // *** NEW: Function to find a learner for self-registration ***
  async function findLearnerForSelf() {
    const admissionInput = document.getElementById('learner-admission-number-lookup');
    const admissionNumber = admissionInput.value.trim();
    const detailsContainer = document.getElementById('learner-details-container');
    const passwordSection = document.getElementById('password-section');

    if (!admissionNumber) {
        alert('Please enter your admission number.');
        return;
    }

    findMyDetailsBtn.disabled = true;
    findMyDetailsBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i>';

    try {
        const q = query(collection(db, 'sams_registrations'), where('admissionId', '==', admissionNumber), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert('No learner found with that admission number. Please check the number and try again, or contact the school office.');
            detailsContainer.style.display = 'none';
            passwordSection.style.display = 'none';
            return;
        }

        const learnerDoc = querySnapshot.docs[0];
        const learnerData = learnerDoc.data();

        // Store the found data for later use during registration
        detailsContainer.dataset.learnerData = JSON.stringify({ id: learnerDoc.id, ...learnerData });

        // Populate the editable fields
        document.getElementById('learner-reg-name').value = learnerData.learnerName || '';
        document.getElementById('learner-reg-surname').value = learnerData.learnerSurname || '';
        document.getElementById('learner-reg-grade').value = learnerData.fullGradeSection || learnerData.grade || '';
        document.getElementById('learner-reg-email').value = ''; // Clear email field for user input

        detailsContainer.style.display = 'block';
        passwordSection.style.display = 'block';

    } catch (error) {
        console.error("Error finding learner:", error);
        alert('An error occurred while searching for your details. Please try again.');
    } finally {
        findMyDetailsBtn.disabled = false;
        findMyDetailsBtn.textContent = 'Find Me';
    }
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

      // **NEW**: Special validation for parent registration
      if (role === 'learner') {
          const learnerDetailsContainer = document.getElementById('learner-details-container');
          if (!learnerDetailsContainer.dataset.learnerData) {
              alert("Please find and confirm your details using your admission number before registering.");
              return;
          }
          const originalLearnerData = JSON.parse(learnerDetailsContainer.dataset.learnerData);
          // Add details from the found SAMS record to the user profile
          userData.admissionId = originalLearnerData.admissionId;
          userData.grade = originalLearnerData.grade;
          userData.samsRegistrationId = originalLearnerData.id; // Link to the original SAMS doc

          // The user can edit their name, so we also need to update the original SAMS record
          const updatedName = document.getElementById('learner-reg-name').value;
          const updatedSurname = document.getElementById('learner-reg-surname').value;
          if (updatedName !== originalLearnerData.learnerName || updatedSurname !== originalLearnerData.learnerSurname) {
              userData.nameWasUpdated = true; // Flag to perform an update later
          }
      }

      if (role === 'parent') {
          const admissionNumber = document.getElementById('parent-admission-number-lookup').value.trim();
          if (!admissionNumber) {
              alert('Please use the "Find Learner" button to verify your learner\'s admission number first.');
              return;
          }
          // Check if a learner with this admission number exists
          const learnerQuery = query(collection(db, 'sams_registrations'), where('admissionId', '==', userData.admissionNumber), limit(1));
          const learnerSnapshot = await getDocs(learnerQuery);

          if (learnerSnapshot.empty) {
              alert('Error: No learner found with that admission number. Please check the number and try again.');
              return;
          }

          const learnerData = learnerSnapshot.docs[0].data();
          // Security check: ensure the registering email matches the parent email on file
          if (learnerData.parent1Email.toLowerCase() !== email.toLowerCase()) {
              alert('Error: The email address you entered does not match the parent email on file for this learner. Please use the email address you provided to the school.');
              return;
          }
          // Add details from SAMS record to the user profile to be created
          userData.admissionNumber = admissionNumber;
          userData.name = learnerData.parent1Name; // This line already exists
          userData.surname = learnerData.parent1Surname || ''; // This line already exists
          userData.contactNumber = learnerData.parent1Contact || ''; // This is the line to add/correct
      }

      // Capture the admission number before creating the user, as it's part of the form, not the user data object yet.
      const admissionNumberForUpdate = (role === 'parent') ? document.getElementById('parent-admission-number-lookup').value.trim() : null;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // Add the new UID to the user data object before saving it
        userData.uid = user.uid; 
        await setDoc(doc(db, "users", user.uid), userData);

        // **CRITICAL FIX**: If a parent just registered, use the captured admission number
        // to find the corresponding learner and update their record with the new parent's UID.
        if (role === 'parent' && admissionNumberForUpdate) {
            const learnerQuery = query(collection(db, 'sams_registrations'), where('admissionId', '==', admissionNumberForUpdate), limit(1));
            const learnerSnapshot = await getDocs(learnerQuery);

            if (!learnerSnapshot.empty) {
                const learnerDocRef = learnerSnapshot.docs[0].ref;
                await setDoc(learnerDocRef, { parentUserId: user.uid }, { merge: true });
                console.log(`Successfully linked parent UID ${user.uid} to learner with admission ID ${admissionNumberForUpdate}.`);
            }
        }

        // **NEW**: If a learner updated their name, update the SAMS record
        if (role === 'learner' && userData.nameWasUpdated) {
            const learnerQuery = query(collection(db, 'sams_registrations'), where('admissionId', '==', userData.admissionId), limit(1));
            const learnerSnapshot = await getDocs(learnerQuery);

            if (!learnerSnapshot.empty) {
                const learnerDocRef = learnerSnapshot.docs[0].ref;
                await setDoc(learnerDocRef, { parentUserId: user.uid }, { merge: true });
                console.log(`Successfully linked parent UID ${user.uid} to learner with admission ID ${admissionNumberForUpdate}.`);
            }
        }

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
              case 'smt': portalPath = "smt-portal.html"; break;
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

onAuthStateChanged(auth, (user) => {
    const currentPath = window.location.pathname;
    const protectedPages = [
        'learners-portal.html', 
        'parents-portal.html',
        'teachers-portal.html',
        'admins-portal.html',
        'admission-team-portal.html',
        'smt-portal.html'
    ];
    const isProtectedPage = protectedPages.some(page => currentPath.endsWith(page));

    // Only run protection logic on protected pages.
    if (isProtectedPage) {
        const sessionUser = JSON.parse(sessionStorage.getItem('currentUser'));

        // If there's no user in the session for this tab, they should not be here.
        if (!sessionUser) {
            alert("Your session has expired. Please log in again.");
            window.location.href = "../../html/auth/auth.html";
            return;
        }

        // If a logout happens in another tab, `user` will be null.
        // We check if the logged-out user matches this tab's session user before redirecting.
        if (!user && sessionUser) {
            // This case is ambiguous and could be a logout from another tab.
            // For stability, we let the user stay but can add a check if needed.
            // A full logout is handled by the logout button which clears sessionStorage.
        }
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