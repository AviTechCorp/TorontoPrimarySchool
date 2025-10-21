// scripts/ui-handlers.js

// NOTE: This script relies on global variables and all data functions
// (e.g., db, auth, selectedLearnerData, selectedTeacherData, loadAllActiveLearners, loadAllTeachers, 
// updateLearnerDetails, assignTeacherGrade, handleNavigation) 
// being defined in firebase-config.js and data-functions.js.

// Assume global state variables are defined (e.g., selectedTeacherData = null; activeAssignmentView = 'unassigned';)

// =========================================================
// === LEARNER KEBAB MENU GENERATION AND HANDLERS ===
// =========================================================

/**
 * Creates the HTML structure for the Learner Kebab Menu (⋮).
 * @param {Object} data The learner data.
 * @returns {HTMLElement} The container div for the menu.
 */
function createKebabMenu(data) {
    const menuContainer = document.createElement('div');
    menuContainer.className = 'kebab-menu-container';

    const button = document.createElement('button');
    button.className = 'kebab-menu-btn';
    button.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
    // Set explicit black color as requested
    button.style.color = '#000000'; 

    const dropdown = document.createElement('div');
    dropdown.className = 'kebab-menu-dropdown';
    
    // Option 1: View Details 
    const viewOption = document.createElement('a');
    viewOption.textContent = 'View Details';
    viewOption.href = '#';
    viewOption.addEventListener('click', (e) => {
        e.preventDefault();
        showSamsDetails(data, 'sams-learners'); // Navigate to the LMS detail view
        menuContainer.classList.remove('active');
    });

    // Option 2: Edit Learner Info 
    const editOption = document.createElement('a');
    editOption.textContent = 'Edit Learner Info';
    editOption.href = '#';
    editOption.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToEditForm(data); 
        menuContainer.classList.remove('active');
    });

    // Option 3: Remove Learner 
    const removeOption = document.createElement('a');
    removeOption.textContent = 'Remove Learner';
    removeOption.className = 'menu-option-red';
    removeOption.href = '#';
    removeOption.addEventListener('click', (e) => {
        e.preventDefault();
        menuContainer.classList.remove('active');
        confirmAndRemoveLearner(data);
    });

    dropdown.appendChild(viewOption);
    dropdown.appendChild(editOption);
    dropdown.appendChild(removeOption);
    
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        
        document.querySelectorAll('.kebab-menu-container.active').forEach(openMenu => {
            if (openMenu !== menuContainer) {
                openMenu.classList.remove('active');
            }
        });
        menuContainer.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!menuContainer.contains(e.target) && menuContainer.classList.contains('active')) {
            menuContainer.classList.remove('active');
        }
    });

    menuContainer.appendChild(button);
    menuContainer.appendChild(dropdown);
    return menuContainer;
}

// =========================================================
// === TEACHER KEBAB MENU GENERATION AND HANDLERS ===
// =========================================================

/**
 * Creates the HTML structure for the Teacher Kebab Menu (⋮).
 * @param {Object} data The teacher data.
 * @returns {HTMLElement} The container div for the menu.
 */
