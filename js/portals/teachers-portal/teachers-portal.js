
// js/portals/teachers-portal/teachers-portal.js

// NOTE: This script relies on the global 'db' variable from firebase-config.js

/**
 * Fetches and displays parent contact information for a specific class.
 * @param {string} selectedClass - The class to filter by (e.g., 'RA', '1B').
 */
async function loadParentContactsForClass(selectedClass) {
    const container = document.getElementById('teacher-parents-data-container');
    const statusMessage = document.getElementById('teacher-parents-data-status');

    container.innerHTML = ''; // Clear previous results

    if (!selectedClass) {
        statusMessage.textContent = 'Please select a class to view parent contacts.';
        statusMessage.style.display = 'block';
        return;
    }

    statusMessage.textContent = `Fetching parent contacts for Class ${selectedClass}...`;
    statusMessage.style.display = 'block';

    try {
        const db = firebase.firestore();
        // Query the sams_registrations collection for learners in the selected class
        const snapshot = await db.collection('sams_registrations')
            .where('fullGradeSection', '==', selectedClass)
            .get();

        if (snapshot.empty) {
            statusMessage.textContent = `No learners (and therefore no parents) found for class ${selectedClass}.`;
            return;
        }

        const parentsData = [];
        const uniqueParentEmails = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            // Add parent if they have an email and haven't been added yet
            if (data.parent1Email && !uniqueParentEmails.has(data.parent1Email)) {
                parentsData.push(data);
                uniqueParentEmails.add(data.parent1Email);
            }
        });

        if (parentsData.length === 0) {
            statusMessage.textContent = 'No parent contact information found for this class.';
            return;
        }

        // Sort by learner's surname (which is in the learnerName field)
        parentsData.sort((a, b) => (a.learnerName || '').localeCompare(b.learnerName || ''));

        const table = document.createElement('table');
        table.id = 'teacher-parents-data-table'; // ID for styling
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Parent Name</th>
                    <th>Parent Email</th>
                    <th>Parent Contact</th>
                    <th>Learner Name</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${parentsData.map(data => `
                    <tr>
                        <td>${data.parent1Name || 'N/A'}</td>
                        <td><a href="mailto:${data.parent1Email}">${data.parent1Email || 'N/A'}</a></td>
                        <td>${data.parent1Contact || 'N/A'}</td>
                        <td>${data.learnerName || ''} ${data.learnerSurname || ''}</td>
                        <td>
                            <button class="cta-button-small" onclick='openContactModal(${JSON.stringify(data)})'>Contact</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        container.appendChild(table);
        statusMessage.textContent = `Displaying ${parentsData.length} parent contact(s) for Class ${selectedClass}.`;

    } catch (error) {
        console.error("Error loading parent contacts:", error);
        statusMessage.textContent = 'An error occurred while loading data. Please check the console.';
        statusMessage.classList.add('error');
    }
}

/**
 * Opens the contact modal and populates it with parent/learner data.
 * @param {object} data - The parent/learner data object from Firestore.
 */
function openContactModal(data) {
    const modal = document.getElementById('contact-parent-modal');
    if (!modal) return;

    // --- Store data on the modal forms for easy access ---
    const emailForm = document.getElementById('contact-email-form');
    const smsForm = document.getElementById('contact-sms-form');
    emailForm.dataset.parentData = JSON.stringify(data);
    smsForm.dataset.parentData = JSON.stringify(data);

    // --- Populate Email Form ---
    document.getElementById('email-parent-name').textContent = data.parent1Name || 'N/A';
    document.getElementById('email-parent-email').textContent = data.parent1Email || 'N/A';
    document.getElementById('email-learner-name').textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
    document.getElementById('email-subject').value = `Update regarding ${data.learnerName || 'your child'}`;
    document.getElementById('email-message').value = '';

    // --- Populate SMS Form ---
    document.getElementById('sms-parent-name').textContent = data.parent1Name || 'N/A';
    document.getElementById('sms-parent-contact').textContent = data.parent1Contact || 'N/A';
    document.getElementById('sms-learner-name').textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
    document.getElementById('sms-message').value = '';

    // --- Show the modal ---
    modal.style.display = 'block';

    // --- Reset to email view by default ---
    emailForm.style.display = 'block';
    smsForm.style.display = 'none';
    document.getElementById('contact-via-email-btn').classList.add('active');
    document.getElementById('contact-via-sms-btn').classList.remove('active');
}

/**
 * Sets up event listeners for the contact modal.
 */
function setupContactModalListeners() {
    const modal = document.getElementById('contact-parent-modal');
    if (!modal) return;

    const closeBtn = modal.querySelector('.modal-close-btn');
    const emailBtn = document.getElementById('contact-via-email-btn');
    const smsBtn = document.getElementById('contact-via-sms-btn');
    const emailForm = document.getElementById('contact-email-form');
    const smsForm = document.getElementById('contact-sms-form');

    // Close modal
    const closeModal = () => modal.style.display = 'none';
    closeBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) {
            closeModal();
        }
    };

    // Switch between forms
    emailBtn.onclick = () => {
        emailForm.style.display = 'block';
        smsForm.style.display = 'none';
        emailBtn.classList.add('active');
        smsBtn.classList.remove('active');
    };

    smsBtn.onclick = () => {
        smsForm.style.display = 'block';
        emailForm.style.display = 'none';
        smsBtn.classList.add('active');
        emailBtn.classList.remove('active');
    };

    // Handle form submissions
    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const parentData = JSON.parse(e.target.dataset.parentData);
        const teacherData = JSON.parse(sessionStorage.getItem('currentUser'));

        if (!teacherData || !teacherData.email) {
            alert('Error: Could not identify the sender (teacher). Please log in again.');
            return;
        }

        const submitButton = emailForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Sending...';

        // Revert to using Google Apps Script
        const scriptURL = 'https://script.google.com/macros/s/AKfycbyELV81r6M6MeGdclMhKKFBAvFVucm1WQC10YgqkCZSfbrK-JGM4wmTFGBa8-iUtRy1AA/exec';
        const formData = new FormData(emailForm);

        // Append additional data needed by the script
        formData.append('teacherEmail', teacherData.email);
        formData.append('parentEmail', parentData.parent1Email);
        formData.append('parentName', parentData.parent1Name);
        formData.append('teacherName', teacherData.preferredName || 'Toronto Primary Teacher');
        formData.append('learnerName', `${parentData.learnerName || ''} ${parentData.learnerSurname || ''}`);

        fetch(scriptURL, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(result => {
            if (result.status === 'success') {
                alert(result.message || 'Email sent successfully!');
                closeModal();
            } else {
                throw new Error(result.message || 'The script reported an error.');
            }
        }).catch(error => {
            console.error('Error sending email:', error);
            alert('An error occurred while sending the email. Please try again.');
        }).finally(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send Email';
        });
    });

    smsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = JSON.parse(e.target.dataset.parentData);
        const body = document.getElementById('sms-message').value;
        // Use sms: to open the user's default messaging app (works on mobile)
        // On desktop, this may do nothing or prompt the user.
        const contactNumber = (data.parent1Contact || '').replace(/\s+/g, ''); // Remove spaces
        if (contactNumber) {
            window.location.href = `sms:${contactNumber}?body=${encodeURIComponent(body)}`;
        } else {
            alert('No valid contact number available for this parent.');
        }
        closeModal();
    });
}

/**
 * Sets up the responsive sidebar toggle for mobile view.
 */
function setupResponsiveSidebar() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const contentWrapper = document.querySelector('.portal-content-wrapper');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the click from closing the menu immediately
            sidebar.classList.toggle('is-open');
            if (contentWrapper) {
                contentWrapper.classList.toggle('overlay-active');
            }
        });
    }

    // Add a listener to the main content area to close the sidebar when clicking outside
    if (contentWrapper) {
        contentWrapper.addEventListener('click', () => {
            if (sidebar.classList.contains('is-open')) {
                sidebar.classList.remove('is-open');
                contentWrapper.classList.remove('overlay-active');
            }
        });
    }
}

// --- CORE DATA HANDLING & DISPLAY FUNCTIONS ---
document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    let db; // Declare db at a higher scope
    
    // If no user data, stop execution. The auth.js script will handle the redirect.
    if (userData) {
        // Initialize Firebase only if the user is potentially logged in
        // This check prevents errors if firebase is already initialized by another script.
        if (!firebase.apps.length) {
            // This is a fallback. Your `firebase-config.js` should ideally handle this.
            // If firebaseConfig is not global, you might need to define it here.
            firebase.initializeApp(firebaseConfig);
        } else {
            // If already initialized, get the default app
            firebase.app();
        }
        db = firebase.firestore(); // Initialize the db variable

        loadTeacherProfile(userData);
        // **NEW**: Load dynamic dashboard data
        loadTeacherDashboard(db, userData);
        // **NEW**: Initialize material management features
        setupMaterialUpload(db, userData);
        loadCourseMaterials(db);
        
        // **NEW**: Initialize the new grading system
        setupGradingSystem(db, userData);
        // **NEW**: Initialize the "Add Learner to Class" tool
        setupAddLearnerToClassTool(db, userData);
        // **NEW**: Initialize the Quiz Link Generator
        setupQuizGenerator();
        // **NEW**: Initialize the Chat Engine
        setupChatEngine(db, userData);

        loadTeacherClassesAndLearners(db, userData); // This populates class rosters
    } else {
        console.error("User data not found in session storage. Please log in again.");
        return; // Stop further script execution
    }

    // **NEW**: Initialize the responsive sidebar functionality
    setupResponsiveSidebar();

    // **NEW**: Initialize the portfolio manager
    setupPortfolioManager(db, userData);

    // **NEW**: Initialize the portfolio print functionality
    setupPortfolioPrint(userData);

    // **NEW**: Initialize the portfolio shareable link generator
    setupPortfolioLinkGenerator(userData);

    // **NEW**: Expose assignment deletion function to the global scope for onclick handlers
    window.confirmDeleteAssignment = confirmDeleteAssignment;

    // **NEW**: Initialize the Excel roster upload functionality
    setupExcelRosterUpload(db);

    // Sidebar navigation logic
    // Select all links intended for section navigation, both in the sidebar and main content
    const navLinks = document.querySelectorAll('.sidebar a[href^="#"], .portal-content-wrapper a[href^="#"]');
    const sections = document.querySelectorAll('.portal-section');
    const sidebarLinks = document.querySelectorAll('.sidebar a[href^="#"]');


  // Function to show the target section and hide others
    function showSection(targetId) {
        // Define parent-child relationships for nested navigation
        const sectionMap = { // **FIX**: Removed 'grades-form' from this map.
            'attendance-form': 'students',
            'class-setup': 'students'
        };
        const parentId = sectionMap[targetId] || targetId;

        // Hide all main sections first
        sections.forEach(section => {
            section.classList.remove('active-section');
            section.classList.add('hidden-section');
        });

        // Show the correct main parent section
        const parentSection = document.getElementById(parentId);
        if (parentSection) {
            parentSection.classList.add('active-section');
            parentSection.classList.remove('hidden-section');

            // If the parent is the 'students' section, manage its internal views
            if (parentId === 'students') {
                const subViews = parentSection.querySelectorAll('.learner-mgmt-view');
                subViews.forEach(view => view.style.display = 'none');

                const targetView = document.getElementById(targetId);
                if (targetView && targetView.classList.contains('learner-mgmt-view')) {
                    targetView.style.display = 'block'; // Show the specific tool
                } else {
                    // If #students is clicked directly, show its dashboard
                    const dashboard = parentSection.querySelector('#learner-mgmt-dashboard');
                    if (dashboard) dashboard.style.display = 'block';
                }
            }
        }
    }
  // Handle link clicks
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      const targetId = this.getAttribute('href').substring(1);

      // Define which sections are part of the learner management module
      const learnerMgmtSections = ['students', 'attendance-form', 'class-setup'];

      // Remove active class from all sidebar links
      sidebarLinks.forEach(l => l.classList.remove('active'));
      
      // Determine which main sidebar link to activate
      let sidebarLinkTarget = learnerMgmtSections.includes(targetId) ? 'students' : targetId;
      const correspondingSidebarLink = document.querySelector(`.sidebar a[href="#${sidebarLinkTarget}"]`);

      if (correspondingSidebarLink) {
        correspondingSidebarLink.classList.add('active');
      }
      
      showSection(targetId);
      
      // **FIX**: If "My Classes" is clicked, explicitly reload the data.
      if (targetId === 'classes') {
        // loadTeacherClassesAndLearners is only called when classes is initially loaded
        // prevent potential duplicate data from showing
         const currentUserData = JSON.parse(sessionStorage.getItem('currentUser'));
        if (currentUserData) loadTeacherClassesAndLearners(db, currentUserData);
      }

      // **NEW**: Load portfolio items when the section is viewed
      if (targetId === 'portfolio') {
        // **FIX**: The portfolio section now shows a list of subjects first.
        // The actual items are loaded when a subject is selected.
        // We just need to ensure the main view is displayed.
        showPortfolioListView();
      }

      // Update URL hash
      // history.pushState(null, null, `#${targetId}`);
      history.pushState(null, null, `#${targetId}`);
    });
  });

    // --- PARENT CONTACTS FILTER LISTENER ---
    const parentClassFilter = document.getElementById('teacher-parent-class-filter');
    if (parentClassFilter) {
        parentClassFilter.addEventListener('change', (e) => {
            loadParentContactsForClass(e.target.value);
        });
    }
    // --- CONTACT MODAL LISTENERS ---
    setupContactModalListeners();

    // --- ATTENDANCE FORM LISTENER ---
    const attendanceForm = document.getElementById('attendance-form');
    if (attendanceForm) setupAttendanceFormListener(attendanceForm, db);

    // --- CLASS ROSTER SETUP LISTENERS ---
    const rosterSetupClassSelect = document.getElementById('roster-setup-class-select');
    if (rosterSetupClassSelect) setupRosterManagement(db, rosterSetupClassSelect);

  // Handle page load based on URL hash (default to dashboard)
  const initialHash = window.location.hash.substring(1) || 'dashboard';
  showSection(initialHash);
  // Activate the correct sidebar link on page load
  const learnerMgmtSectionsOnLoad = ['students', 'attendance-form', 'class-setup', 'grades-form'];
  let initialSidebarTarget = learnerMgmtSectionsOnLoad.includes(initialHash) ? 'students' : initialHash;
  const initialLink = document.querySelector(`.sidebar a[href="#${initialSidebarTarget}"]`);
  if (initialLink) {
    initialLink.classList.add('active');
  }
});

