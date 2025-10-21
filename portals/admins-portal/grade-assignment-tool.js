// grade-assignment-tool.js

// Assumes 'db', 'selectedLearnerData', 'handleNavigation', and 'showSamsDetails' are available.

// =========================================================
// === GRADE ASSIGNMENT TOOL FUNCTIONS ===
// =========================================================

/**
 * Displays the assignment form for the selected learner.
 */
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
 * Queries Firebase for learners that are MISSING the 'section' field.
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