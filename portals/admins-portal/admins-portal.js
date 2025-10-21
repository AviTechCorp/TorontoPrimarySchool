// admins-portal.js

// You must replace this with your actual Firebase project config.
const firebaseConfig = {
    apiKey: "AIzaSyAJlr-6eTCCpQtWHyPics3-tbOS_X5xA84",
    authDomain: "school-website-66326.firebaseapp.com",
    projectId: "school-website-66326",
    storageBucket: "school-website-66326.firebasestorage.app",
    messagingSenderId: "660829781706",
    appId: "1:660829781706:web:bf447db1d80fc094d9be33"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Get the announcement form element
const announcementForm = document.getElementById('new-announcement-form');

// =========================================================
// === GLOBAL STATE VARIABLE ===
// =========================================================

// Global variable to temporarily hold the data of the learner whose details were clicked
let selectedLearnerData = null; 

// =========================================================
// === ANNOUNCEMENT FORM SUBMISSION ===
// =========================================================

if (announcementForm) {
    announcementForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const title = document.getElementById('announcement-title').value;
        const content = document.getElementById('announcement-content').value;
        const date = document.getElementById('announcement-date').value;

        try {
            await db.collection('announcements').add({
                title,
                content,
                date,
                createdAt: firebase.firestore.FieldValue.serverTimestamp() 
            });
            alert('Announcement successfully published!');
            announcementForm.reset();
        } catch (e) {
            console.error("Error adding document: ", e);
            alert('An error occurred while publishing the announcement. Please try again.');
        }
    });
}


// =========================================================
// === NAVIGATION & UI LOGIC ===
// =========================================================

function handleNavigation() {
    let targetId = window.location.hash.substring(1); 
    
    if (!targetId || !document.getElementById(targetId)) {
        targetId = 'profile'; 
    }

    // 1. Deactivate all sections and links
    document.querySelectorAll('.portal-section').forEach(section => {
        section.classList.remove('active-section');
    });
    document.querySelectorAll('.sidebar ul li a, .sidebar ul li ul li a').forEach(link => {
        link.classList.remove('active');
    });

    // 2. Activate the target section and link
    const targetSection = document.getElementById(targetId);
    const targetLink = document.querySelector(`.sidebar a[href="#${targetId}"]`);

    if (targetSection) {
        targetSection.classList.add('active-section');
    }
    if (targetLink) {
        targetLink.classList.add('active');
        const parentUL = targetLink.closest('ul.sub-menu');
        if (parentUL) {
            const groupTitleLink = parentUL.closest('li').querySelector('.group-title');
            if (groupTitleLink) {
                 groupTitleLink.classList.add('active');
            }
        }
    }

    // 3. Load data for specific sections
    if (targetId === 'sams-applications') { 
        loadSamsRegistrations();
    } 
    
    // LOGIC FOR LEARNER MANAGEMENT SYSTEM (MAIN LIST)
    if (targetId === 'sams-learners') {
        document.getElementById('all-learners-list-view').style.display = selectedLearnerData ? 'none' : 'block';
        document.getElementById('learner-details-display').style.display = selectedLearnerData ? 'block' : 'none';
        document.getElementById('assignment-details-display').style.display = 'none'; 
        
        if (!selectedLearnerData) {
            const gradeFilter = document.getElementById('grade-filter');
            const selectedGrade = gradeFilter ? gradeFilter.value : 'All';
            loadAllActiveLearners(selectedGrade);
        } else {
            displayLearnerDetails(selectedLearnerData);
        }
    }
    
    // LOGIC FOR GRADE ASSIGNMENT TOOL (UPDATED)
    if (targetId === 'grade-assignment') {
        document.getElementById('all-learners-list-view').style.display = 'none';

        const unassignedList = document.getElementById('unassigned-learners-list');
        const assignedList = document.getElementById('assigned-learners-list');
        const detailContainer = document.getElementById('assignment-details-display');
        const viewUnassignedBtn = document.getElementById('view-unassigned-btn');
        const viewAssignedBtn = document.getElementById('view-assigned-btn');


        if (selectedLearnerData) {
            // Show detail view
            unassignedList.style.display = 'none';
            assignedList.style.display = 'none';
            detailContainer.style.display = 'block';
            displayLearnerAssignmentTool(selectedLearnerData);
        } else {
            // Show the selected list view
            detailContainer.style.display = 'none';
            
            const isUnassignedActive = viewUnassignedBtn && viewUnassignedBtn.classList.contains('active-view');
            
            if (isUnassignedActive) {
                unassignedList.style.display = 'block';
                assignedList.style.display = 'none';
                const gradeFilter = document.getElementById('assignment-grade-filter');
                const selectedGrade = gradeFilter ? gradeFilter.value : 'All';
                loadUnassignedLearners(selectedGrade);
            } else {
                assignedList.style.display = 'block';
                unassignedList.style.display = 'none';
                const assignedGradeFilter = document.getElementById('assigned-grade-filter');
                const selectedGrade = assignedGradeFilter ? assignedGradeFilter.value : 'All';
                loadAssignedLearners(selectedGrade);
            }
        }
    }

    if (targetId === 'sams-educators') {
        console.log("Loading Educator Management System...");
    }
}