// Function to load and display teacher profile data
async function loadTeacherProfile(userData) {
    const teacherNameDisplay = document.getElementById('teacher-name-display');
    const profileSurname = document.querySelector('.profile-surname');
    const profilePreferredName = document.querySelector('.profile-preferred-name');
    const profileEmail = document.querySelector('.profile-email'); 
    const parentClassFilter = document.getElementById('teacher-parent-class-filter');
    const rosterSetupClassSelect = document.getElementById('roster-setup-class-select');

  if (userData) {
    const db = firebase.firestore();
    const doc = await db.collection('users').doc(userData.uid).get();
      if (doc.exists) {
        const teacherData = doc.data();
        const teacherName = teacherData.preferredName || 'Teacher';

        if (teacherNameDisplay) teacherNameDisplay.textContent = teacherName;
        if (profileSurname) profileSurname.innerHTML = `<strong>Surname:</strong> ${teacherData.surname || 'N/A'}`;
        if (profilePreferredName) profilePreferredName.innerHTML = `<strong>Preferred Name:</strong> ${teacherData.preferredName || 'N/A'}`;
        if (profileEmail) profileEmail.innerHTML = `<strong>Email:</strong> ${teacherData.email || 'N/A'}`;
        document.querySelector('.profile-contact').innerHTML = `<strong>Contact:</strong> ${teacherData.contactNumber || 'N/A'}`;

        // Populate the parent contact filter dropdown
        if (parentClassFilter) {
            parentClassFilter.innerHTML = '<option value="">-- Select a Class --</option>'; // Reset
            // **FIX**: Derive assigned classes from the teachingAssignments array
            if (teacherData.teachingAssignments && teacherData.teachingAssignments.length > 0) {
                const assignedClasses = [...new Set(teacherData.teachingAssignments.map(a => a.fullClass))].sort();
                assignedClasses.forEach(className => {
                    parentClassFilter.add(new Option(className, className));
                }); 
            }
        }

        // Populate the roster setup dropdown if the teacher is a class teacher
        if (rosterSetupClassSelect && teacherData.isClassTeacher && teacherData.responsibleClass) {
            // For now, a class teacher manages their single responsible class.
            // This can be expanded later if a teacher is responsible for multiple classes.
            rosterSetupClassSelect.innerHTML = `<option value="">-- Select Your Responsible Class --</option>`;
            rosterSetupClassSelect.add(new Option(teacherData.responsibleClass, teacherData.responsibleClass));
        }

        // **NEW**: Conditionally show attendance features only for class teachers
        if (teacherData.isClassTeacher) {
            document.querySelectorAll('.class-teacher-only').forEach(el => {
                // Use 'block' or 'flex' based on the element's intended display style
                const displayStyle = el.classList.contains('tool-card') ? 'flex' : 'block';
                el.style.display = displayStyle;
            });
        }
      }
  } else {
    console.error("User data not found in session storage. Please log in again.");
  }
}

/**
 * Loads and displays dynamic data for the teacher's dashboard.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
async function loadTeacherDashboard(db, teacherAuthData) {
    const eventsContainer = document.getElementById('dashboard-events');
    const notificationsContainer = document.getElementById('dashboard-notifications');

    if (eventsContainer) {
        // Placeholder for future calendar/event integration
        eventsContainer.innerHTML = `
            <strong>Today:</strong> Staff Meeting at 3 PM.<br>
            <strong>This Week:</strong> Report cards due Friday.
        `;
    }

    if (notificationsContainer) {
        try {
            // Fetch unread messages
            const chatSnapshot = await db.collection('chats')
                .where('teacherId', '==', teacherAuthData.uid)
                .where('unreadByTeacherCount', '>', 0)
                .get();

            const unreadMessages = chatSnapshot.size;

            notificationsContainer.innerHTML = `
                <i class="fas fa-envelope"></i> You have <strong>${unreadMessages}</strong> new message(s) from parents.<br>
                <i class="fas fa-bell"></i> All grades must be submitted by the end of the term.
            `;
        } catch (error) {
            console.error("Error loading dashboard notifications:", error);
            notificationsContainer.textContent = 'Could not load notifications.';
        }
    }
}

/**
 * Fetches the teacher's assigned classes and then loads the learners for each class.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */

/**
 * Fetches the teacher's assigned classes and then loads the learners for each class.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */

/**
 * Fetches the teacher's assigned classes and then loads the learners for each class.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data from session storage.
 */
async function loadTeacherClassesAndLearners(db, teacherAuthData) {
    if (!teacherAuthData || !teacherAuthData.uid) {
        console.error("Teacher authentication data is missing.");
        document.getElementById('class-rosters-container').innerHTML = '<p class="error-message">Could not identify teacher. Please log in again.</p>';
        return;
    }

    try {
        // 1. Fetch the teacher's full profile from the 'users' collection
        const teacherDocRef = db.collection('users').doc(teacherAuthData.uid);
        const teacherDoc = await teacherDocRef.get();

        if (!teacherDoc.exists) {
            document.getElementById('class-rosters-container').innerHTML = '<p class="error-message">Teacher profile not found.</p>';
            return;
        }

        const teacherData = teacherDoc.data();
        // Derive assigned classes from the new teachingAssignments structure
        const teachingAssignments = teacherData.teachingAssignments || [];
        const assignedClasses = [...new Set(teachingAssignments.map(a => a.fullClass).filter(Boolean))].sort();


        // New logic to display teacher's assignments
        const myClassesContainer = document.getElementById('classes');
        
        // Check if the assignments have already been displayed to prevent duplication
        if (!myClassesContainer.querySelector('.teacher-assignments-card')) {
            displayTeacherAssignments(myClassesContainer, teacherData);
        }

        // **FIX**: Clear the entire rosters container to prevent duplicates on re-load.
        const rostersContainer = document.getElementById('class-rosters-container');
        rostersContainer.innerHTML = '';

        if (assignedClasses.length === 0) {
            document.getElementById('class-rosters-container').innerHTML = '<p class="info-message">You are not currently assigned to any classes.</p>';
            return;
        }

        // 4. Populate the class filter dropdown
        populateClassFilter(assignedClasses);

        // 5. Set up the attendance register dropdown
        setupAttendanceRegister(db, teacherData); // Pass the full teacherData

        // 2. For each assigned class, fetch the learners
        for (const className of assignedClasses) {
            const learnersQuery = db.collection('sams_registrations').where('fullGradeSection', '==', className);
            const learnersSnapshot = await learnersQuery.get();
            
            const learners = [];
            learnersSnapshot.forEach(doc => {
                learners.push(doc.data());
            });

            // 3. Render the roster for this class
            renderClassRoster(rostersContainer, className, learners);
        }

    } catch (error) {
        console.error("Error loading teacher classes and learners:", error);
        document.getElementById('class-rosters-container').innerHTML = '<p class="error-message">An error occurred while loading class data. Please try again.</p>';
    }
}

/**
 * Displays the teacher's role, responsible class, and all assigned grades/subjects.
 * @param {HTMLElement} container - The container element for the "My Classes" section.
 * @param {object} teacherData - The teacher's profile data from Firestore.
 */
function displayTeacherAssignments(container, teacherData) {
    if (!container || !teacherData) return;

    let assignmentsHTML = `
        <h2>My Assignments</h2>
        <div class="profile-card teacher-assignments-card" style="flex-direction: column; align-items: flex-start;">
    `;

    if (teacherData.isClassTeacher && teacherData.responsibleClass) {
        assignmentsHTML += `
            <p><strong>Role:</strong> Class Teacher</p>
            <p><strong>Primary Responsible Class:</strong> ${teacherData.responsibleClass || 'Not specified'}</p>
        `;
    } else {
        assignmentsHTML += `<p><strong>Role:</strong> Subject Teacher</p>`;
    }

    // Display the detailed list of teaching assignments
    if (teacherData.teachingAssignments && teacherData.teachingAssignments.length > 0) {
        assignmentsHTML += `
            <h4 style="margin-top: 15px; margin-bottom: 5px;">My Teaching Schedule:</h4>
            <ul style="list-style-type: disc; padding-left: 20px; margin: 0;">
                ${teacherData.teachingAssignments.map(a => `<li>${a.subject} for Class ${a.fullClass}</li>`).join('')}
            </ul>
        `;
    } else {
        assignmentsHTML += `<p><strong>Subjects Taught:</strong> Not specified</p>`;
    }

    assignmentsHTML += `</div><h2 style="margin-top: 30px;">Class Rosters</h2>`;
    container.innerHTML = assignmentsHTML + container.innerHTML; // Prepend the new info
}

/**
 * Populates the class filter dropdown and adds an event listener for filtering.
 * @param {Array<string>} assignedClasses - An array of class names assigned to the teacher.
 */
