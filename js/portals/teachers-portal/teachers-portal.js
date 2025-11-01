document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    
    // If no user data, stop execution. The auth.js script will handle the redirect.
    if (userData) {
        // Initialize Firebase only if the user is potentially logged in
        // This check prevents errors if firebase is already initialized by another script.
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const db = firebase.firestore();

        loadTeacherProfile(userData);
        loadTeacherClassesAndLearners(db, userData);

        // Expose functions to the global scope if needed, or handle events here
        window.loadParentData = () => loadParentData(db);
    } else {
        console.error("User data not found in session storage. Please log in again.");
        return; // Stop further script execution
    }

    // Sidebar navigation logic
    const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
    const sections = document.querySelectorAll('.portal-section');

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
  sidebarLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      // Remove active class from all links
      sidebarLinks.forEach(l => l.classList.remove('active'));
      // Add active class to the clicked link
      this.classList.add('active');

      const targetId = this.getAttribute('href').substring(1);
      showSection(targetId);
      
      // Update URL hash
      history.pushState(null, null, `#${targetId}`);
    });
  });

  // Handle page load based on URL hash (default to dashboard)
  const initialHash = window.location.hash.substring(1) || 'dashboard';
  showSection(initialHash);
  const initialLink = document.querySelector(`.sidebar ul li a[href="#${initialHash}"]`);
  if (initialLink) {
    initialLink.classList.add('active');
  }
});

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyELV81r6M6MeGdclMhKKFBAvFVucm1WQC10YgqkCZSfbrK-JGM4wmTFGBa8-iUtRy1AA/exec"; 

// Function to handle the click event on a parent's email.
function loadParentData() {
  const parentDataContainer = document.getElementById('parent-data-container');
  
  parentDataContainer.innerHTML = '<p>Loading parent data...</p>';

  fetch(APPS_SCRIPT_URL)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      parentDataContainer.innerHTML = '';
      const table = document.createElement('table');
      let tableHTML = `<thead><tr><th>Parent Name</th><th>Email</th><th>Learner's Name</th><th>Contact</th></tr></thead><tbody>`;
      data.forEach(parent => {
        const parentEmail = parent["Parent's Email"];
        const learnerName = parent["Learner's Full Name"];
        
        const encodedEmail = encodeURIComponent(parentEmail);
        const encodedName = encodeURIComponent(learnerName);
        
        const contactURL = `${APPS_SCRIPT_URL}?page=compose-message&email=${encodedEmail}&name=${encodedName}`;

        tableHTML += ` <tr>
                 <td>${parent["Parent's Full Name"]}</td>
                 <td>${parentEmail}</td>
                 <td>${learnerName}</td>
                 <td>
                   <a href="${contactURL}" class="contact-link" target="_blank">Contact</a>
                 </td>
               </tr> `;
      });
      tableHTML += `</tbody>`;
      table.innerHTML = tableHTML;
      parentDataContainer.appendChild(table);
    })
    .catch(error => {
      console.error('Error fetching parent data:', error);
      parentDataContainer.innerHTML = '<p>Failed to load parent data. Please ensure the Apps Script URL is correct and deployed.</p>';
    });
}

// Function to load and display teacher profile data
function loadTeacherProfile(userData) {
  if (userData) {
    // The 'auth.js' script now provides a complete user object with a role.
    // We will fetch the full profile from the 'users' collection using the UID.
    const db = firebase.firestore();
    db.collection('users').doc(userData.uid).get().then(doc => {
      if (doc.exists) {
        const profile = doc.data();
        document.querySelector('#teacher-name-display').textContent = profile.preferredName || 'Teacher';
        document.querySelector('.profile-surname').innerHTML = `<strong>Surname:</strong> ${profile.surname || 'N/A'}`;
        document.querySelector('.profile-preferred-name').innerHTML = `<strong>Preferred Name:</strong> ${profile.preferredName || 'N/A'}`;
        document.querySelector('.profile-email').innerHTML = `<strong>Email:</strong> ${profile.email || 'N/A'}`;
        document.querySelector('.profile-contact').innerHTML = `<strong>Contact:</strong> ${profile.contactNumber || 'N/A'}`;
      }
    });
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

    // Clear existing options (except the first "Show All")
    filterSelect.innerHTML = '<option value="all">Show All Classes</option>';

    // Add an option for each assigned class
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

        allRosterCards.forEach(card => {
            if (selectedClass === 'all' || card.dataset.className === selectedClass) {
                card.style.display = 'flex'; // Use 'flex' as per .tool-card styles
            } else {
                card.style.display = 'none';
            }
        });
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
}