function createTeacherKebabMenu(data) {
    const menuContainer = document.createElement('div');
    menuContainer.className = 'kebab-menu-container';

    const button = document.createElement('button');
    button.className = 'kebab-menu-btn';
    button.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
    button.style.color = '#000000'; 

    const dropdown = document.createElement('div');
    dropdown.className = 'kebab-menu-dropdown';
    
    // Option 1: View Profile 
    const viewOption = document.createElement('a');
    viewOption.textContent = 'View Profile';
    viewOption.href = '#';
    viewOption.addEventListener('click', (e) => {
        e.preventDefault();
        showTeacherDetails(data); 
        menuContainer.classList.remove('active');
    });

    // Option 2: Edit Teacher Info
    const editOption = document.createElement('a');
    editOption.textContent = 'Edit Teacher Info';
    editOption.href = '#';
    editOption.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToEditTeacherForm(data); 
        menuContainer.classList.remove('active');
    });

    // Option 3: Reset Password (Placeholder)
    const resetPasswordOption = document.createElement('a');
    resetPasswordOption.textContent = 'Reset Password';
    resetPasswordOption.className = 'menu-option-secondary';
    resetPasswordOption.href = '#';
    resetPasswordOption.addEventListener('click', (e) => {
        e.preventDefault();
        menuContainer.classList.remove('active');
        // Placeholder for actual reset logic
        alert(`Reset password link sent to: ${data.email}`);
    });

    dropdown.appendChild(viewOption);
    dropdown.appendChild(editOption);
    dropdown.appendChild(resetPasswordOption);
    
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        
        document.querySelectorAll('.kebab-menu-container.active').forEach(openMenu => {
            if (openMenu !== menuContainer) {
                openMenu.classList.remove('active');
            }
        });
        menuContainer.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!menuContainer.contains(e.target) && menuContainer.classList.contains('active')) {
            menuContainer.classList.remove('active');
        }
    });

    menuContainer.appendChild(button);
    menuContainer.appendChild(dropdown);
    return menuContainer;
}

// =========================================================
// === NAVIGATION & UI LOGIC ===
// =========================================================

/**
 * Helper function used by tables to store learner data and transition to the LMS detail view
 */
function showSamsDetails(data, targetId) {
    selectedLearnerData = { ...data }; 
    window.location.hash = `#${targetId}`;
    handleNavigation(); 
}

/**
 * Stores learner data globally and triggers navigation to the learner edit form.
 * @param {Object} data - The learner data object.
 */
function navigateToEditForm(data) {
    selectedLearnerData = { ...data }; // Store the data globally
    window.location.hash = `#edit-learner-profile`; // Navigate to the new section
    handleNavigation(); 
}

/**
 * Helper function used by teacher tables to store teacher data and show details
 */
function showTeacherDetails(data) {
    selectedTeacherData = { ...data }; 
    window.location.hash = `#teacher-details`; // Assuming a new section ID for details
    handleNavigation();
}

/**
 * Stores teacher data globally and triggers navigation to the teacher edit form.
 * @param {Object} data - The teacher data object.
 */
function navigateToEditTeacherForm(data) {
    selectedTeacherData = { ...data }; // Store the data globally
    window.location.hash = `#edit-teacher-profile`; // Assuming a new section ID for teacher edit
    handleNavigation();
}

/**
 * Handles all internal portal navigation by toggling section visibility and loading data.
 */