function populateClassFilter(assignedClasses) {
    const filterSelect = document.getElementById('teacher-class-filter');
    if (!filterSelect) return;

    // Clear existing options and set the default prompt
    filterSelect.innerHTML = '<option value="">Please select a class to show list of names</option>';

    // Add "Show All" as the first real option
    filterSelect.innerHTML += '<option value="all">Show All Classes</option>';

    // Add an option for each specific assigned class
    assignedClasses.forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = `Class: ${className}`;
        filterSelect.appendChild(option);
    });

    // Add event listener to handle filtering
    filterSelect.addEventListener('change', (e) => {
        const selectedClass = e.target.value;
        const rostersContainer = document.getElementById('class-rosters-container');
        const allRosterCards = rostersContainer.querySelectorAll('.tool-card');

        // First, handle the visibility of the main container
        if (selectedClass) {
            rostersContainer.style.display = 'grid'; // Make the container visible
        } else {
            rostersContainer.style.display = 'none'; // Hide it if no selection
        }

        if (selectedClass === "") {
            // If the default prompt is selected, hide all cards
            allRosterCards.forEach(card => card.style.display = 'none');
        } else {
            // Then, handle the visibility of individual cards inside the container
            allRosterCards.forEach(card => {
                if (selectedClass === 'all' || card.dataset.className === selectedClass) {
                    card.style.display = 'flex'; // Use 'flex' as per .tool-card styles
                } else {
                    card.style.display = 'none';
                }
            });
        }
    });
}
// =========================================================
// === ADD LEARNER TO CLASS MANUAL TOOL ===
// =========================================================

/**
 * Sets up the form for uploading course materials.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
function setupMaterialUpload(db, teacherAuthData) {
    const form = document.getElementById('upload-material-form');
    if (!form) return;

    // Dynamically populate subject and grade dropdowns from teacher's assignments
    const subjectSelect = document.getElementById('material-subject');
    const gradeSelect = document.getElementById('material-grade');

    db.collection('users').doc(teacherAuthData.uid).get().then(doc => {
        if (doc.exists) {
            const teacherData = doc.data();
            const subjects = new Set();
            const grades = new Set();
            if (teacherData.teachingAssignments) {
                teacherData.teachingAssignments.forEach(a => {
                    subjects.add(a.subject);
                    grades.add(a.grade);
                });
            }
            // Populate subjects
            subjects.forEach(subject => subjectSelect.add(new Option(subject, subject)));
            // Populate grades
            grades.forEach(grade => gradeSelect.add(new Option(`Grade ${grade}`, grade)));
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const statusMessage = document.getElementById('upload-status-message');

        const subject = document.getElementById('material-subject').value;
        const grade = document.getElementById('material-grade').value;
        const description = document.getElementById('material-description').value;
        const file = document.getElementById('material-file').files[0];

        if (!subject || !grade || !description || !file) {
            alert('Please fill out all fields and select a file.');
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Uploading...';
        statusMessage.textContent = 'Upload in progress... Please wait.';
        statusMessage.className = 'status-message-box info';
        statusMessage.style.display = 'block';

        try {
            const storageRef = firebase.storage().ref();
            const filePath = `course_materials/${grade}/${subject}/${Date.now()}_${file.name}`;
            const fileRef = storageRef.child(filePath);

            // Upload file
            const snapshot = await fileRef.put(file);
            // Get download URL
            const downloadURL = await snapshot.ref.getDownloadURL();

            // Save metadata to Firestore
            await db.collection('course_materials').add({
                fileName: file.name,
                description: description,
                subject: subject,
                grade: grade,
                url: downloadURL,
                storagePath: filePath,
                uploadedBy: teacherAuthData.uid,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            statusMessage.textContent = 'File uploaded successfully!';
            statusMessage.className = 'status-message-box success';
            form.reset();

        } catch (error) {
            console.error("Error uploading file:", error);
            statusMessage.textContent = 'An error occurred during upload. Please try again.';
            statusMessage.className = 'status-message-box error';
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload File';
        }
    });
}

/**
 * Loads and displays the list of available course materials.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */
function loadCourseMaterials(db) {
    const listElement = document.getElementById('materials-list');
    if (!listElement) return;

    db.collection('course_materials').orderBy('uploadedAt', 'desc').limit(20)
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                listElement.innerHTML = '<p class="info-message">No course materials have been uploaded yet.</p>';
                return;
            }

            let listHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const iconClass = data.fileName.includes('.pdf') ? 'fa-file-pdf' : 'fa-file-alt';
                listHTML += `<li><i class="far ${iconClass}"></i><a href="${data.url}" target="_blank" rel="noopener noreferrer">${data.description} (${data.subject} - Grade ${data.grade})</a></li>`;
            });
            listElement.innerHTML = listHTML;
        }, error => {
            console.error("Error loading course materials:", error);
            listElement.innerHTML = '<p class="info-message error">Could not load materials.</p>';
        });
}

// =========================================================
// === DYNAMIC GRADING SYSTEM ===
// =========================================================

/**
 * Initializes the entire grading system UI and logic.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
function setupGradingSystem(db, teacherAuthData) {
    const classSubjectSelect = document.getElementById('grading-class-subject-select');
    const createAssignmentBtn = document.getElementById('create-new-assignment-btn');
    const gradebookContainer = document.getElementById('gradebook-container');

    if (!classSubjectSelect) return;

    // 1. Populate the class/subject dropdown
    db.collection('users').doc(teacherAuthData.uid).get().then(doc => {
        if (doc.exists) {
            const teacherData = doc.data();
            if (teacherData.teachingAssignments) {
                teacherData.teachingAssignments.forEach(assignment => {
                    // Use a composite value to store both class and subject
                    const optionValue = `${assignment.fullClass}|${assignment.subject}`;
                    classSubjectSelect.add(new Option(`${assignment.subject} - Class ${assignment.fullClass}`, optionValue));
                });
            }
        }
    });

    // 2. Listen for class/subject selection to load the gradebook
    classSubjectSelect.addEventListener('change', () => {
        const selectedValue = classSubjectSelect.value;
        if (selectedValue) {
            const [fullClass, subject] = selectedValue.split('|');
            gradebookContainer.style.display = 'block';
            createAssignmentBtn.disabled = false;
            loadGradebook(db, fullClass, subject);
        } else {
            gradebookContainer.style.display = 'none';
            createAssignmentBtn.disabled = true;
        }
    });

    // 3. Setup the "Create New Assignment" modal
    setupAssignmentModal(db, classSubjectSelect);
}

/**
 * Sets up the modal for creating a new assignment.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {HTMLSelectElement} classSubjectSelect - The dropdown for class/subject selection.
 */
function setupAssignmentModal(db, classSubjectSelect) {
    const modal = document.getElementById('create-assignment-modal');
    const btn = document.getElementById('create-new-assignment-btn');
    const closeBtn = modal.querySelector('.modal-close-btn');
    const form = document.getElementById('create-assignment-form');

    btn.onclick = () => modal.style.display = 'block';
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = 'none';
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const [fullClass, subject] = classSubjectSelect.value.split('|');
        const assignmentName = document.getElementById('assignment-name').value;
        const totalMarks = document.getElementById('assignment-total-marks').value;

        if (!fullClass || !subject || !assignmentName || !totalMarks) {
            alert('Please ensure a class is selected and all fields are filled.');
            return;
        }

        try {
            // Add to a new 'assignments' collection
            await db.collection('assignments').add({
                fullClass,
                subject,
                name: assignmentName,
                totalMarks: parseInt(totalMarks, 10),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('Assignment created successfully!');
            modal.style.display = 'none';
            form.reset();
            // Reload the gradebook to show the new assignment column
            loadGradebook(db, fullClass, subject);

        } catch (error) {
            console.error('Error creating assignment:', error);
            alert('Failed to create assignment. Please try again.');
        }
    });
}


/**
 * Loads learners and assignments to build the gradebook table.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} fullClass - The full class name (e.g., "7A").
 * @param {string} subject - The subject name.
 */
async function loadGradebook(db, fullClass, subject) {
    // **NEW**: Get the generate marksheet button
    const generateBtn = document.getElementById('generate-marksheet-btn');
    generateBtn.style.display = 'none'; // Hide it until data is loaded

    const container = document.getElementById('gradebook-table-container');
    const status = document.getElementById('gradebook-status');
    document.getElementById('gradebook-header').textContent = `Gradebook for ${subject} - Class ${fullClass}`;
    status.textContent = 'Loading gradebook...';
    container.innerHTML = '';

    try {
        // 1. Fetch all learners for the class
        const learnersSnapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', fullClass).get();
        const learners = learnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.learnerName || '').localeCompare(b.learnerName || ''));

        // 2. Fetch all assignments for the class/subject
        const assignmentsSnapshot = await db.collection('assignments').where('fullClass', '==', fullClass).where('subject', '==', subject).orderBy('createdAt').get();
        const assignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());

        // 3. Fetch all existing grades for these learners
        const learnerIds = learners.map(l => l.id);
        const gradesMap = new Map();
        if (learnerIds.length > 0) {
            // **FIX**: Break the query into chunks of 10 to handle Firestore's 'in' query limit.
            const promises = [];
            for (let i = 0; i < learnerIds.length; i += 10) {
                const chunk = learnerIds.slice(i, i + 10);
                promises.push(
                    db.collection('grades')
                      .where('learnerId', 'in', chunk)
                      .get()
                );
            }

            // Wait for all chunked queries to complete
            const snapshots = await Promise.all(promises);

            // Combine the results into a single map
            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    const gradeData = doc.data();
                    gradesMap.set(`${gradeData.learnerId}-${gradeData.assignmentId}`, parseInt(gradeData.score, 10));
                });
            });
        }

        if (learners.length === 0) {
            status.textContent = 'No learners found in this class to build a gradebook.';
            return;
        }

        // 4. Build the table
        let tableHTML = '<table class="data-table"><thead><tr><th>Learner Name</th>';
        assignments.forEach(a => {
            // **NEW**: Add a delete button to each assignment header
            tableHTML += `
                <th class="assignment-header">
                    <span>${a.name} (${a.totalMarks})</span>
                    <button class="delete-assignment-btn" onclick="confirmDeleteAssignment('${a.id}', '${a.name.replace(/'/g, "\\'")}')" title="Delete this assignment"><i class="fas fa-trash-alt"></i></button>
                </th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        learners.forEach(learner => {
            tableHTML += `<tr><td>${learner.learnerName} ${learner.learnerSurname}</td>`;
            assignments.forEach(assignment => {
                const grade = gradesMap.get(`${learner.id}-${assignment.id}`) || '';
                tableHTML += `<td><input type="number" class="grade-input" value="${grade}" data-learner-id="${learner.id}" data-assignment-id="${assignment.id}" max="${assignment.totalMarks}" placeholder="--"></td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
        status.textContent = `Displaying gradebook for ${learners.length} learners.`;

        // **NEW**: Show and set up the "Generate Mark Sheet" button
        if (learners.length > 0 && assignments.length > 0) {
            generateBtn.style.display = 'inline-block';
            generateBtn.onclick = () => generateMarkSheet(fullClass, subject, learners, assignments, gradesMap);
        }


        // 5. Add event listeners to save grades on input change
        document.querySelectorAll('.grade-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const learnerId = e.target.dataset.learnerId;
                const assignmentId = e.target.dataset.assignmentId;
                const score = e.target.value;
                const totalMarks = parseInt(e.target.max, 10);

                // **NEW**: Validate input against total marks
                if (parseInt(score, 10) > totalMarks) {
                    alert(`Error: The score cannot be greater than the total marks for this assignment (${totalMarks}).`);
                    e.target.value = ''; // Clear the invalid input
                    return;
                }

                // Use a composite ID for the grade document to prevent duplicates
                const gradeDocId = `${learnerId}_${assignmentId}`;
                const gradeRef = db.collection('grades').doc(gradeDocId);

                try {
                    await gradeRef.set({
                        learnerId,
                        assignmentId,
                        score: score ? parseInt(score, 10) : firebase.firestore.FieldValue.delete(), // Delete if empty
                        fullClass,
                        subject,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // **FIX**: Update the local gradesMap so the mark sheet is always current
                    gradesMap.set(gradeDocId.replace('_', '-'), score ? parseInt(score, 10) : undefined);
                    e.target.style.backgroundColor = '#d1fae5'; // Green flash for success
                    setTimeout(() => e.target.style.backgroundColor = '', 1000);
                } catch (error) {
                    console.error('Error saving grade:', error);
                    e.target.style.backgroundColor = '#fecaca'; // Red flash for error
                }
            });
        });

    } catch (error) {
        console.error('Error loading gradebook:', error);
        status.textContent = 'An error occurred while loading the gradebook.';
    }
}

