
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

        // Sort by parent name for consistency
        parentsData.sort((a, b) => (a.parent1Name || '').localeCompare(b.parent1Name || ''));

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

        // IMPORTANT: Replace this with the URL of your NEWLY deployed Google Apps Script
        const scriptURL = 'https://script.google.com/macros/s/AKfycbyELV81r6M6MeGdclMhKKFBAvFVucm1WQC10YgqkCZSfbrK-JGM4wmTFGBa8-iUtRy1AA/exec'; // This is the correct URL for the teacher email script
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

// --- CORE DATA HANDLING & DISPLAY FUNCTIONS ---
document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    
    // If no user data, stop execution. The auth.js script will handle the redirect.
    if (userData) {
        // Initialize Firebase only if the user is potentially logged in
        // This check prevents errors if firebase is already initialized by another script.
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        } else {
            // If already initialized, get the default app
            firebase.app();
        }
        const db = firebase.firestore();

        loadTeacherProfile(userData);
        loadTeacherClassesAndLearners(db, userData); // This populates class rosters
    } else {
        console.error("User data not found in session storage. Please log in again.");
        return; // Stop further script execution
    }

    // Sidebar navigation logic
    // Select all links intended for section navigation, both in the sidebar and main content
    const navLinks = document.querySelectorAll('.sidebar a[href^="#"], .portal-content-wrapper a[href^="#"]');
    const sections = document.querySelectorAll('.portal-section');
    const sidebarLinks = document.querySelectorAll('.sidebar a[href^="#"]');


  // Function to show the target section and hide others
  function showSection(targetId) {
    sections.forEach(section => {
      section.classList.remove('active-section');
      section.classList.add('hidden-section');
      if (section.id === targetId) {
        section.classList.add('active-section');
        section.classList.remove('hidden-section');
      }
    });
  }

  // Handle link clicks
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      const targetId = this.getAttribute('href').substring(1);

      // Remove active class from all sidebar links
      sidebarLinks.forEach(l => l.classList.remove('active'));
      
      // Find the corresponding sidebar link and make it active
      const correspondingSidebarLink = document.querySelector(`.sidebar a[href="#${targetId}"]`);
      if (correspondingSidebarLink) {
        correspondingSidebarLink.classList.add('active');
      }
      
      showSection(targetId);
      
      // Update URL hash
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

  // Handle page load based on URL hash (default to dashboard)
  const initialHash = window.location.hash.substring(1) || 'dashboard';
  showSection(initialHash);
  const initialLink = document.querySelector(`.sidebar ul li a[href="#${initialHash}"]`);
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
            if (teacherData.assignedClasses && teacherData.assignedClasses.length > 0) {
                teacherData.assignedClasses.forEach(className => {
                    parentClassFilter.add(new Option(className, className));
                });
            }
        }
      }
  } else {
    console.error("User data not found in session storage. Please log in again.");
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
        const assignedClasses = teacherData.assignedClasses || [];

        if (assignedClasses.length === 0) {
            document.getElementById('class-rosters-container').innerHTML = '<p class="info-message">You are not currently assigned to any classes.</p>';
            return;
        }

        // 4. Populate the class filter dropdown
        populateClassFilter(assignedClasses);

        // 5. Set up the attendance register dropdown
        setupAttendanceRegister(db, assignedClasses);

        // Clear the loading message
        const rostersContainer = document.getElementById('class-rosters-container');
        rostersContainer.innerHTML = '';

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
                const learner = doc.data();
                const learnerId = doc.id; // Use the unique document ID for the radio button name
                const learnerName = `${learner.learnerName || ''} ${learner.learnerSurname || ''}`.trim();

                tableRowsHTML += `
                    <tr>
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
        // Sort learners alphabetically by surname, then name
        learners.sort((a, b) => {
            const nameA = `${a.learnerSurname || ''} ${a.learnerName || ''}`.trim();
            const nameB = `${b.learnerSurname || ''} ${b.learnerName || ''}`.trim();
            return nameA.localeCompare(nameB);
        });

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