function handleNavigation() {
    let targetId = window.location.hash.substring(1); 
    
    // Define a default and check for a valid section ID
    if (!targetId || !document.getElementById(targetId)) {
        targetId = 'profile'; 
    }

    // Reset pagination and state if leaving detail/assignment/management views
    if (!['grade-assignment', 'sams-learners', 'edit-learner-profile', 'teacher-management', 'edit-teacher-profile', 'teacher-details'].includes(targetId)) {
        lastVisibleUnassigned = null;
        lastVisibleAssigned = null;
        lastVisibleAll = null;
        lastVisibleTeachers = null; 
        selectedLearnerData = null;
        selectedTeacherData = null; 
    }
    
    // Deactivate all sections and links
    document.querySelectorAll('.portal-section').forEach(section => {
        section.classList.remove('active-section');
    });
    document.querySelectorAll('.sidebar ul li a, .sidebar ul li ul li a').forEach(link => {
        link.classList.remove('active');
    });

    // Activate the current section and link
    const targetSection = document.getElementById(targetId);
    const targetLink = document.querySelector(`.sidebar a[href="#${targetId}"]`);

    if (targetSection) {
        targetSection.classList.add('active-section');
    }
    if (targetLink) {
        targetLink.classList.add('active');
        // Activate parent group title if it's a sub-menu item
        const parentUL = targetLink.closest('ul.sub-menu');
        if (parentUL) {
            const groupTitleLink = parentUL.closest('li').querySelector('.group-title');
            if (groupTitleLink) {
                groupTitleLink.classList.add('active');
            }
        }
    }

    // --- Data Loading and View Toggling Logic ---
    
    if (targetId === 'sams-applications') { 
        selectedLearnerData = null; 
        loadSamsRegistrations(); 
    } 
    
    if (targetId === 'sams-learners') {
        const listContainer = document.getElementById('all-learners-list-view');
        const detailsContainer = document.getElementById('learner-details-display');
        
        // Hide temporary forms
        const addFormSection = document.getElementById('add-learner-form-section');
        const removeSection = document.getElementById('remove-learner-section');
        if (addFormSection) addFormSection.style.display = 'none';
        if (removeSection) removeSection.style.display = 'none';

        if (!selectedLearnerData) {
            listContainer.style.display = 'block';
            detailsContainer.style.display = 'none';
            
            // Reload list if it was a detail view or if pagination reset
            if (lastVisibleAll === null || listContainer.style.display === 'block') { 
                const gradeFilter = document.getElementById('grade-filter');
                const selectedGrade = gradeFilter ? gradeFilter.value : 'All';
                loadAllActiveLearners(selectedGrade, true); 
            }
        } else {
            listContainer.style.display = 'none';
            detailsContainer.style.display = 'block';
            displayLearnerDetails(selectedLearnerData); 
        }
        document.getElementById('assignment-details-display').style.display = 'none'; 
    }
    
    if (targetId === 'grade-assignment') {
        document.getElementById('all-learners-list-view').style.display = 'none';
        document.getElementById('learner-details-display').style.display = 'none';

        const detailContainer = document.getElementById('assignment-details-display');

        if (selectedLearnerData) {
            document.getElementById('unassigned-learners-list').style.display = 'none';
            document.getElementById('assigned-learners-list').style.display = 'none';
            detailContainer.style.display = 'block';
            displayLearnerAssignmentTool(selectedLearnerData);
        } else {
            detailContainer.style.display = 'none';
            loadAssignmentToolLists(activeAssignmentView); 
        }
    }

    if (targetId === 'edit-learner-profile') { 
        document.getElementById('all-learners-list-view').style.display = 'none';
        document.getElementById('learner-details-display').style.display = 'none';
        document.getElementById('assignment-details-display').style.display = 'none';
        
        showEditLearnerForm(); 
    }
    
    // EMS Teacher Management Handler
    if (targetId === 'teacher-management') {
        const listContainer = document.getElementById('teachers-data-table').closest('.tool-card'); 
        const detailsContainer = document.getElementById('teacher-details-display'); 
        
        if (listContainer) listContainer.style.display = 'block';
        if (detailsContainer) detailsContainer.style.display = 'none';

        if (lastVisibleTeachers === null) {
            loadAllTeachers(true); 
        }
    }

    // Teacher Details View
    if (targetId === 'teacher-details') {
        const listContainer = document.getElementById('teachers-data-table').closest('.tool-card'); 
        if (listContainer) listContainer.style.display = 'none';
        
        const detailsContainer = document.getElementById('teacher-details-display');
        if (detailsContainer) {
            detailsContainer.style.display = 'block';
            displayTeacherDetails(selectedTeacherData); 
        }
    }
    
    // Teacher Edit View
    if (targetId === 'edit-teacher-profile') {
        const listContainer = document.getElementById('teachers-data-table').closest('.tool-card'); 
        if (listContainer) listContainer.style.display = 'none';
        
        document.getElementById('teacher-details-display').style.display = 'none';
        showEditTeacherForm(); 
    }
}


// =========================================================
// === LEARNER MANAGEMENT SYSTEM (LMS) DISPLAY FUNCTIONS ===
// =========================================================