/**
 * **NEW**: Confirms and then initiates the deletion of an assignment and all its associated grades.
 * This function is exposed to the window object to be accessible from an onclick attribute.
 * @param {string} assignmentId - The ID of the assignment to delete.
 * @param {string} assignmentName - The name of the assignment for the confirmation dialog.
 */
async function confirmDeleteAssignment(assignmentId, assignmentName) {
    if (!confirm(`Are you sure you want to permanently delete the assignment "${assignmentName}"?\n\nThis will also delete ALL scores entered for this assignment. This action cannot be undone.`)) {
        return;
    }

    const db = firebase.firestore();
    const status = document.getElementById('gradebook-status');
    status.textContent = `Deleting assignment "${assignmentName}"...`;

    try {
        // Step 1: Delete the assignment document itself.
        await db.collection('assignments').doc(assignmentId).delete();

        // Step 2: Find and delete all grades associated with this assignment.
        // We must fetch the documents first, then delete them in a batch.
        const gradesSnapshot = await db.collection('grades').where('assignmentId', '==', assignmentId).get();

        if (!gradesSnapshot.empty) {
            const batch = db.batch();
            gradesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        alert(`Assignment "${assignmentName}" and all its scores have been deleted successfully.`);

        // Step 3: Reload the gradebook to reflect the changes.
        const classSubjectSelect = document.getElementById('grading-class-subject-select');
        const [fullClass, subject] = classSubjectSelect.value.split('|');
        if (fullClass && subject) {
            loadGradebook(db, fullClass, subject);
        }
    } catch (error) {
        console.error("Error deleting assignment:", error);
        alert(`Failed to delete assignment: ${error.message}`);
        status.textContent = 'An error occurred while deleting the assignment.';
    }
}

/**
 * **NEW**: Exports the mark sheet data to an Excel file.
 * @param {string} fullClass - The full class name.
 * @param {string} subject - The subject name.
 * @param {Array} learners - Array of learner objects.
 * @param {Array} assignments - Array of assignment objects.
 * @param {Map} gradesMap - Map of grades.
 */
function exportMarkSheetToExcel(fullClass, subject, learners, assignments, gradesMap) {
    const dataForExport = [];
    const headers = ['Admission No.', 'Learner Name'];
    let totalPossibleMarks = 0;

    assignments.forEach(a => {
        headers.push(`${a.name} (${a.totalMarks})`);
        totalPossibleMarks += a.totalMarks;
    });
    headers.push(`Total (${totalPossibleMarks})`, '%', 'Level');
    dataForExport.push(headers);

    learners.forEach(learner => {
        const row = [learner.admissionId || 'N/A', `${learner.learnerName} ${learner.learnerSurname}`];
        let learnerTotalScore = 0;
        assignments.forEach(assignment => {
            const score = gradesMap.get(`${learner.id}-${assignment.id}`);
            row.push(score !== undefined ? score : '');
            if (score !== undefined) learnerTotalScore += score;
        });
        const percentage = totalPossibleMarks > 0 ? ((learnerTotalScore / totalPossibleMarks) * 100) : 0;
        row.push(learnerTotalScore, percentage.toFixed(1) + '%', getAchievementLevel(percentage).level);
        dataForExport.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mark Sheet');
    XLSX.writeFile(workbook, `MarkSheet_${subject}_${fullClass}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Generates a printable mark sheet and displays it in a modal.
 * @param {string} fullClass - The full class name (e.g., "7A").
 * @param {string} subject - The subject name.
 * @param {Array} learners - Array of learner objects.
 * @param {Array} assignments - Array of assignment objects.
 * @param {Map} gradesMap - Map of grades with key `${learnerId}-${assignmentId}`.
 */
function generateMarkSheet(fullClass, subject, learners, assignments, gradesMap) {
    const modal = document.getElementById('marksheet-modal');
    const content = document.getElementById('marksheet-modal-content');
    const teacherData = JSON.parse(sessionStorage.getItem('currentUser'));

    let totalPossibleMarks = 0;
    assignments.forEach(a => { totalPossibleMarks += a.totalMarks; });

    // **FIX**: Ensure learners are always sorted alphabetically by surname (which is in the 'learnerName' field).
    learners.sort((a, b) => (a.learnerName || '').localeCompare(b.learnerName || ''));

    let tableRows = '';
    learners.forEach(learner => {
        let learnerTotalScore = 0;
        let assignmentCells = '';

        assignments.forEach(assignment => {
            const score = gradesMap.get(`${learner.id}-${assignment.id}`);
            assignmentCells += `<td>${score !== undefined ? score : 'N/A'}</td>`;
            if (score !== undefined) {
                learnerTotalScore += score;
            }
        });

        const percentage = totalPossibleMarks > 0 ? ((learnerTotalScore / totalPossibleMarks) * 100).toFixed(1) : 0;
        const level = getAchievementLevel(percentage);

        tableRows += `
            <tr>
                <td>${learner.admissionId || 'N/A'}</td>
                <td>${learner.learnerName} ${learner.learnerSurname}</td>
                ${assignmentCells}
                <td>${learnerTotalScore}</td>
                <td>${percentage}%</td>
                <td>${level.level} (${level.description})</td>
            </tr>
        `;
    });

    const marksheetHTML = `
        <div class="marksheet-header">
            <span class="modal-close-btn no-print">&times;</span>
            <img src="../../images/Logo.png" alt="School Logo" class="school-logo">
            <h1>Toronto Primary School</h1>
            <h2>Mark Sheet: ${subject} - Class ${fullClass}</h2>
            <p><strong>Educator:</strong> ${teacherData.preferredName || ''} ${teacherData.surname || ''}</p>
            <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="data-table-container">
            <table class="data-table marksheet-table">
                <thead>
                    <tr>
                        <th>Adm No.</th>
                        <th>Learner Name</th>
                        ${assignments.map(a => `<th>${a.name}<br>(${a.totalMarks})</th>`).join('')}
                        <th>Total<br>(${totalPossibleMarks})</th>
                        <th>%</th>
                        <th>Level</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        <div class="marksheet-footer">
            <div class="signature-line">
                <p>Educator's Signature:</p>
                <span>_________________________</span>
            </div>
            <div class="signature-line">
                <p>Date:</p>
                <span>_________________________</span>
            </div>
        </div>
        <div class="marksheet-actions no-print" style="margin-top: 20px; display: flex; gap: 10px;">
            <button onclick="window.print()" class="cta-button"><i class="fas fa-print"></i> Print Mark Sheet</button>
            <button id="export-excel-btn" class="cta-button primary-green">
                <i class="fas fa-file-excel"></i> Export to Excel
            </button>
        </div>
    `;

    content.innerHTML = marksheetHTML;
    modal.style.display = 'block';

    // Add listeners to close the modal
    modal.querySelector('.modal-close-btn').onclick = () => { modal.style.display = 'none'; };
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // **NEW**: Add listener for the new Excel export button
    document.getElementById('export-excel-btn').onclick = () => exportMarkSheetToExcel(fullClass, subject, learners, assignments, gradesMap);
}

/**
 * Calculates the achievement level based on a percentage score.
 * @param {number} percentage - The percentage score.
 * @returns {{level: number, description: string}}
 */
function getAchievementLevel(percentage) {
    if (percentage >= 80) return { level: 7, description: "Outstanding" };
    if (percentage >= 70) return { level: 6, description: "Meritorious" };
    if (percentage >= 60) return { level: 5, description: "Substantial" };
    if (percentage >= 50) return { level: 4, description: "Adequate" };
    if (percentage >= 40) return { level: 3, description: "Moderate" };
    if (percentage >= 30) return { level: 2, description: "Elementary" };
    return { level: 1, description: "Not Achieved" };
}

// =========================================================
// === ADD LEARNER TO CLASS TOOL ===
// =========================================================

/**
 * Sets up the logic for the "Add Learner to My Class" tool.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
function setupAddLearnerToClassTool(db, teacherAuthData) {
    const findBtn = document.getElementById('add-learner-find-btn');
    const searchInput = document.getElementById('add-learner-search-input');
    const resultsContainer = document.getElementById('add-learner-results');

    if (!findBtn) return;

    findBtn.addEventListener('click', async () => {
        const admissionNumber = searchInput.value.trim();
        if (!admissionNumber) {
            alert('Please enter an admission number.');
            return;
        }

        resultsContainer.innerHTML = `<p class="info-message"><i class="fas fa-sync fa-spin"></i> Searching for learner...</p>`;

        try {
            const q = db.collection('sams_registrations').where('admissionId', '==', admissionNumber).limit(1);
            const querySnapshot = await q.get();

            if (querySnapshot.empty) {
                resultsContainer.innerHTML = `<p class="info-message error">No learner found with admission number "${admissionNumber}".</p>`;
                return;
            }

            const learnerDoc = querySnapshot.docs[0];
            const learnerData = learnerDoc.data();

            let resultsHTML = `<h4>Learner Found</h4>`;
            if (learnerData.fullGradeSection) {
                resultsHTML += `<p class="info-message error">This learner is already assigned to Class <strong>${learnerData.fullGradeSection}</strong>. You cannot add them.</p>`;
            } else {
                resultsHTML += `
                    <div class="profile-card" style="flex-direction: column; align-items: flex-start;">
                        <p><strong>Name:</strong> ${learnerData.learnerName || ''} ${learnerData.learnerSurname || ''}</p>
                        <p><strong>Admission No:</strong> ${learnerData.admissionId}</p>
                        <p><strong>Grade:</strong> ${learnerData.grade}</p>
                        <button id="confirm-add-learner-btn" class="cta-button" style="margin-top: 15px;">
                            <i class="fas fa-user-plus"></i> Add to My Class
                        </button>
                    </div>
                `;
            }
            resultsContainer.innerHTML = resultsHTML;

            // Add event listener only if the button exists
            const confirmBtn = document.getElementById('confirm-add-learner-btn');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', async () => {
                    await addFoundLearnerToClass(db, teacherAuthData, learnerDoc.id, learnerData);
                });
            }

        } catch (error) {
            console.error('Error finding learner to add:', error);
            resultsContainer.innerHTML = `<p class="info-message error">An error occurred during the search.</p>`;
        }
    });
}

/**
 * Assigns the found learner to the teacher's responsible class.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 * @param {string} learnerDocId - The Firestore document ID of the learner.
 * @param {object} learnerData - The data object of the learner.
 */
async function addFoundLearnerToClass(db, teacherAuthData, learnerDocId, learnerData) {
    const teacherDoc = await db.collection('users').doc(teacherAuthData.uid).get();
    const teacherData = teacherDoc.data();

    if (!teacherData.isClassTeacher || !teacherData.responsibleClass) {
        alert('Error: You are not assigned as a class teacher or your responsible class is not set.');
        return;
    }

    if (!confirm(`Are you sure you want to add ${learnerData.learnerName} ${learnerData.learnerSurname} to your class, ${teacherData.responsibleClass}?`)) {
        return;
    }

    const grade = teacherData.responsibleClass.match(/^\d+|[R]/)[0];
    const section = teacherData.responsibleClass.replace(grade, '');

    try {
        await db.collection('sams_registrations').doc(learnerDocId).update({
            fullGradeSection: teacherData.responsibleClass,
            section: section,
            grade: (grade === 'R') ? 'R' : parseInt(grade, 10)
        });
        alert('Learner successfully added to your class!');
        document.getElementById('add-learner-results').innerHTML = `<p class="info-message success">Learner has been added. You can now find them in your class roster.</p>`;
        document.getElementById('add-learner-search-input').value = '';
    } catch (error) {
        console.error('Error updating learner class:', error);
        alert('Failed to add learner to the class. Please try again.');
    }
}

/**
 * Populates the attendance class dropdown and sets up the listener to load learners.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {Array<string>} assignedClasses - An array of class names.
 */
function setupAttendanceRegister(db, assignedClasses) {
    const classSelect = document.getElementById('attendance-class-select');
    const tableBody = document.getElementById('attendance-table-body');

    if (!classSelect || !tableBody) return;

    // Populate the dropdown
    assignedClasses.forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = `Class: ${className}`;
        classSelect.appendChild(option);
    });

    // Add event listener to load learners on selection
    classSelect.addEventListener('change', async (e) => {
        const selectedClass = e.target.value;

        if (!selectedClass) {
            tableBody.innerHTML = '<tr><td colspan="2" class="info-message">Please select a class to view the attendance register.</td></tr>';
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="2" class="info-message"><i class="fas fa-sync fa-spin"></i> Loading learners...</td></tr>';

        try {
            const learnersQuery = db.collection('sams_registrations').where('fullGradeSection', '==', selectedClass);
            const learnersSnapshot = await learnersQuery.get();

            if (learnersSnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="2" class="info-message">No learners found for this class.</td></tr>';
                return;
            }

            let tableRowsHTML = '';
            learnersSnapshot.forEach(doc => {
                const learnerData = doc.data();
                const learnerId = doc.id; // Use the unique document ID for the radio button name
                
                // **FIX**: Ensure admissionId is correctly retrieved from the learner data object.
                const admissionId = learnerData.admissionId || 'N/A';
                const learnerName = `${learnerData.learnerName || ''} ${learnerData.learnerSurname || ''}`.trim();

                // If the learner name is empty, we can skip adding them to the attendance list.
                if (!learnerName) return;
                
                tableRowsHTML += `
                    <tr data-admission-id="${admissionId}">
                        <td>${admissionId}</td>
                        <td>${learnerName}</td>
                        <td>
                            <div class="attendance-status-container">
                                <input type="radio" id="${learnerId}-present" name="${learnerId}-status" value="present" checked>
                                <label for="${learnerId}-present" class="status-present">Present</label>
                                <input type="radio" id="${learnerId}-absent" name="${learnerId}-status" value="absent">
                                <label for="${learnerId}-absent" class="status-absent">Absent</label>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tableBody.innerHTML = tableRowsHTML;

        } catch (error) {
            console.error("Error loading learners for attendance:", error);
            tableBody.innerHTML = '<tr><td colspan="2" class="error-message">Failed to load learners. Please try again.</td></tr>';
        }
    });
}

// Global click listener to close all action menus when clicking outside
let globalChatMenuClickListener = (event) => {
    document.querySelectorAll('.action-menu').forEach(menu => {
        const kebabBtn = menu.closest('.chat-message-actions').querySelector('.action-kebab-btn');
        if (!menu.contains(event.target) && !kebabBtn.contains(event.target)) {
            menu.style.display = 'none';
            menu.closest('.chat-message-actions').style.display = 'none'; // Hide its parent actions container too
        }
    });
};
// Add this listener once when the DOM is ready, or when the chat feature is initialized.
document.addEventListener('click', globalChatMenuClickListener);

/**
 * Renders the HTML for a single class roster and appends it to the container.
 * @param {HTMLElement} container - The main container for all class rosters.
 * @param {string} className - The name of the class (e.g., "1A").
 * @param {Array<object>} learners - An array of learner data objects.
 */
function renderClassRoster(container, className, learners) {
    const card = document.createElement('div'); 
    card.className = 'tool-card accent-1';
    card.dataset.className = className; // Add data attribute for filtering

    let tableHTML = `
        <h3><i class="fas fa-chalkboard-teacher"></i> Class Roster: ${className}</h3>
        <p><strong>Total Learners:</strong> ${learners.length}</p>
    `;

    if (learners.length > 0) {
        // **FIX**: Sort learners alphabetically by surname (which is in the learnerName field).
        learners.sort((a, b) => (a.learnerName || '').localeCompare(b.learnerName || ''));

        tableHTML += `
            <div class="data-table-container" style="margin-top: 15px;">
                <table class="data-table">
                    <thead><tr><th>Admission No.</th><th>Learner Name</th></tr></thead>
                    <tbody>
                        ${learners.map(learner => `
                            <tr>
                                <td>${learner.admissionId || 'N/A'}</td>
                                <td>${learner.learnerName || ''} ${learner.learnerSurname || ''}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    }
    card.innerHTML = tableHTML;
    container.appendChild(card);

    // Hide the individual card by default. The filter will show it when needed.
    card.style.display = 'none';

    // After rendering, re-apply the filter logic in case the user has already selected a class
    const filterSelect = document.getElementById('teacher-class-filter');
    if (filterSelect.value !== "") {
        filterSelect.dispatchEvent(new Event('change'));
    }
}

/**
 * Sets up the logic for the Annual Class Roster Setup tool.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {HTMLSelectElement} classSelect - The dropdown for selecting the class to manage.
 */
function setupRosterManagement(db, rosterSetupClassSelect) {
    const managementArea = document.getElementById('roster-management-area');
    const searchInput = document.getElementById('roster-learner-search-input');
    const searchBtn = document.getElementById('learner-search-btn');
    const searchResultsContainer = document.getElementById('learner-search-results');
    const manualAddForm = document.getElementById('manual-add-learner-form');
    const currentRosterContainer = document.getElementById('current-roster-list');

    rosterSetupClassSelect.addEventListener('change', () => {
        const selectedClass = rosterSetupClassSelect.value;
        if (selectedClass) {
            managementArea.style.display = 'block';
            loadCurrentRoster(db, selectedClass, currentRosterContainer);
        } else {
            managementArea.style.display = 'none';
        }
    });

    searchBtn.addEventListener('click', async () => {
        const selectedClass = rosterSetupClassSelect.value;
        const rawSearchTerm = searchInput.value.trim();

        if (!selectedClass) {
            alert("Please select your class from the dropdown before searching.");
            return;
        }
        if (rawSearchTerm.length < 3) {
            alert('Please enter at least 3 characters to search.');
            return;
        }

        // Capitalize the first letter of the search term to handle case-insensitivity.
        const searchTerm = rawSearchTerm.charAt(0).toUpperCase() + rawSearchTerm.slice(1);

        searchResultsContainer.innerHTML = '<p class="info-message"><i class="fas fa-sync fa-spin"></i> Searching...</p>';

        try {
            // **NEW**: Determine the source grade to search from.
            const targetGradeStr = selectedClass.match(/^\d+|[R]/)[0];
            let sourceGrade;

            if (targetGradeStr === 'R') {
                // Grade R has no previous grade, so we don't filter by grade.
                sourceGrade = null;
            } else if (targetGradeStr === '1') {
                sourceGrade = 'R'; // Grade 1 learners come from Grade R.
            } else {
                sourceGrade = parseInt(targetGradeStr, 10) - 1; // e.g., Grade 7 learners come from Grade 6.
            }

            let results = [];
            const endTerm = searchTerm.slice(0, -1) + String.fromCharCode(searchTerm.charCodeAt(searchTerm.length - 1) + 1);

            let query = db.collection('sams_registrations');

            // Add the grade filter if a source grade is determined.
            if (sourceGrade !== null) {
                query = query.where('grade', '==', sourceGrade);
            }

            const querySnapshot = await query.where('learnerSurname', '>=', searchTerm)
                .where('learnerSurname', '<', endTerm)
                .limit(10) // Limit results to prevent overwhelming the UI
                .get();

            querySnapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));

            if (results.length === 0) {
                let message = `No learners found with a surname starting with "${searchTerm}"`;
                if (sourceGrade !== null) message += ` in Grade ${sourceGrade}`;
                searchResultsContainer.innerHTML = `<p class="info-message">${message}.</p>`;
                return;
            }

            let resultsHTML = '<h4>Search Results</h4><ul class="search-results-list">';
            results.forEach(learner => {
                resultsHTML += `
                    <li>
                        <span>${learner.learnerName} ${learner.learnerSurname} (Adm: ${learner.admissionId}, Prev Class: ${learner.fullGradeSection || 'N/A'})</span>
                        <button class="cta-button-small" onclick="addLearnerToRoster('${learner.id}', '${rosterSetupClassSelect.value}')">Add to Class</button>
                    </li>
                `;
            });
            resultsHTML += '</ul>';
            searchResultsContainer.innerHTML = resultsHTML;

        } catch (error) {
            console.error('Error searching for learners:', error);
            searchResultsContainer.innerHTML = '<p class="error-message">An error occurred during search.</p>';
        }
    });

    // Handle manual learner addition
    if (manualAddForm) {
        manualAddForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedClass = rosterSetupClassSelect.value;
            const statusMessage = document.getElementById('manual-add-status');
            statusMessage.style.display = 'block';

            if (!selectedClass) {
                statusMessage.textContent = 'Please select your class before adding a learner.';
                statusMessage.className = 'status-message-box error';
                return;
            }

            const admissionId = document.getElementById('manual-admission-id').value.trim();
            const learnerName = document.getElementById('manual-learner-name').value.trim();
            const learnerSurname = document.getElementById('manual-learner-surname').value.trim();

            if (!admissionId || !learnerName || !learnerSurname) {
                statusMessage.textContent = 'Please fill in all fields: Admission ID, First Name, and Last Name.';
                statusMessage.className = 'status-message-box error';
                return;
            }

            statusMessage.textContent = 'Checking for existing learner and adding...';
            statusMessage.className = 'status-message-box info';

            try {
                // Check if a learner with this admission ID already exists
                const existingLearnerSnap = await db.collection('sams_registrations').where('admissionId', '==', admissionId).limit(1).get();
                if (!existingLearnerSnap.empty) {
                    statusMessage.textContent = `Error: A learner with Admission ID "${admissionId}" already exists.`;
                    statusMessage.className = 'status-message-box error';
                    return;
                }

                // Create and add the new learner
                const grade = selectedClass.match(/^\d+|[R]/)[0];
                const section = selectedClass.replace(grade, '');

                await db.collection('sams_registrations').add({
                    admissionId: admissionId,
                    learnerName: learnerName,
                    learnerSurname: learnerSurname,
                    grade: (grade === 'R') ? 'R' : parseInt(grade, 10),
                    section: section,
                    fullGradeSection: selectedClass,
                    importedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                statusMessage.textContent = 'Learner successfully added to your class!';
                statusMessage.className = 'status-message-box success';
                manualAddForm.reset();
                loadCurrentRoster(db, selectedClass, currentRosterContainer); // Refresh the roster
            } catch (error) {
                console.error('Error manually adding learner:', error);
                statusMessage.textContent = 'An error occurred. Please try again.';
                statusMessage.className = 'status-message-box error';
            }
        });
    }

    // Make helper functions globally accessible for onclick handlers
    window.addLearnerToRoster = async (docId, targetClass) => {
        if (!confirm(`Are you sure you want to add this learner to class ${targetClass}? This will update their official class assignment.`)) return;
        
        const grade = targetClass.match(/^\d+|[R]/)[0];
        const section = targetClass.replace(grade, '');

        try {
            await db.collection('sams_registrations').doc(docId).update({
                fullGradeSection: targetClass,
                section: section,
                grade: (grade === 'R') ? 'R' : parseInt(grade, 10)
            });
            alert('Learner added successfully!');
            loadCurrentRoster(db, targetClass, currentRosterContainer); // Refresh the current roster
            searchResultsContainer.innerHTML = ''; // Clear search results
            searchInput.value = '';
        } catch (error) {
            console.error('Error adding learner to roster:', error);
            alert('Failed to add learner.');
        }
    };

    window.removeLearnerFromRoster = async (docId, targetClass) => {
        if (!confirm('Are you sure you want to remove this learner from your class? This will unassign them.')) return;

        try {
            await db.collection('sams_registrations').doc(docId).update({
                fullGradeSection: null,
                section: null
            });
            alert('Learner removed successfully!');
            loadCurrentRoster(db, targetClass, currentRosterContainer); // Refresh the current roster
        } catch (error) {
            console.error('Error removing learner from roster:', error);
            alert('Failed to remove learner.');
        }
    };
}

