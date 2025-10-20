// main-initialization.js

// Assumes all utility functions (loadAdminProfile, handleNavigation, 
// loadAllActiveLearners, loadUnassignedLearners, loadAssignedLearners) 
// and the global state variable 'selectedLearnerData' are available.

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

    // --- Assignment View Switcher Listeners ---
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
    
    // Event listener for the Assigned Learners list filter
    if (assignedGradeFilter) {
        assignedGradeFilter.addEventListener('change', (e) => {
            selectedLearnerData = null;
            loadAssignedLearners(e.target.value);
        });
    }
});