function displayLearnerDetails(data) {
    const detailsContainer = document.getElementById('learner-details-display');
    const allLearnersList = document.getElementById('all-learners-list-view');
    
    allLearnersList.style.display = 'none';
    detailsContainer.style.display = 'block';

    if (!data) {
        detailsContainer.innerHTML = '<p>No learner data found. Please select a learner.</p>';
        return;
    }
    
    let dobDate = 'N/A';
    if (data.learnerDOB) {
        if (typeof data.learnerDOB.toDate === 'function') {
            dobDate = data.learnerDOB.toDate().toLocaleDateString();
        } else if (typeof data.learnerDOB === 'string') {
             try {
                dobDate = new Date(data.learnerDOB).toLocaleDateString();
            } catch (e) {
                dobDate = data.learnerDOB; 
            }
        }
    }
    
    const currentSection = data.section || ''; 
    const currentFullGrade = data.fullGradeSection || (currentSection ? `${data.grade}${currentSection}` : `${data.grade} (Unassigned)`);
    
    const contentHTML = `
        <button id="back-to-learner-list-main" class="cta-button-secondary" style="margin-bottom: 15px;">
            ← Back to All Active Learners List
        </button>
        <h3>Learner Profile: ${data.learnerName} ${data.learnerSurname} (LMS View)</h3>
        <p><strong>Admission No:</strong> ${data.admissionId}</p>
        <p><strong>Initial Grade:</strong> ${data.grade}</p>
        <p><strong>Current Class Assignment:</strong> <span style="font-weight: bold; color: ${!currentSection ? 'var(--primary-red)' : 'var(--primary-green)'};">${currentFullGrade}</span></p>
        <p><strong>ID Number:</strong> ${data.learnerID || 'N/A'}</p>
        <p><strong>Date of Birth:</strong> ${dobDate}</p>
        <hr>

        <h3>Parent/Guardian details: </h3>
        <p><strong>Parent Name:</strong> ${data.parent1Name || 'N/A'}</p>
        <p><strong>Parent Email:</strong> ${data.parent1Email || 'N/A'}</p>
        <p><strong>Parent Contact:</strong> ${data.parent1Contact || 'N/A'}</p>
        
        <button id="edit-details-btn" class="cta-button" style="margin-top: 20px;">
            <i class="fas fa-edit"></i> Edit Learner Details
        </button>
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

    const editButton = document.getElementById('edit-details-btn');
    if (editButton) {
        editButton.addEventListener('click', () => {
            navigateToEditForm(data); // Navigate to the edit form on button click
        });
    }
}

/**
 * Displays the learner edit form and populates it with the selected learner's data.
 */
function showEditLearnerForm() {
    const container = document.getElementById('edit-learner-profile');
    
    if (!selectedLearnerData) {
        container.innerHTML = '<p class="data-status-message error">Error: No learner selected for editing. Return to the list view.</p>';
        return;
    }

    const data = selectedLearnerData;
    
    let dobValue = '';
    if (data.learnerDOB) {
        if (typeof data.learnerDOB.toDate === 'function') {
            dobValue = data.learnerDOB.toDate().toISOString().split('T')[0];
        } else if (typeof data.learnerDOB === 'string' && data.learnerDOB.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dobValue = data.learnerDOB;
        }
    }
    
    const currentFullGrade = data.fullGradeSection || (data.section ? `${data.grade}${data.section}` : `${data.grade} (Unassigned)`);

    container.innerHTML = `
        <button id="back-to-learner-list-edit" class="cta-button-secondary" style="margin-bottom: 25px;">
            ← Back to All Active Learners List
        </button>

        <h2>Editing Profile: ${data.learnerName || ''} ${data.learnerSurname || ''}</h2>
        <p class="data-status-message">Admission ID: ${data.admissionId} | Current Class: ${currentFullGrade}</p>
        
        <form id="learner-edit-form">
            <div class="grid-container" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
                <div class="form-group">
                    <label for="edit-name">First Name</label>
                    <input type="text" id="edit-name" value="${data.learnerName || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-surname">Last Name</label>
                    <input type="text" id="edit-surname" value="${data.learnerSurname || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-grade">Grade (R/1-7)</label>
                    <input type="text" id="edit-grade" value="${data.grade || ''}" maxlength="1" required style="text-transform: uppercase;">
                </div>
                <div class="form-group">
                    <label for="edit-dob">Date of Birth</label>
                    <input type="date" id="edit-dob" value="${dobValue}">
                </div>
            </div>
            
            <h3 style="margin-top: 30px; margin-bottom: 15px;">Parent/Guardian Information</h3>
            <div class="grid-container" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
                <div class="form-group">
                    <label for="edit-parent-name">Parent Name</label>
                    <input type="text" id="edit-parent-name" value="${data.parent1Name || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-parent-email">Parent Email</label>
                    <input type="text" id="edit-parent-email" value="${data.parent1Email || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-parent-contact">Parent Contact No.</label>
                    <input type="text" id="edit-parent-contact" value="${data.parent1Contact || ''}">
                </div>
            </div>

            <p id="edit-status-message" class="status-message" style="display: none;"></p>
            <button type="submit" class="cta-button">
                <i class="fas fa-save"></i> Save Changes
            </button>
            <button type="button" id="cancel-edit-btn" class="cta-button-secondary" style="margin-left: 10px; margin-top: 15px;">
                Cancel
            </button>
        </form>
    `;
    
    // Attach event listeners after rendering the form
    document.getElementById('back-to-learner-list-edit').addEventListener('click', () => {
        selectedLearnerData = null; 
        window.location.hash = `#sams-learners`; 
        handleNavigation(); 
    });
    
    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        // Go back to the learner's detail view
        window.location.hash = `#sams-learners`; 
        handleNavigation(); 
    });

    document.getElementById('learner-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        updateLearnerDetails(data.admissionId); 
    });
}