/**
 * Loads and displays the current list of learners assigned to a class.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} className - The class to load the roster for.
 * @param {HTMLElement} container - The container to render the list into.
 */
async function loadCurrentRoster(db, className, container) {
    container.innerHTML = '<h4>Current Roster</h4><p class="info-message"><i class="fas fa-sync fa-spin"></i> Loading current roster...</p>';

    try {
        const snapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', className).get();
        if (snapshot.empty) {
            container.innerHTML = '<h4>Current Roster</h4><p class="info-message">This class is currently empty.</p>';
            return;
        }

        let rosterHTML = '<h4>Current Roster</h4><ul class="current-roster-list">';
        const learners = [];
        snapshot.forEach(doc => learners.push({ id: doc.id, ...doc.data() }));

        // Sort by name
        learners.sort((a, b) => (`${a.learnerSurname} ${a.learnerName}`).localeCompare(`${b.learnerSurname} ${b.learnerName}`));

        learners.forEach(learner => {
            rosterHTML += `
                <li>
                    <span>${learner.learnerName} ${learner.learnerSurname} (Adm: ${learner.admissionId})</span>
                    <button class="cta-button-small danger" onclick="removeLearnerFromRoster('${learner.id}', '${className}')">Remove</button>
                </li>
            `;
        });
        rosterHTML += '</ul>';
        container.innerHTML = rosterHTML;

    } catch (error) {
        console.error('Error loading current roster:', error);
        container.innerHTML = '<h4>Current Roster</h4><p class="error-message">Failed to load roster.</p>';
    }
}