window.addEventListener('hashchange', handleNavigation);


/**
 * Helper function used by both tables to store data and transition to the detail view
 * @param {Object} data The learner data object.
 * @param {string} targetId The target section hash ('sams-learners' or 'grade-assignment').
 */
function showSamsDetails(data, targetId) {
    selectedLearnerData = { ...data }; 
    window.location.hash = `#${targetId}`;
    handleNavigation(); 
}


// =========================================================
// === SA-SAMS MANAGEMENT FUNCTIONS (ACCEPTED APPLICATIONS) ===
// =========================================================

async function loadSamsRegistrations() {
    const tableBody = document.querySelector('#sams-data-table tbody');
    const statusMessage = document.getElementById('sams-data-status');
    
    tableBody.innerHTML = '';
    statusMessage.textContent = 'Fetching accepted applications...';
    
    const uniqueApplications = new Set();
    let applicationCount = 0;

    try {
        const snapshot = await db.collection('sams_registrations').get();

        if (snapshot.empty) {
            statusMessage.textContent = 'No accepted applications found yet.';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            if (!admissionId || uniqueApplications.has(admissionId)) {
                return;
            }
            uniqueApplications.add(admissionId);

            const row = tableBody.insertRow();
            
            let importedDate = 'N/A';
            if (data.importedAt && typeof data.importedAt.toDate === 'function') {
                importedDate = data.importedAt.toDate().toLocaleDateString();
            } else if (data.importedAt) {
                importedDate = new Date(data.importedAt).toLocaleDateString();
            }

            row.insertCell().textContent = admissionId;
            row.insertCell().textContent = `${data.learnerName} ${data.learnerSurname}`;
            row.insertCell().textContent = data.fullGradeSection || data.grade; 
            row.insertCell().textContent = data.parent1Email;
            row.insertCell().textContent = importedDate;
            
            const actionCell = row.insertCell();
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View Details';
            viewButton.className = 'cta-button-small'; 
            
            viewButton.onclick = () => showSamsDetails(data, 'sams-learners');
            actionCell.appendChild(viewButton);

            applicationCount++;
        });

        statusMessage.textContent = `Successfully loaded ${applicationCount} accepted application(s).`;
        
    } catch (error) {
        console.error("Error loading SA-SAMS data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}


// =========================================================
// === LEARNER MANAGEMENT SYSTEM (LMS) DISPLAY FUNCTIONS ===
// =========================================================

/**
 * Displays the detailed information for the selected learner (Summary View).
 */
function displayLearnerDetails(data) {
    const detailsContainer = document.getElementById('learner-details-display');
    const allLearnersList = document.getElementById('all-learners-list-view');
    
    allLearnersList.style.display = 'none';
    detailsContainer.style.display = 'block';

    if (!data) {
        detailsContainer.innerHTML = '<p>No learner data found. Please select a learner.</p>';
        return;
    }
    
    const dobDate = data.learnerDOB ? new Date(data.learnerDOB).toLocaleDateString() : 'N/A';
    const currentSection = data.section || 'Unassigned';
    const currentFullGrade = data.fullGradeSection || `${data.grade} (${currentSection})`;
    
    const contentHTML = `
        <button id="back-to-learner-list-main" class="cta-button-secondary" style="margin-bottom: 15px;">
            ← Back to All Active Learners List
        </button>
        <h3>Learner Profile: ${data.learnerName} ${data.learnerSurname} (LMS View)</h3>
        <p><strong>Admission No:</strong> ${data.admissionId}</p>
        <p><strong>Initial Grade:</strong> ${data.grade}</p>
        <p><strong>Current Class Assignment:</strong> <span style="font-weight: bold; color: ${currentSection === 'Unassigned' ? 'var(--primary-red)' : 'var(--primary-green)'};">${currentFullGrade}</span></p>
        <p><strong>ID Number:</strong> ${data.learnerID || 'N/A'}</p>
        <p><strong>Date of Birth:</strong> ${dobDate}</p>
        <hr>

        <h3>Parent/Guardian details: </h3>
        <p><strong>Parent Name:</strong> ${data.parent1Name}</p>
        <p><strong>Parent Email:</strong> ${data.parent1Email}</p>
        <p><strong>Parent Contac:</strong> ${data.parent1Contact || 'N/A'}</p>
        
        <button class="cta-button" style="margin-top: 20px;">Open Full Learner Record (Coming Soon)</button>
    `;

    detailsContainer.innerHTML = contentHTML;
    
    const backButton = document.getElementById('back-to-learner-list-main');
    if (backButton) {
        backButton.addEventListener('click', () => {
            selectedLearnerData = null; 
            window.location.hash = `#sams-learners`; 
            handleNavigation(); 
        });
    }
}


// =========================================================
// === GRADE ASSIGNMENT TOOL FUNCTIONS ===
// =========================================================

/**
 * Displays the assignment form for the selected learner.
 */
function displayLearnerAssignmentTool(data) {
    const container = document.getElementById('assignment-details-display');
    const listContainer = document.getElementById('unassigned-learners-list');
    const assignedListContainer = document.getElementById('assigned-learners-list'); // Added
    
    listContainer.style.display = 'none';
    assignedListContainer.style.display = 'none'; // Added
    container.style.display = 'block';

    if (!data) {
        container.innerHTML = '<p>No learner data found. Please select a learner.</p>';
        return;
    }
    
    const currentSection = data.section || 'Unassigned';
    const currentFullGrade = data.fullGradeSection || `${data.grade} (${currentSection})`;

    const contentHTML = `
        <button id="back-to-assignment-list" class="cta-button-secondary" style="margin-bottom: 15px;">
            ← Back to Class Assignment Lists
        </button>
        <h3>Assign Class for: ${data.learnerName} ${data.learnerSurname}</h3>
        <p><strong>Admission No:</strong> ${data.admissionId}</p>
        <p><strong>Grade Level:</strong> ${data.grade}</p>
        <p><strong>Current Assignment:</strong> <span id="current-section-display" style="font-weight: bold; color: ${currentSection === 'Unassigned' ? 'var(--primary-red)' : 'var(--primary-green)'};">${currentFullGrade}</span></p>
        <hr>
        
        <h3>Class Section Assignment</h3>
        <div id="section-assignment-form" style="display: flex; gap: 10px; align-items: flex-end; margin-bottom: 20px;">
            <div class="form-group" style="margin-bottom: 0;">
                <label for="new-section">Section (e.g., A, B, C):</label>
                <input type="text" id="new-section" placeholder="e.g. A" value="${currentSection === 'Unassigned' ? '' : currentSection}" style="width: 80px; text-transform: uppercase;" maxlength="2">
            </div>
            <button id="assign-section-button" class="cta-button-small" style="margin-top: 0;">
                Assign/Update Class
            </button>
        </div>
    `;

    container.innerHTML = contentHTML;
    
    // 1. Back Button Listener
    const backButton = document.getElementById('back-to-assignment-list');
    if (backButton) {
        backButton.addEventListener('click', () => {
            selectedLearnerData = null; 
            window.location.hash = `#grade-assignment`; 
            handleNavigation(); 
        });
    }

    // 2. Section Assignment Listener
    const assignButton = document.getElementById('assign-section-button');
    if (assignButton) {
        assignButton.addEventListener('click', () => {
            const newSectionInput = document.getElementById('new-section');
            const newSection = newSectionInput.value.trim().toUpperCase();
            
            if (newSection && /^[A-Z0-9]{1,2}$/.test(newSection)) { 
                setLearnerSection(data.admissionId, data.grade, newSection);
            } else {
                alert("Please enter a valid section (e.g., A, B, C, or 1, 2).");
                newSectionInput.focus();
            }
        });
    }
}


/**
 * Queries Firebase for learners that are MISSING the 'section' field (or where it is 'Unassigned').
 */
async function loadUnassignedLearners(filterGrade = 'All') {
    const tableBody = document.querySelector('#unassigned-learners-table tbody');
    const statusMessage = document.getElementById('unassigned-learners-status');
    const listContainer = document.getElementById('unassigned-learners-list');
    
    // Only manage state if this is the active view
    if(listContainer.style.display !== 'block') return;

    tableBody.innerHTML = '';
    statusMessage.textContent = `Fetching unassigned learners for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}...`;
    
    let learnerCount = 0;
    
    try {
        let query = db.collection('sams_registrations').limit(50);
        let snapshot = await query.get();
        let learnersData = [];
        const uniqueLearners = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            // Filter for learners that are truly unassigned or missing the field
            const isUnassigned = data.section === 'Unassigned' || !data.section || data.section.trim() === '';
            
            if (!uniqueLearners.has(admissionId) && isUnassigned) {
                learnersData.push(data);
                uniqueLearners.add(admissionId);
            }
        });

        const filteredLearners = learnersData.filter(data => {
            if (filterGrade === 'All') return true;
            
            let gradeValue = (filterGrade === 'R') ? 'R' : parseInt(filterGrade, 10);
            return data.grade === gradeValue || String(data.grade) === filterGrade;
        });


        if (filteredLearners.length === 0) {
            statusMessage.textContent = `No unassigned learners found for Grade ${filterGrade}.`;
            return;
        }
        
        filteredLearners.forEach(data => {
            const row = tableBody.insertRow();
            
            row.insertCell().textContent = data.admissionId;
            row.insertCell().textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
            row.insertCell().textContent = data.grade; 
            
            const actionCell = row.insertCell();
            const assignButton = document.createElement('button');
            assignButton.textContent = 'Assign Class';
            assignButton.className = 'cta-button-small'; 
            
            assignButton.onclick = () => {
                showSamsDetails(data, 'grade-assignment'); 
            }
            actionCell.appendChild(assignButton);

            learnerCount++;
        });

        statusMessage.textContent = `Found ${learnerCount} learner(s) awaiting class assignment for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}.`;
        
    } catch (error) {
        console.error("Error loading Unassigned Learners data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}


/**
 * Queries Firebase for learners that HAVE the 'section' field set (not 'Unassigned', null, or empty).
 * (NEW FUNCTION)
 * @param {string} filterGrade The grade to filter by (e.g., 'R', '1', 'All').
 */
async function loadAssignedLearners(filterGrade = 'All') {
    const tableBody = document.querySelector('#assigned-learners-table tbody');
    const statusMessage = document.getElementById('assigned-learners-status');
    const listContainer = document.getElementById('assigned-learners-list');
    
    // Only manage state if this is the active view
    if(listContainer.style.display !== 'block') return;

    tableBody.innerHTML = '';
    statusMessage.textContent = `Fetching assigned learners for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}...`;
    
    let learnerCount = 0;
    
    try {
        let query = db.collection('sams_registrations').limit(100); 
        const uniqueLearners = new Set();
        let learnersData = [];
        
        const snapshot = await query.get();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            // Filter for documents that have a 'section' field AND it's not 'Unassigned'.
            const isAssigned = data.section && data.section.trim() !== '' && data.section !== 'Unassigned';

            if (!uniqueLearners.has(admissionId) && isAssigned) {
                learnersData.push(data);
                uniqueLearners.add(admissionId);
            }
        });

        // Apply grade filter to the combined data
        const filteredLearners = learnersData.filter(data => {
            if (filterGrade === 'All') return true;
            
            let gradeValue = (filterGrade === 'R') ? 'R' : parseInt(filterGrade, 10);
            return data.grade === gradeValue || String(data.grade) === filterGrade;
        });


        if (filteredLearners.length === 0) {
            statusMessage.textContent = `No assigned learners found for Grade ${filterGrade}.`;
            return;
        }
        
        filteredLearners.forEach(data => {
            const row = tableBody.insertRow();
            
            row.insertCell().textContent = data.admissionId;
            row.insertCell().textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
            row.insertCell().textContent = data.fullGradeSection || data.grade; 
            
            const actionCell = row.insertCell();
            const viewButton = document.createElement('button');
            viewButton.textContent = 'Re-Assign Class';
            viewButton.className = 'cta-button-small'; 
            
            viewButton.onclick = () => {
                showSamsDetails(data, 'grade-assignment'); 
            }
            actionCell.appendChild(viewButton);

            learnerCount++;
        });

        statusMessage.textContent = `Found ${learnerCount} active assigned learner(s) for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}.`;
        
    } catch (error) {
        console.error("Error loading Assigned Learners data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}


/**
 * Updates the learner's document with the assigned section and the combined fullGradeSection.
 */
async function setLearnerSection(admissionId, grade, newSection) {
    const fullGradeSection = `${grade}${newSection}`;
    
    if (!confirm(`Are you sure you want to assign this learner to class ${fullGradeSection}? This will be the class displayed to teachers.`)) {
        return;
    }

    try {
        const snapshot = await db.collection('sams_registrations')
            .where('admissionId', '==', admissionId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            alert("Error: Learner document not found in database.");
            return;
        }

        const docRef = snapshot.docs[0].ref;
        
        await docRef.update({
            section: newSection,
            fullGradeSection: fullGradeSection
        });

        // 1. Update the global data object to reflect the new assignment
        if (selectedLearnerData && selectedLearnerData.admissionId === admissionId) {
            selectedLearnerData.section = newSection;
            selectedLearnerData.fullGradeSection = fullGradeSection;
        }

        // 2. Update the UI elements in the current detail view
        const displayElement = document.getElementById('current-section-display');
        const assignButton = document.getElementById('assign-section-button');

        if (displayElement) {
            displayElement.textContent = fullGradeSection;
            displayElement.style.color = 'var(--primary-green)';
        }
        
        alert(`Learner successfully assigned/updated to class ${fullGradeSection}! Use the 'Back' button to refresh the lists.`);
        
        // 3. Update button state to indicate success and prevent immediate re-submission
        if (assignButton) {
            assignButton.textContent = 'Assignment Confirmed';
            assignButton.disabled = true;
        }

    } catch (error) {
        console.error("Error updating learner section:", error);
        alert("An error occurred while assigning the section. Please try again.");
    }
}

// ... (loadAllActiveLearners remains the same)
async function loadAllActiveLearners(filterGrade = 'All') {
    const tableContainer = document.getElementById('all-active-learners-list');
    const tableBody = document.querySelector('#active-learners-table tbody');
    const statusMessage = document.getElementById('active-learners-status');
    const detailsContainer = document.getElementById('learner-details-display');
    
    detailsContainer.style.display = 'none';
    tableContainer.style.display = 'block'; 
    
    tableBody.innerHTML = '';
    statusMessage.textContent = `Fetching active learners for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}...`;
    
    const uniqueLearners = new Set();
    let learnerCount = 0;
    
    try {
        let query = db.collection('sams_registrations');
        
        if (filterGrade !== 'All') {
            let gradeValue;
            if (filterGrade === 'R') {
                gradeValue = 'R'; 
            } else {
                gradeValue = parseInt(filterGrade, 10); 
            }

            query = query.where('grade', '==', gradeValue);
        }

        const snapshot = await query.get(); 

        if (snapshot.empty) {
            statusMessage.textContent = `No active learners found for Grade ${filterGrade}.`;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            if (!admissionId || uniqueLearners.has(admissionId)) {
                return;
            }
            uniqueLearners.add(admissionId);
            
            const row = tableBody.insertRow();
            
            row.insertCell().textContent = admissionId;
            row.insertCell().textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
            row.insertCell().textContent = data.fullGradeSection || data.grade; 
            
            const actionCell = row.insertCell();
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View Details';
            viewButton.className = 'cta-button-small'; 
            
            viewButton.onclick = () => {
                showSamsDetails(data, 'sams-learners'); 
            }
            actionCell.appendChild(viewButton);

            learnerCount++;
        });

        statusMessage.textContent = `Successfully loaded ${learnerCount} active learner(s) for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}.`;
        
    } catch (error) {
        console.error("Error loading All Active Learners data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}


// =========================================================
// === PROFILE LOADING & INITIALIZATION ===
// =========================================================

function loadAdminProfile() {
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));

    if (userData) {
        document.querySelector('#profile .profile-details p:nth-child(1)').innerHTML = `<strong>Name:</strong> ${userData.preferredName || 'Admin'} ${userData.surname || 'User'}`;
        document.querySelector('#profile .profile-details p:nth-child(2)').innerHTML = `<strong>Role:</strong> Admin`; 
        document.querySelector('#profile .profile-details p:nth-child(3)').innerHTML = `<strong>Email:</strong> ${userData.email || 'N/A'}`;
    } else {
        console.error("User data not found in session storage. Please log in again.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAdminProfile();
    handleNavigation(); 
    
    // Event listener for the main LMS list filter
    const gradeFilter = document.getElementById('grade-filter');
    if (gradeFilter) {
        gradeFilter.addEventListener('change', (e) => {
            selectedLearnerData = null; 
            loadAllActiveLearners(e.target.value);
        });
    }

    // Event listener for the Assignment Tool filter (Unassigned)
    const assignmentGradeFilter = document.getElementById('assignment-grade-filter');
    if (assignmentGradeFilter) {
        assignmentGradeFilter.addEventListener('change', (e) => {
            selectedLearnerData = null;
            loadUnassignedLearners(e.target.value);
        });
    }

    // --- NEW: Assignment View Switcher Listeners ---
    const viewUnassignedBtn = document.getElementById('view-unassigned-btn');
    const viewAssignedBtn = document.getElementById('view-assigned-btn');
    const assignedGradeFilter = document.getElementById('assigned-grade-filter');

    const switchView = (targetView) => {
        selectedLearnerData = null; 
        viewUnassignedBtn.classList.remove('active-view');
        viewAssignedBtn.classList.remove('active-view');
        
        if (targetView === 'unassigned') {
            viewUnassignedBtn.classList.add('active-view');
        } else {
            viewAssignedBtn.classList.add('active-view');
        }
        // Force navigation handler to load the correct list and state
        handleNavigation(); 
    };
    
    if (viewUnassignedBtn) {
        viewUnassignedBtn.addEventListener('click', () => switchView('unassigned'));
    }
    if (viewAssignedBtn) {
        viewAssignedBtn.addEventListener('click', () => switchView('assigned'));
    }
    
    // Event listener for the Assigned Learners list filter (NEW)
    if (assignedGradeFilter) {
        assignedGradeFilter.addEventListener('change', (e) => {
            selectedLearnerData = null;
            loadAssignedLearners(e.target.value);
        });
    }
});