// =========================================================
// === EMS TEACHER DISPLAY FUNCTIONS ===
// =========================================================

/**
 * Displays the full teacher profile details.
 */
function displayTeacherDetails(data) {
    const container = document.getElementById('teacher-details-display');
    const listContainer = document.getElementById('teachers-data-table').closest('.tool-card'); 
    
    if (listContainer) listContainer.style.display = 'none';
    container.style.display = 'block';

    if (!data) {
        container.innerHTML = '<p>No teacher data found. Please select a teacher.</p>';
        return;
    }
    
    const contentHTML = `
        <button id="back-to-teacher-list" class="cta-button-secondary" style="margin-bottom: 15px;">
            ← Back to Teacher Profiles List
        </button>
        <h3>Teacher Profile: ${data.preferredName || data.name} ${data.surname}</h3>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Role:</strong> ${data.role}</p>
        <p><strong>Employee ID:</strong> ${data.employeeId || 'N/A'}</p>
        <p><strong>Contact No:</strong> ${data.contactNumber || 'N/A'}</p>
        <hr>

        <h3>Professional Information: </h3>
        <p><strong>Current Grade Assignment:</strong> <span id="display-assigned-grade" style="font-weight: bold; color: ${!data.assignedGrade ? 'var(--primary-red)' : 'var(--primary-green)'};">${data.assignedGrade || 'None'}</span></p>
        <p><strong>Qualifications:</strong> ${data.qualifications || 'N/A'}</p>
        
        <button id="edit-teacher-details-btn" class="cta-button" style="margin-top: 20px;">
            <i class="fas fa-edit"></i> Edit Teacher Profile
        </button>
    `;

    container.innerHTML = contentHTML;
    
    document.getElementById('back-to-teacher-list').addEventListener('click', () => {
        selectedTeacherData = null; 
        window.location.hash = `#teacher-management`; 
        handleNavigation(); 
    });

    document.getElementById('edit-teacher-details-btn').addEventListener('click', () => {
        navigateToEditTeacherForm(data); 
    });
}


/**
 * Displays the edit form and populates it with the selected teacher's data.
 */