/**
 * Defines the fixed order for portfolio categories.
 */
const PORTFOLIO_CATEGORY_ORDER = [
    "Table Of Content",
    "Job Description",
    "Mission and Vision",
    "School Calender",
    "Personal Time Table",
    "Lesson Plans",
    "Student Assessments",
    "Classroom Management",
    "Teaching Philosophy",
    "Student Work Samples",
    "Professional Development",
    "Parent Communication",
    "Other"
];

/**
 * Sets up the portfolio upload form and listeners.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
function setupPortfolioManager(db, teacherAuthData) {
    // This function now sets up the main portfolio view which lists subject portfolios.
    // The form listener is moved to a function that's called when a specific portfolio is opened.
    showPortfolioListView(); // Ensure the main list view is shown by default.

    document.getElementById('back-to-portfolio-list').addEventListener('click', showPortfolioListView);
}

function setupPortfolioUploadForm(db, teacherAuthData, subject, grade) {
    const form = document.getElementById('upload-portfolio-item-form');
    if (!form) return;

    // Use a named function to be able to remove the listener later
    const formSubmitHandler = async (e) => {
        e.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const statusMessage = document.getElementById('portfolio-upload-status');

        const category = document.getElementById('portfolio-item-category').value;
        const description = document.getElementById('portfolio-item-description').value;
        const file = document.getElementById('portfolio-item-file').files[0];

        if (!category || !description || !file || !subject || !grade) {
            alert('Please fill out all fields and select a file.');
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Uploading...';
        statusMessage.textContent = 'Upload in progress...';
        statusMessage.className = 'status-message-box info';
        statusMessage.style.display = 'block';

        try {
            const storageRef = firebase.storage().ref();
            const filePath = `portfolios/${teacherAuthData.uid}/${grade}/${subject}/${category}/${Date.now()}_${file.name}`;
            const fileRef = storageRef.child(filePath);

            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            await db.collection('teacher_portfolios').add({
                teacherId: teacherAuthData.uid,
                category: category,
                subject: subject,
                grade: grade,
                description: description,
                fileName: file.name,
                url: downloadURL,
                storagePath: filePath,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            statusMessage.textContent = 'Item uploaded successfully!';
            statusMessage.className = 'status-message-box success';
            form.reset();
            loadPortfolioItems(db, teacherAuthData, subject, grade); // Refresh the list for the current subject/grade

        } catch (error) {
            console.error("Error uploading portfolio item:", error);
            statusMessage.textContent = 'An error occurred during upload. Please try again.';
            statusMessage.className = 'status-message-box error';
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload to Portfolio';
        }
    }

    // Clean up previous listener before adding a new one to prevent duplicates
    form.removeEventListener('submit', form.lastSubmitHandler);
    form.addEventListener('submit', formSubmitHandler);
    form.lastSubmitHandler = formSubmitHandler; // Store reference for cleanup
};

/**
 * Shows the main portfolio view which lists all subject-specific portfolios.
 */
async function showPortfolioListView() {
    document.getElementById('portfolio-subject-list-container').style.display = 'block';
    document.getElementById('portfolio-detail-view').style.display = 'none';

    const linksContainer = document.getElementById('portfolio-subject-links');
    linksContainer.innerHTML = '<p class="info-message">Loading your teaching assignments...</p>';

    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!userData) return;

    const teacherDoc = await firebase.firestore().collection('users').doc(userData.uid).get();
    if (!teacherDoc.exists) {
        linksContainer.innerHTML = '<p class="error-message">Could not find your teacher profile.</p>';
        return;
    }

    const assignments = teacherDoc.data().teachingAssignments || [];
    if (assignments.length === 0) {
        linksContainer.innerHTML = '<p class="info-message">You have no teaching assignments. No portfolios to display.</p>';
        return;
    }

    linksContainer.innerHTML = ''; // Clear loading message
    assignments.forEach(assignment => {
        const { subject, grade, fullClass } = assignment;
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'portfolio-subject-link';
        link.innerHTML = `<i class="fas fa-folder"></i> Portfolio for <strong>${subject}</strong> - Class ${fullClass}`;
        link.onclick = (e) => {
            e.preventDefault();
            openPortfolioDetailView(subject, grade, fullClass);
        };
        linksContainer.appendChild(link);
    });
}

/**
 * Opens the detailed view for a specific subject portfolio.
 * @param {string} subject - The subject of the portfolio.
 * @param {string} grade - The grade of the portfolio.
 * @param {string} fullClass - The full class name for display.
 */
function openPortfolioDetailView(subject, grade, fullClass) {
    document.getElementById('portfolio-subject-list-container').style.display = 'none';
    document.getElementById('portfolio-detail-view').style.display = 'block';

    document.getElementById('portfolio-detail-header').textContent = `Managing Portfolio for ${subject} - Class ${fullClass}`;

    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    const db = firebase.firestore();

    // Load items for this specific portfolio
    loadPortfolioItems(db, userData, subject, grade);

    // Set up the upload form for this specific context
    setupPortfolioUploadForm(db, userData, subject, grade);

    // Set up the link generator for this specific context
    setupPortfolioLinkGenerator(userData, subject, grade);
}


/**
 * Loads and displays portfolio items for a specific subject and grade.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 * @param {string} subject - The subject to filter by.
 * @param {string} grade - The grade to filter by.
 */
async function loadPortfolioItems(db, teacherAuthData, subject, grade) {
    const container = document.getElementById('portfolio-items-container');
    if (!container) return;

    container.innerHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3><p class="info-message">Loading portfolio items...</p>';

    try {
        const snapshot = await db.collection('teacher_portfolios')
            .where('teacherId', '==', teacherAuthData.uid)
            .where('subject', '==', subject)
            .where('grade', '==', grade)
            .orderBy('uploadedAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3><p class="info-message">This portfolio is empty. Use the form on the left to add your first item.</p>';
            return;
        }

        const itemsByCategory = {};
        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };
            if (!itemsByCategory[item.category]) itemsByCategory[item.category] = [];
            itemsByCategory[item.category].push(item);
        });

        let portfolioHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3>';
        PORTFOLIO_CATEGORY_ORDER.forEach(category => {
            if (itemsByCategory[category]) {
                portfolioHTML += `<h4 class="portfolio-category-title">${category}</h4><ul class="resource-list">`;
                itemsByCategory[category].forEach(item => {
                    portfolioHTML += `
                        <li data-doc-id="${item.id}" data-storage-path="${item.storagePath}">
                            <i class="far fa-file-alt"></i>
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="Uploaded: ${item.uploadedAt.toDate().toLocaleDateString()}">${item.description}</a>
                            <button class="cta-button-small danger" onclick="deletePortfolioItem(this, '${subject}', '${grade}')"><i class="fas fa-trash-alt"></i></button>
                        </li>`;
                });
                portfolioHTML += `</ul>`;
            }
        });
        container.innerHTML = portfolioHTML;

    } catch (error) {
        console.error("Error loading portfolio items for subject/grade:", error);
        container.innerHTML = '<h3><i class="fas fa-folder-open"></i> Uploaded Items</h3><p class="error-message">Could not load portfolio items.</p>';
    }
}

/**
 * Sets up the "Print Portfolio" button functionality.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 */
function setupPortfolioPrint(teacherAuthData) {
    const printBtn = document.getElementById('print-portfolio-btn');
    if (!printBtn) return;

    printBtn.addEventListener('click', () => {
        // 1. Populate the cover page with dynamic data
        const teacherNameEl = document.getElementById('print-cover-teacher-name');
        const dateEl = document.getElementById('print-cover-date');
        
        if (teacherNameEl) {
            teacherNameEl.textContent = `${teacherAuthData.preferredName || ''} ${teacherAuthData.surname || ''}`;
        }
        if (dateEl) {
            dateEl.textContent = `Generated on: ${new Date().toLocaleDateString()}`;
        }

        // 2. Trigger the browser's print dialog
        window.print();
    });
}

/**
 * Sets up the "Generate Shareable Link" button functionality.
 * @param {object} teacherAuthData - The authenticated teacher's data.
 * @param {string} subject - The subject for the link.
 * @param {string} grade - The grade for the link.
 */
function setupPortfolioLinkGenerator(teacherAuthData, subject, grade) {
    const generateBtn = document.getElementById('generate-share-link-btn');
    if (!generateBtn) return;

    generateBtn.addEventListener('click', () => {
        const outputArea = document.getElementById('portfolio-link-output-area');
        const linkInput = document.getElementById('generated-portfolio-link');
        const copyBtn = document.getElementById('copy-portfolio-link-btn');

        if (!teacherAuthData || !teacherAuthData.uid) {
            alert('Could not generate link. User ID is missing.'); return;
        }
        if (!subject || !grade) {
            alert('Could not generate link. Subject or grade is missing.');
            return;
        }

        // Construct a relative URL with all necessary parameters
        const viewerPath = `../portfolio/portfolio-viewer.html?teacherId=${teacherAuthData.uid}&subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`;
        // Create a full, clean URL
        const fullUrl = new URL(viewerPath, window.location.href).href;

        linkInput.value = fullUrl;
        outputArea.style.display = 'block';

        copyBtn.onclick = () => {
            linkInput.select();
            document.execCommand('copy');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Link';
            }, 2000);
        };
    });
}

window.deletePortfolioItem = async (button, subject, grade) => {
    const listItem = button.closest('li');
    const docId = listItem.dataset.docId;
    const storagePath = listItem.dataset.storagePath;

    if (!confirm(`Are you sure you want to permanently delete this portfolio item?`)) return;

    try {
        // Delete from Firestore and Storage
        await firebase.firestore().collection('teacher_portfolios').doc(docId).delete();
        await firebase.storage().ref(storagePath).delete();
        listItem.remove(); // Remove from UI
        alert('Item deleted successfully.');

        // Refresh the list to check if the category is now empty
        const userData = JSON.parse(sessionStorage.getItem('currentUser'));
        loadPortfolioItems(firebase.firestore(), userData, subject, grade);
    } catch (error) {
        console.error("Error deleting portfolio item:", error);
        alert('Failed to delete item. Please try again.');
    }
};

