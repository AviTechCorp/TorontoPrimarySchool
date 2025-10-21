// lms-manager.js

// Assumes 'db', 'selectedLearnerData', 'handleNavigation', and 'showSamsDetails' are available.

// =========================================================
// === LEARNER MANAGEMENT SYSTEM (LMS) DISPLAY FUNCTIONS ===
// =========================================================

/**
 * Queries Firebase for all active learners and displays them in a list.
 */
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