function showEditTeacherForm() {
    const container = document.getElementById('edit-teacher-profile'); 
    
    if (!selectedTeacherData) {
        container.innerHTML = '<p class="data-status-message error">Error: No teacher selected for editing. Return to the list view.</p>';
        return;
    }

    const data = selectedTeacherData;
    
    container.innerHTML = `
        <button id="back-to-teacher-list-edit" class="cta-button-secondary" style="margin-bottom: 25px;">
            ← Back to Teacher Profiles List
        </button>

        <h2>Editing Teacher Profile: ${data.preferredName || data.name} ${data.surname}</h2>
        <p class="data-status-message">Employee ID: ${data.employeeId || 'N/A'}</p>
        
        <form id="teacher-edit-form">
            <div class="grid-container" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
                <div class="form-group">
                    <label for="edit-teacher-name">Preferred Name</label>
                    <input type="text" id="edit-teacher-name" value="${data.preferredName || data.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-teacher-surname">Last Name</label>
                    <input type="text" id="edit-teacher-surname" value="${data.surname || ''}" required>
                </div>
                <div class="form-group">
                    <label for="edit-teacher-email">Email (Cannot Change)</label>
                    <input type="email" id="edit-teacher-email" value="${data.email || ''}" disabled>
                </div>
                <div class="form-group">
                    <label for="edit-teacher-contact">Contact No.</label>
                    <input type="text" id="edit-teacher-contact" value="${data.contactNumber || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-teacher-grade">Assigned Grade/Subject</label>
                    <input type="text" id="edit-teacher-grade" value="${data.assignedGrade || ''}">
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="edit-teacher-qualifications">Qualifications/Notes</label>
                    <textarea id="edit-teacher-qualifications" rows="3">${data.qualifications || ''}</textarea>
                </div>
            </div>
            
            <p id="edit-teacher-status-message" class="status-message" style="display: none;"></p>
            <button type="submit" class="cta-button">
                <i class="fas fa-save"></i> Save Teacher Changes
            </button>
            <button type="button" id="cancel-teacher-edit-btn" class="cta-button-secondary" style="margin-left: 10px; margin-top: 15px;">
                Cancel
            </button>
        </form>
    `;
    
    // Attach event listeners after rendering the form
    document.getElementById('back-to-teacher-list-edit').addEventListener('click', () => {
        selectedTeacherData = null; 
        window.location.hash = `#teacher-management`; 
        handleNavigation(); 
    });
    
    document.getElementById('cancel-teacher-edit-btn').addEventListener('click', () => {
        // Go back to the teacher's detail view
        window.location.hash = `#teacher-details`; 
        handleNavigation(); 
    });

    document.getElementById('teacher-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        // *** CRITICAL UPDATE: Call the new function for grade assignment/profile update ***
        if (typeof assignTeacherGrade === 'function') {
            assignTeacherGrade(data.uid); 
        } else {
             document.getElementById('edit-teacher-status-message').textContent = 'Error: assignTeacherGrade function is missing (check data-functions.js).';
             document.getElementById('edit-teacher-status-message').style.display = 'block';
        }
    });
}

// =========================================================
// === GRADE ASSIGNMENT TOOL UI FUNCTIONS ===
// =========================================================

function loadAssignmentToolLists(newActiveList) {
    const unassignedList = document.getElementById('unassigned-learners-list');
    const assignedList = document.getElementById('assigned-learners-list');
    const viewUnassignedBtn = document.getElementById('view-unassigned-btn');
    const viewAssignedBtn = document.getElementById('view-assigned-btn');
    
    activeAssignmentView = newActiveList; 

    if (newActiveList === 'unassigned') {
        unassignedList.style.display = 'block';
        assignedList.style.display = 'none';
        
        viewUnassignedBtn.classList.add('active-view');
        viewAssignedBtn.classList.remove('active-view');

        const gradeFilter = document.getElementById('assignment-grade-filter');
        const selectedGrade = gradeFilter ? gradeFilter.value : 'All';
        loadUnassignedLearners(selectedGrade, true); 
    } else {
        assignedList.style.display = 'block';
        unassignedList.style.display = 'none';
        
        viewAssignedBtn.classList.add('active-view');
        viewUnassignedBtn.classList.remove('active-view');

        const assignedGradeFilter = document.getElementById('assigned-grade-filter');
        const selectedAssignedGrade = assignedGradeFilter ? assignedGradeFilter.value : 'All';
        loadAssignedLearners(selectedAssignedGrade, true); 
    }
}