/**
 * Sets up the functionality for uploading and processing an Excel roster.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */
function setupExcelRosterUpload(db) {
    const processBtn = document.getElementById('process-excel-btn');
    const fileInput = document.getElementById('excel-roster-upload');
    const statusContainer = document.getElementById('excel-upload-status');
    const classSelect = document.getElementById('roster-setup-class-select');

    if (!processBtn || !fileInput || !statusContainer || !classSelect) return;

    processBtn.addEventListener('click', () => {
        const selectedClass = classSelect.value;
        const file = fileInput.files[0];

        if (!selectedClass) {
            alert('Please select your responsible class before processing a file.');
            return;
        }
        if (!file) {
            alert('Please select an Excel file to upload.');
            return;
        }

        processBtn.disabled = true;
        processBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Processing...';
        statusContainer.innerHTML = `<p class="info-message">Reading file...</p>`;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const learners = XLSX.utils.sheet_to_json(worksheet, {
                    // Standardize headers to prevent issues with case or spacing
                    header: ["Admission Number", "First Name", "Last Name"],
                    range: 1 // Skip the header row in the data array
                });

                if (learners.length === 0) {
                    throw new Error("The Excel file is empty or not formatted correctly.");
                }

                statusContainer.innerHTML = `<p class="info-message">File read successfully. Found ${learners.length} learners. Now updating database... (This may take a moment)</p>`;

                const batch = db.batch();
                const grade = selectedClass.match(/^\d+|[R]/)[0];
                const section = selectedClass.replace(grade, '');
                let processedCount = 0;
                let errorMessages = [];

                for (const learner of learners) {
                    const admissionId = String(learner['Admission Number']).trim();
                    const firstName = String(learner['First Name']).trim();
                    const lastName = String(learner['Last Name']).trim();

                    if (!admissionId || !firstName || !lastName) {
                        errorMessages.push(`Skipped a row due to missing data.`);
                        continue;
                    }

                    // Find if a learner with this admission ID already exists
                    const query = db.collection('sams_registrations').where('admissionId', '==', admissionId).limit(1);
                    const snapshot = await query.get();

                    if (snapshot.empty) {
                        // Learner does not exist, create them
                        const newLearnerRef = db.collection('sams_registrations').doc();
                        batch.set(newLearnerRef, {
                            admissionId: admissionId,
                            learnerName: firstName,
                            learnerSurname: lastName,
                            grade: (grade === 'R') ? 'R' : parseInt(grade, 10),
                            section: section,
                            fullGradeSection: selectedClass,
                            importedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        // Learner exists, update their class assignment
                        const existingLearnerRef = snapshot.docs[0].ref;
                        batch.update(existingLearnerRef, {
                            grade: (grade === 'R') ? 'R' : parseInt(grade, 10),
                            section: section,
                            fullGradeSection: selectedClass
                        });
                    }
                    processedCount++;
                }

                await batch.commit();

                statusContainer.innerHTML = `<p class="success-message">${processedCount} learners have been successfully added/updated for class ${selectedClass}.</p>`;
                if (errorMessages.length > 0) {
                    statusContainer.innerHTML += `<p class="error-message">${errorMessages.join('<br>')}</p>`;
                }
                loadCurrentRoster(db, selectedClass, document.getElementById('current-roster-list')); // Refresh the view

            } catch (error) {
                console.error("Error processing Excel file:", error);
                statusContainer.innerHTML = `<p class="error-message">Error: ${error.message}. Please ensure the file is a valid Excel file and the columns are named correctly.</p>`;
            } finally {
                processBtn.disabled = false;
                processBtn.innerHTML = '<i class="fas fa-cogs"></i> Process File';
                fileInput.value = ''; // Clear the file input
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Renders the HTML for a single class roster and appends it to the container.
 * @param {HTMLElement} container - The main container for all class rosters.
    // After rendering, re-apply the filter logic in case the user has already selected a class
    filterSelect.dispatchEvent(new Event('change'));
}

// =========================================================
// === NEW WEEKLY ATTENDANCE SYSTEM ===
// =========================================================

/**
 * Gets the ISO week number for a given date.
 * @param {Date} d - The date.
 * @returns {number} The ISO week number.
 */
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// =========================================================
// === NEW CHAT ENGINE ===
// =========================================================

let activeChatListener = null; // Global to hold the active unsubscribe function

/**
 * Initializes the chat system for the teacher's portal.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The authenticated teacher's data.
 */
async function setupChatEngine(db, teacherData) {
    const parentList = document.getElementById('chat-parent-list');
    const searchInput = document.getElementById('chat-parent-search');
    const classFilter = document.getElementById('chat-class-filter');
    if (!parentList) return;

    try {
        // **FIX**: Instead of fetching all learners, fetch the teacher's profile
        // to get their assigned classes, then fetch learners for only those classes.
        const teacherDoc = await db.collection('users').doc(teacherData.uid).get();
        if (!teacherDoc.exists) {
            throw new Error("Teacher profile not found.");
        }
        const teachingAssignments = teacherDoc.data().teachingAssignments || [];
        const assignedClasses = [...new Set(teachingAssignments.map(a => a.fullClass).filter(Boolean))];

        // Populate the class filter dropdown
        classFilter.innerHTML = '<option value="all">All Classes</option>'; // Reset and add default
        assignedClasses.sort().forEach(className => {
            classFilter.add(new Option(className, className));
        });

        if (assignedClasses.length === 0) {
            parentList.innerHTML = '<p class="info-message">You are not assigned to any classes to view parent contacts.</p>';
            return;
        }

        const parents = [];
        const uniqueParentEmails = new Set();

        // Fetch learners for each assigned class
        for (const className of assignedClasses) {
            const learnersSnapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', className).get();
            learnersSnapshot.forEach(doc => {
                const learner = doc.data();
                if (learner.parent1Email && !uniqueParentEmails.has(learner.parent1Email)) {
                    parents.push({
                        parentId: learner.parentUserId || null,
                        parentName: learner.parent1Name,
                        parentEmail: learner.parent1Email,
                        learnerName: `${learner.learnerName} ${learner.learnerSurname}`,
                        learnerId: doc.id,
                        // Add the class name to each parent object for filtering
                        fullGradeSection: learner.fullGradeSection
                    });
                    uniqueParentEmails.add(learner.parent1Email);
                }
            });
        }

        if (parents.length === 0) {
            parentList.innerHTML = '<p class="info-message">No parent contacts found for your assigned classes.</p>';
            return;
        }

        // Combined function to render and search the parent list
        const updateParentList = () => {
            const filterClass = classFilter.value;
            const searchTerm = searchInput.value.toLowerCase();
            parentList.innerHTML = ''; // Clear list

            const filteredByClass = (filterClass === 'all') ?
                parents :
                parents.filter(p => p.fullGradeSection === filterClass);

            const filteredBySearch = filteredByClass.filter(p => {
                const parentName = (p.parentName || '').toLowerCase();
                const learnerName = (p.learnerName || '').toLowerCase();
                return parentName.includes(searchTerm) || learnerName.includes(searchTerm);
            });

            if (filteredBySearch.length === 0) {
                parentList.innerHTML = '<p class="info-message">No parents found matching your criteria.</p>';
                return;
            }

            filteredBySearch.sort((a, b) => (a.parentName || '').localeCompare(b.parentName || '')).forEach(parent => {
                const li = document.createElement('li');
                li.dataset.parentId = parent.parentId;
                li.dataset.parentName = parent.parentName;
                li.dataset.learnerId = parent.learnerId;
                li.dataset.learnerName = parent.learnerName;
                li.innerHTML = `<span class="parent-name">${parent.parentName}</span><span class="learner-name">(${parent.learnerName})</span>`;
                li.addEventListener('click', () => openChat(db, teacherData, parent, li));
                parentList.appendChild(li);
            });
        };

        // Initial render and event listeners
        updateParentList();
        classFilter.addEventListener('change', updateParentList);
        searchInput.addEventListener('input', updateParentList);

    } catch (error) {
        console.error("Error setting up chat engine:", error);
        parentList.innerHTML = '<p class="error-message">Could not load parent list.</p>';
    }
}

/**
 * Opens a chat window with a specific parent.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The authenticated teacher's data.
 * @param {object} parentData - The data for the selected parent.
 * @param {HTMLElement} listItem - The clicked list item element.
 */
async function openChat(db, teacherData, parentData, listItem) {
    // Deactivate other list items
    document.querySelectorAll('#chat-parent-list li').forEach(li => li.classList.remove('active'));
    listItem.classList.add('active');
    
    const chatWindow = document.getElementById('chat-window');
    const welcomeMessage = document.getElementById('chat-welcome-message');
    welcomeMessage.style.display = 'none';
    // Ensure chat window is visible before adding messages
    chatWindow.style.display = 'flex';
    
    // Construct a consistent chat ID
    const participants = [teacherData.uid, parentData.parentId].sort();
    const chatId = participants.join('_');
    
    chatWindow.innerHTML = `
        <div class="chat-header" style="background-color: #005e54; color: white; padding: 10px 15px; display: flex; align-items: center; gap: 15px;">
            <button id="chat-back-btn" style="background: none; border: none; color: white; font-size: 1.2em; cursor: pointer;">
                <i class="fas fa-arrow-left"></i>
            </button>
            <div style="background: #ccc; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-user" style="color: #fff;"></i>
            </div>
            <div style="flex-grow: 1;">
                <div style="font-weight: 600;">${parentData.parentName}</div>
                <div style="font-size: 0.8em; opacity: 0.8;">Parent of ${parentData.learnerName}</div>
            </div>
            <div style="display: flex; gap: 20px; font-size: 1.2em;">
                <button style="background: none; border: none; color: white; cursor: pointer;"><i class="fas fa-video"></i></button>
                <button style="background: none; border: none; color: white; cursor: pointer;"><i class="fas fa-phone"></i></button>
                <button style="background: none; border: none; color: white; cursor: pointer;"><i class="fas fa-ellipsis-v"></i></button>
            </div>
        </div>
        <div class="chat-messages chat-bg scroll-container" id="chat-messages-container"></div>
        <div class="chat-input-area" style="background-color: #f0f2f5; padding: 8px 12px; display: flex; align-items: center; gap: 10px;">
            <button style="background: none; border: none; font-size: 1.5em; color: #54656f; cursor: pointer;"><i class="far fa-grin"></i></button>
            <button style="background: none; border: none; font-size: 1.5em; color: #54656f; cursor: pointer;"><i class="fas fa-paperclip"></i></button>
            <input type="text" id="chat-message-input" placeholder="Type a message" style="flex-grow: 1; border: none; border-radius: 20px; padding: 10px 15px; font-size: 1em; outline: none;">
            <button id="chat-send-btn" style="background-color: #00a884; color: white; border: none; border-radius: 50%; width: 45px; height: 45px; font-size: 1.2em; cursor: pointer; display: none;">
                <i class="fas fa-paper-plane"></i>
            </button>
            <button id="chat-mic-btn" style="background-color: #00a884; color: white; border: none; border-radius: 50%; width: 45px; height: 45px; font-size: 1.2em; cursor: pointer;">
                <i class="fas fa-microphone"></i>
            </button>
        </div>
    `;

    document.getElementById('chat-back-btn').addEventListener('click', () => {
        goBackToChatList();
    });
    
    const messagesContainer = document.getElementById('chat-messages-container');
    const messageInput = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const micBtn = document.getElementById('chat-mic-btn');
    
    // Logic to show send button or mic button
    messageInput.addEventListener('input', () => {
        if (messageInput.value.trim()) {
            sendBtn.style.display = 'block';
            micBtn.style.display = 'none';
        } else {
            sendBtn.style.display = 'none';
            micBtn.style.display = 'block';
        }
    });

    // Unsubscribe from any previous chat listener
    if (activeChatListener) {
        activeChatListener();
    }
    
    // CRITICAL: Set up the listener to display messages in the teacher's chat box
    const messagesRef = db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp', 'asc');
    activeChatListener = messagesRef.onSnapshot(snapshot => {
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            const isSent = msg.senderId === teacherData.uid;
            messageDiv.classList.add(isSent ? 'sent' : 'received');
            
            // Wrap text in a paragraph
            let messageContentHTML = `<p>${msg.text}</p>`;
            let messageInfoHTML = '';

            if (msg.timestamp && typeof msg.timestamp.toDate === 'function') { // Always show timestamp
                const timeString = msg.timestamp.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                messageInfoHTML += `<span class="timestamp">${timeString}</span>`;
                messageDiv.title = msg.timestamp.toDate().toLocaleString();
            }
            if (isSent) { // Only show status icon for sent messages
                messageInfoHTML += getMessageStatusHTML(msg.status);
            }
            if (messageInfoHTML) {
                messageContentHTML += `<div class="message-info">${messageInfoHTML}</div>`;
            }
            messageDiv.innerHTML = messageContentHTML;
            messagesContainer.appendChild(messageDiv);
        });
        // Scroll to the latest message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    
    // Mark messages as read by the teacher when they are viewing the chat
    const chatRef = db.collection('chats').doc(chatId);    
    chatRef.set({ unreadByTeacherCount: 0 }, { merge: true }); // Mark conversation as read

    // Find all unread messages from the parent and mark them as 'read'
    try {
        const unreadMessagesQuery = db.collection('chats').doc(chatId).collection('messages')
            .where('senderId', '==', parentData.parentId)
            .where('status', '==', 'sent');
        const unreadSnapshot = await unreadMessagesQuery.get();

        if (!unreadSnapshot.empty) {
            const batch = db.batch();
            unreadSnapshot.forEach(doc => {
                batch.update(doc.ref, { status: 'read' });
            });
            await batch.commit();
        }
    } catch (error) {
        console.error("Could not mark messages as read. This may require a Firestore index.", error);
    }
    const sendMessage = async () => {
        const text = messageInput.value.trim();
        if (text === '') return;
        
        messageInput.value = '';
        // After sending, hide send button and show mic button again
        if (sendBtn && micBtn) {
            sendBtn.style.display = 'none';
            micBtn.style.display = 'block';
        }
        
        const messagePayload = {
            text: text,
            senderId: teacherData.uid,
            senderName: teacherData.preferredName,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'sent' // Add status field
        };
        
        const batch = db.batch();
        batch.set(chatRef.collection('messages').doc(), messagePayload);
        
        // **FIX**: Use `set` with `merge: true` instead of `update`.
        // This will CREATE the document on the first message and UPDATE it on subsequent messages.
        batch.set(chatRef, {
            teacherId: teacherData.uid,
            teacherName: teacherData.preferredName,
            parentId: parentData.parentId,
            parentName: parentData.parentName,
            learnerId: parentData.learnerId,
            learnerName: parentData.learnerName,
            lastMessage: text,
            lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            unreadByParentCount: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
        
        await batch.commit();
    };
    
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent new line
            sendMessage();
        }
    });
}

/**
 * Generates the HTML for the message status icon (checkmarks).
 * @param {string} status - The status of the message ('sent', 'delivered', 'read').
 * @returns {string} The HTML string for the icon.
 */
function getMessageStatusHTML(status) {
    let iconClass = 'fas fa-check'; // Default for 'sent'
    let title = 'Sent';

    if (status === 'read') {
        iconClass = 'fas fa-check-double'; // Blue double check for 'read'
        title = 'Read';
    }
    // Note: 'delivered' status can be added here if needed in the future.
    return `<span class="message-status" title="${title}"><i class="${iconClass}"></i></span>`;
}

/**
 * Hides the chat window and returns to the chat list view.
 */
function goBackToChatList() {
    if (activeChatListener) {
        activeChatListener(); // Unsubscribe from the current chat listener
        activeChatListener = null;
    }
    document.getElementById('chat-window').style.display = 'none';
    document.getElementById('chat-welcome-message').style.display = 'flex';
    // Remove the global click listener when chat is closed
    document.removeEventListener('click', globalChatMenuClickListener);
    document.querySelectorAll('#chat-parent-list li').forEach(li => li.classList.remove('active'));
}

// =========================================================
// === NEW QUIZ LINK GENERATOR ===
// =========================================================

/**
 * Initializes the Quiz Link Generator tool.
 */
function setupQuizGenerator() {
    const generateBtn = document.getElementById('generate-quiz-link-btn');
    const copyBtn = document.getElementById('copy-quiz-link-btn');
    const outputArea = document.getElementById('quiz-link-output-area');
    const linkInput = document.getElementById('generated-quiz-link');

    if (!generateBtn) return;

    generateBtn.addEventListener('click', () => {
        const category = document.getElementById('quiz-category').value;
        const difficulty = document.getElementById('quiz-difficulty').value;
        const amount = document.getElementById('quiz-amount').value;

        // Construct the base URL for the learners' portal
        const baseUrl = window.location.origin + '/html/auth/learners-portal.html';

        // Build the query parameters
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (difficulty) params.append('difficulty', difficulty);
        if (amount) params.append('amount', amount);

        // Create the final URL with a hash for the quiz section
        const finalUrl = `${baseUrl}#quiz?${params.toString()}`;

        linkInput.value = finalUrl;
        outputArea.style.display = 'block';
    });

    copyBtn.addEventListener('click', () => {
        linkInput.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Link';
        }, 2000);
    });
}

/**
 * Overhauls the attendance register to support a weekly view.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} teacherData - The current teacher's user data, including responsibleClass.
 */
function setupAttendanceRegister(db, teacherData) {
    const classSelect = document.getElementById('attendance-class-select');
    const tableBody = document.getElementById('attendance-table-body');
    const weekDisplay = document.getElementById('attendance-week-display');

    if (!classSelect || !tableBody) return;

    // Clear existing options
    classSelect.innerHTML = '<option value="">-- Select a Class to Load Roster --</option>';

    // Populate the dropdown ONLY with the responsible class if the teacher is a class teacher
    if (teacherData.isClassTeacher && teacherData.responsibleClass) {
        classSelect.add(new Option(`Class: ${teacherData.responsibleClass}`, teacherData.responsibleClass));
        // Automatically select and load the responsible class if there's only one option
        classSelect.value = teacherData.responsibleClass;
        // Trigger change event to load roster immediately
        classSelect.dispatchEvent(new Event('change')); 
    } else {
        // If not a class teacher, or no responsible class, disable the select and show a message
        classSelect.innerHTML = '<option value="">Not assigned as a Class Teacher</option>';
        classSelect.disabled = true;
        tableBody.innerHTML = `<tr><td colspan="7" class="info-message">You are not assigned as a Class Teacher, or your responsible class is not set.</td></tr>`;
        return; // Stop further execution if no responsible class
    }

    // Add event listener to load learners on selection
    classSelect.addEventListener('change', async (e) => {
        const selectedClass = e.target.value;
        const today = new Date();
        const year = today.getFullYear();
        const weekNumber = getWeekNumber(today);

        // Display the current week
        weekDisplay.textContent = `Showing Attendance for: Week ${weekNumber}, ${year}`;

        if (!selectedClass) {
            tableBody.innerHTML = `<tr><td colspan="7" class="info-message">Please select a class to view the attendance register.</td></tr>`;
            return;
        }

        tableBody.innerHTML = `<tr><td colspan="7" class="info-message"><i class="fas fa-sync fa-spin"></i> Loading learners and attendance...</td></tr>`;

        try {
            // 1. Get all learners for the class
            const learnersSnapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', selectedClass).get();
            if (learnersSnapshot.empty) {
                tableBody.innerHTML = `<tr><td colspan="7" class="info-message">No learners found for this class.</td></tr>`;
                return;
            }
            const learners = learnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.learnerName || '').localeCompare(b.learnerName || ''));

            // 2. Get all weekly attendance records for these learners for the current week, handling the 10-item 'in' query limit.
            const learnerIds = learners.map(l => l.id);
            const attendanceMap = new Map();

            if (learnerIds.length > 0) {
                // Break the query into chunks of 10
                const promises = [];
                for (let i = 0; i < learnerIds.length; i += 10) {
                    const chunk = learnerIds.slice(i, i + 10);
                    promises.push(
                        db.collection('weekly_attendance')
                            .where('year', '==', year)
                            .where('weekNumber', '==', weekNumber)
                            .where('learnerId', 'in', chunk)
                            .get()
                    );
                }

                // Wait for all chunked queries to complete
                const snapshots = await Promise.all(promises);

                // Combine the results into a single map
                snapshots.forEach(snapshot => {
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        attendanceMap.set(data.learnerId, data.attendance);
                    });
                });
            }

            // 3. Render the table
            let tableRowsHTML = '';
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

            learners.forEach(learner => {
                const learnerAttendance = attendanceMap.get(learner.id) || {};
                tableRowsHTML += `<tr data-learner-id="${learner.id}" data-admission-id="${learner.admissionId}" data-learner-name="${learner.learnerName} ${learner.learnerSurname}">`;
                tableRowsHTML += `<td>${learner.admissionId || 'N/A'}</td>`;
                tableRowsHTML += `<td>${learner.learnerName} ${learner.learnerSurname}</td>`;

                days.forEach(day => {
                    const status = learnerAttendance[day] || 'present'; // Default to present
                    tableRowsHTML += `
                        <td>
                            <div class="attendance-status-container">
                                <input type="radio" id="${learner.id}-${day}-present" name="${learner.id}-${day}" value="present" ${status === 'present' ? 'checked' : ''}>
                                <label for="${learner.id}-${day}-present" class="status-present">P</label>
                                <input type="radio" id="${learner.id}-${day}-absent" name="${learner.id}-${day}" value="absent" ${status === 'absent' ? 'checked' : ''}>
                                <label for="${learner.id}-${day}-absent" class="status-absent">A</label>
                            </div>
                        </td>
                    `;
                });
                tableRowsHTML += `</tr>`;
            });
            tableBody.innerHTML = tableRowsHTML;

        } catch (error) {
            console.error("Error loading weekly attendance:", error);
            tableBody.innerHTML = `<tr><td colspan="7" class="error-message">Failed to load attendance. Please try again.</td></tr>`;
        }
    });
}