function displayLearnerAssignmentTool(data) {
    const container = document.getElementById('assignment-details-display');
    const listContainer = document.getElementById('unassigned-learners-list');
    const assignedListContainer = document.getElementById('assigned-learners-list'); 
    
    listContainer.style.display = 'none';
    assignedListContainer.style.display = 'none'; 
    container.style.display = 'block';

    if (!data) {
        container.innerHTML = '<p>No learner data found. Please select a learner.</p>';
        return;
    }
    
    const currentSection = data.section || ''; 
    const currentFullGrade = data.fullGradeSection || (currentSection ? `${data.grade}${currentSection}` : `${data.grade} (Unassigned)`);

    const contentHTML = `
        <button id="back-to-assignment-list" class="cta-button-secondary" style="margin-bottom: 15px;">
            ← Back to Class Assignment Lists
        </button>
        <h3>Assign Class for: ${data.learnerName} ${data.learnerSurname}</h3>
        <p><strong>Admission No:</strong> ${data.admissionId}</p>
        <p><strong>Grade Level:</strong> ${data.grade}</p>
        <p><strong>Current Assignment:</strong> <span id="current-section-display" style="font-weight: bold; color: ${!currentSection ? 'var(--primary-red)' : 'var(--primary-green)'};">${currentFullGrade}</span></p>
        <hr>
        
        <h3>Class Section Assignment</h3>
        <div id="section-assignment-form" style="display: flex; gap: 10px; align-items: flex-end; margin-bottom: 20px;">
            <div class="form-group" style="margin-bottom: 0;">
                <label for="new-section">Section (e.g., A, B, C):</label>
                <input type="text" id="new-section" placeholder="e.g. A" value="${currentSection}" style="width: 80px; text-transform: uppercase;" maxlength="2">
            </div>
            <button id="assign-section-button" class="cta-button-small" style="margin-top: 0;">
                Assign/Update Class
            </button>
        </div>
        <p id="assignment-status-message" style="margin-top: 10px; font-weight: bold;"></p>
    `;

    container.innerHTML = contentHTML;
    
    const backButton = document.getElementById('back-to-assignment-list');
    if (backButton) {
        backButton.addEventListener('click', () => {
            selectedLearnerData = null; 
            window.location.hash = `#grade-assignment`; 
            handleNavigation(); 
        });
    }

    const assignButton = document.getElementById('assign-section-button');
    if (assignButton) {
        assignButton.addEventListener('click', () => {
            const newSectionInput = document.getElementById('new-section');
            const newSection = newSectionInput.value.trim().toUpperCase();
            
            if (newSection === '' || /^[A-Z0-9]{1,2}$/.test(newSection)) { 
                setLearnerSection(data.admissionId, data.grade, newSection); 
            } else {
                alert("Please enter a valid section (e.g., A, B, C) or leave blank to unassign.");
                newSectionInput.focus();
            }
        });
    }
}