/**
 * Handles the submission of the weekly attendance form.
 * @param {HTMLFormElement} form - The attendance form element.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */
function setupAttendanceFormListener(form, db) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const statusMessage = document.getElementById('attendance-submit-status');
        const classSelect = document.getElementById('attendance-class-select');
        const selectedClass = classSelect.value;

        if (!selectedClass) {
            alert("Please select a class before submitting.");
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';

        const batch = db.batch();
        const today = new Date();
        const year = today.getFullYear();
        const weekNumber = getWeekNumber(today);
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

        document.querySelectorAll('#attendance-table-body tr').forEach(row => {
            const learnerId = row.dataset.learnerId;
            if (!learnerId) return;

            const attendance = {};
            days.forEach(day => {
                attendance[day] = row.querySelector(`input[name="${learnerId}-${day}"]:checked`).value;
            });

            const docId = `${year}-W${weekNumber}_${learnerId}`;
            const docRef = db.collection('weekly_attendance').doc(docId);
            batch.set(docRef, {
                year, weekNumber, learnerId, fullGradeSection: selectedClass,
                admissionId: row.dataset.admissionId,
                learnerName: row.dataset.learnerName,
                attendance,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }); // Use merge to avoid overwriting other fields if they exist
        });

        try {
            await batch.commit();
            statusMessage.textContent = 'Weekly attendance saved successfully!';
            statusMessage.className = 'status-message-box success';
        } catch (error) {
            console.error("Error saving weekly attendance:", error);
            statusMessage.textContent = 'An error occurred while saving. Please try again.';
            statusMessage.className = 'status-message-box error';
        } finally {
            statusMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save"></i> Submit Attendance';
        }
    });
}