// =========================================================
// === PROFILE LOADING & INITIALIZATION (FINAL PART) ===
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
    
    const initialHash = window.location.hash.substring(1);
    if (initialHash === 'grade-assignment') {
        const assignedList = document.getElementById('assigned-learners-list');
        if (assignedList && assignedList.style.display === 'block') {
            activeAssignmentView = 'assigned';
        } else {
            activeAssignmentView = 'unassigned';
        }
    }

    handleNavigation(); 
    window.addEventListener('hashchange', handleNavigation);

    // --- LOG OUT LISTENER ---
    const logOutButton = document.querySelector('.btn-logout');
    if (logOutButton) {
        logOutButton.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => { 
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            }).catch(error => {
                alert("Logout failed: " + error.message);
            });
        });
    }

    // --- ANNOUNCEMENT FORM LISTENER ---
    const announcementForm = document.getElementById('new-announcement-form');
    if (announcementForm) {
        announcementForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            publishAnnouncement(); 
        });
    }

    // --- LMS Filter & Pagination Listener ---
    const gradeFilter = document.getElementById('grade-filter');
    const loadMoreAllBtn = document.getElementById('load-more-all-btn'); 
    
    if (gradeFilter) {
        gradeFilter.addEventListener('change', (e) => {
            selectedLearnerData = null; 
            loadAllActiveLearners(e.target.value, true); 
        });
    }
    if (loadMoreAllBtn) {
        loadMoreAllBtn.addEventListener('click', () => {
            const selectedGrade = gradeFilter ? gradeFilter.value : 'All';
            loadAllActiveLearners(selectedGrade, false); 
        });
    }


    // --- MANUAL LEARNER MANAGEMENT LISTENERS ---
    const addFormSection = document.getElementById('add-learner-form-section');
    const removeSection = document.getElementById('remove-learner-section');
    const allLearnersList = document.getElementById('all-learners-list-view');

    const showAddFormBtn = document.getElementById('show-add-learner-form');
    if (showAddFormBtn) {
        showAddFormBtn.addEventListener('click', () => {
            if (addFormSection.style.display === 'block') {
                addFormSection.style.display = 'none';
                allLearnersList.style.display = 'block';
            } else {
                addFormSection.style.display = 'block';
                removeSection.style.display = 'none'; 
                allLearnersList.style.display = 'none'; 
            }
        });
    }

    const showRemoveSectionBtn = document.getElementById('show-remove-learner-section');
    if (showRemoveSectionBtn) {
        showRemoveSectionBtn.addEventListener('click', () => {
            if (removeSection.style.display === 'block') {
                removeSection.style.display = 'none';
                allLearnersList.style.display = 'block';
            } else {
                removeSection.style.display = 'block';
                addFormSection.style.display = 'none'; 
                allLearnersList.style.display = 'none'; 
            }
        });
    }

    const addLearnerForm = document.getElementById('add-learner-form');
    if (addLearnerForm) {
        addLearnerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addNewLearner(); 
        });
    }

    const executeRemoveBtn = document.getElementById('execute-remove-learner');
    if (executeRemoveBtn) {
        executeRemoveBtn.addEventListener('click', removeLearner); 
    }
    
    // --- ASSIGNMENT TOOL Filter & View Switcher Listeners ---
    const assignmentGradeFilter = document.getElementById('assignment-grade-filter');
    if (assignmentGradeFilter) {
        assignmentGradeFilter.addEventListener('change', (e) => {
            if (activeAssignmentView === 'unassigned') {
                loadUnassignedLearners(e.target.value, true); 
            }
        });
    }
    
    const assignedGradeFilter = document.getElementById('assigned-grade-filter');
    if (assignedGradeFilter) {
        assignedGradeFilter.addEventListener('change', (e) => {
            if (activeAssignmentView === 'assigned') {
                loadAssignedLearners(e.target.value, true); 
            }
        });
    }

    const viewUnassignedBtn = document.getElementById('view-unassigned-btn');
    const viewAssignedBtn = document.getElementById('view-assigned-btn');

    if (viewUnassignedBtn) {
        viewUnassignedBtn.addEventListener('click', () => {
            selectedLearnerData = null; 
            loadAssignmentToolLists('unassigned'); 
        });
    }

    if (viewAssignedBtn) {
        viewAssignedBtn.addEventListener('click', () => {
            selectedLearnerData = null; 
            loadAssignmentToolLists('assigned'); 
        });
    }
    
    const loadMoreUnassignedBtn = document.getElementById('load-more-unassigned-btn');
    if (loadMoreUnassignedBtn) {
        loadMoreUnassignedBtn.addEventListener('click', () => {
            const selectedGrade = assignmentGradeFilter ? assignmentGradeFilter.value : 'All';
            loadUnassignedLearners(selectedGrade, false); 
        });
    }
    
    const loadMoreAssignedBtn = document.getElementById('load-more-assigned-btn');
    if (loadMoreAssignedBtn) {
        loadMoreAssignedBtn.addEventListener('click', () => {
            const selectedGrade = assignedGradeFilter ? assignedGradeFilter.value : 'All';
            loadAssignedLearners(selectedGrade, false); 
        });
    }
    
    // EMS Teacher Management Listener
    const loadMoreTeachersBtn = document.getElementById('load-more-teachers-btn'); 
    
    if (loadMoreTeachersBtn) {
        loadMoreTeachersBtn.addEventListener('click', () => {
            loadAllTeachers(false); 
        });
    }
});