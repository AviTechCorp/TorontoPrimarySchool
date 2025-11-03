// scripts/data-functions.js

// NOTE: This script relies on global variables (db, auth, lastVisibleAll, PAGE_SIZE, 
// selectedLearnerData, selectedTeacherData, lastVisibleTeachers, lastVisibleUnassigned, 
// lastVisibleAssigned, activeAssignmentView) being defined in firebase-config.js/global scope, 
// and UI functions (e.g., showSamsDetails, createKebabMenu, createTeacherKebabMenu, 
// handleNavigation, displayLearnerAssignmentTool) being defined in ui-handlers.js.

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
            
            // NOTE: showSamsDetails should navigate to learner details
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
// === LEARNER MANAGEMENT SYSTEM (LMS) LIST FUNCTIONS ===
// =========================================================

/**
 * Queries Firebase for all active learners for the LMS list view.
 */
async function loadAllActiveLearners(filterGrade = 'All', reset = false) {
    const tableContainer = document.getElementById('all-active-learners-list');
    const tableBody = document.querySelector('#active-learners-table tbody');
    const statusMessage = document.getElementById('active-learners-status');
    const detailsContainer = document.getElementById('learner-details-display');
    
    let loadMoreBtn = document.getElementById('load-more-all-btn');

    detailsContainer.style.display = 'none';
    tableContainer.closest('.portal-section').style.display = 'block'; // Ensure section is visible

    if (reset) {
        tableBody.innerHTML = '';
        lastVisibleAll = null;
        if(loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
    
    statusMessage.textContent = `Fetching active learners for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}...`;
    
    try {
        let query = db.collection('sams_registrations').orderBy('admissionId');
        
        if (filterGrade !== 'All') {
            let gradeValue;
            if (filterGrade === 'R') {
                gradeValue = 'R'; 
            } else {
                gradeValue = parseInt(filterGrade, 10); 
            }
            query = query.where('grade', '==', gradeValue).orderBy('admissionId'); 
        }
        
        if (lastVisibleAll) {
            query = query.startAfter(lastVisibleAll);
        }

        const snapshot = await query.limit(PAGE_SIZE).get(); 

        if (snapshot.empty && tableBody.rows.length === 0) {
            statusMessage.textContent = `No active learners found for Grade ${filterGrade}.`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        const existingAdmissionIds = new Set(Array.from(tableBody.querySelectorAll('tr')).map(row => row.getAttribute('data-id')));
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            if (!admissionId || existingAdmissionIds.has(admissionId)) {
                 return;
            }
            
            const row = tableBody.insertRow();
            row.setAttribute('data-id', admissionId); 
            
            row.insertCell().textContent = admissionId;
            row.insertCell().textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
            row.insertCell().textContent = data.fullGradeSection || data.grade; 
            
            const actionCell = row.insertCell();
            actionCell.appendChild(createKebabMenu(data));
        });
        
        if (!snapshot.empty) {
            lastVisibleAll = snapshot.docs[snapshot.docs.length - 1];
        }

        if (loadMoreBtn) {
            if (snapshot.docs.length < PAGE_SIZE) {
                loadMoreBtn.style.display = 'none'; 
            } else {
                loadMoreBtn.style.display = 'inline-block';
            }
        }
        
        const currentTotal = tableBody.rows.length;
        statusMessage.textContent = `Displaying ${currentTotal} active learner(s) for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}.`;

    } catch (error) {
        console.error("Error loading All Active Learners data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}

// =========================================================
// === GRADE SECTIONS VIEW FUNCTIONS ===
// =========================================================

/**
 * Loads and displays learners based on grade and optional class section filters.
 * @param {string} grade - The grade to filter by.
 * @param {string} classSection - The class section to filter by ('All' for no filter).
 */
async function loadLearnersByGradeAndClass(grade, classSection = 'All') {
    const tableBody = document.querySelector('#grade-section-learners-table tbody');
    const statusMessage = document.getElementById('grade-section-learners-status');
    const header = document.getElementById('grade-section-header');

    tableBody.innerHTML = '';

    if (!grade) {
        header.textContent = 'Select a Grade to Begin';
        statusMessage.textContent = 'Please select a grade from the filter above.';
        return;
    }

    let headerText = `Loading Learners for Grade ${grade}`;
    if (classSection !== 'All') {
        headerText += `, Class ${classSection}`;
    }
    header.textContent = headerText + '...';
    statusMessage.textContent = 'Fetching learner data...';

    try {
        const gradeValue = (grade === 'R') ? 'R' : parseInt(grade, 10);
        let query = db.collection('sams_registrations').where('grade', '==', gradeValue);

        if (classSection !== 'All') {
            query = query.where('section', '==', classSection);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            header.textContent = `No Learners Found for Grade ${grade}` + (classSection !== 'All' ? ` in Class ${classSection}` : '');
            statusMessage.textContent = 'There are no learners matching the current filter criteria.';
            return;
        }

        let learnerCount = 0;
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const nameA = `${a.data().learnerSurname || ''} ${a.data().learnerName || ''}`;
            const nameB = `${b.data().learnerSurname || ''} ${b.data().learnerName || ''}`;
            return nameA.localeCompare(nameB);
        });

        sortedDocs.forEach(doc => {
            const data = doc.data();
            const row = tableBody.insertRow();
            row.insertCell().textContent = data.admissionId;
            row.insertCell().textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
            row.insertCell().textContent = data.fullGradeSection || data.grade;
            learnerCount++;
        });

        header.textContent = `Displaying Learners for Grade ${grade}` + (classSection !== 'All' ? `, Class ${classSection}` : '');
        statusMessage.textContent = `Found ${learnerCount} learner(s).`;

    } catch (error) {
        console.error(`Error loading learners for Grade ${grade}:`, error);
        header.textContent = `Error Loading Data`;
        statusMessage.textContent = 'An error occurred. Check the console for details.';
        if (error.code === 'failed-precondition') {
            statusMessage.innerHTML += '<br><strong>Action Required:</strong> This query may require a composite index. Please check the browser console for a link to create it in Firebase.';
        }
    }
}


// =========================================================
// === GRADE ASSIGNMENT TOOL DATA FUNCTIONS ===
// =========================================================

async function loadUnassignedLearners(filterGrade = 'All', reset = false) {
    const tableBody = document.querySelector('#unassigned-learners-table tbody');
    const statusMessage = document.getElementById('unassigned-learners-status');
    const listContainer = document.getElementById('unassigned-learners-list');
    
    let loadMoreBtn = document.getElementById('load-more-unassigned-btn');

    if (reset) {
        tableBody.innerHTML = '';
        lastVisibleUnassigned = null;
        if(loadMoreBtn) loadMoreBtn.style.display = 'none';
    }

    // FIX: Always clear the table body to prevent duplicates on re-load.
    tableBody.innerHTML = '';

    if(listContainer.style.display !== 'block') return;

    statusMessage.textContent = `Fetching unassigned learners for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}...`;
    
    try {
        let query = db.collection('sams_registrations').orderBy('admissionId');
        
        if (lastVisibleUnassigned) {
            query = query.startAfter(lastVisibleUnassigned);
        }
        
        const snapshot = await query.limit(PAGE_SIZE * 5).get();
        
        if (snapshot.empty && tableBody.rows.length === 0) {
            statusMessage.textContent = `No unassigned learners found yet.`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        let learnersData = [];
        const existingAdmissionIds = new Set(Array.from(tableBody.querySelectorAll('tr')).map(row => row.cells[0].textContent));
        const uniqueLearners = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            if (existingAdmissionIds.has(admissionId) || uniqueLearners.has(admissionId)) {
                 return;
            }
            uniqueLearners.add(admissionId);
            
            const isUnassigned = data.section === 'Unassigned' || !data.section || data.section.trim() === '';
            
            if (isUnassigned) {
                learnersData.push(data);
            }
        });

        const filteredLearners = learnersData.filter(data => {
            if (filterGrade === 'All') return true;
            
            let gradeValue = (filterGrade === 'R') ? 'R' : parseInt(filterGrade, 10);
            return data.grade === gradeValue || String(data.grade) === filterGrade;
        });

        const learnersToShow = filteredLearners.slice(0, PAGE_SIZE);

        learnersToShow.forEach(data => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = data.admissionId;
            row.insertCell().textContent = `${data.learnerName || ''} ${data.learnerSurname || ''}`;
            row.insertCell().textContent = data.grade; 
            
            const actionCell = row.insertCell();
            const assignButton = document.createElement('button');
            assignButton.textContent = 'Assign Class';
            assignButton.className = 'cta-button-small'; 
            
            assignButton.onclick = () => {
                // NOTE: showSamsDetails is a navigation helper that sets selectedLearnerData
                showSamsDetails(data, 'grade-assignment'); 
            }
            actionCell.appendChild(assignButton);
        });

        if (snapshot.docs.length > 0) {
            lastVisibleUnassigned = snapshot.docs[snapshot.docs.length - 1]; 
        }

        if (loadMoreBtn) {
            if (snapshot.docs.length < (PAGE_SIZE * 5)) { 
                loadMoreBtn.style.display = 'none'; 
            } else {
                 loadMoreBtn.style.display = 'inline-block';
            }
        }

        const currentTotal = tableBody.rows.length;
        statusMessage.textContent = `Displaying ${currentTotal} learner(s) awaiting assignment for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}.`;
        
    } catch (error) {
        console.error("Error loading Unassigned Learners data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}


async function loadAssignedLearners(filterGrade = 'All', reset = false) {
    const tableBody = document.querySelector('#assigned-learners-table tbody');
    const statusMessage = document.getElementById('assigned-learners-status');
    const listContainer = document.getElementById('assigned-learners-list');
    
    let loadMoreBtn = document.getElementById('load-more-assigned-btn');

    if (reset) {
        tableBody.innerHTML = '';
        lastVisibleAssigned = null;
        if(loadMoreBtn) loadMoreBtn.style.display = 'none';
    }

    // FIX: Always clear the table body to prevent duplicates on re-load.
    tableBody.innerHTML = '';

    if(listContainer.style.display !== 'block') return;

    statusMessage.textContent = `Fetching assigned learners for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}...`;
    
    try {
        let query = db.collection('sams_registrations').orderBy('admissionId');

        if (lastVisibleAssigned) {
            query = query.startAfter(lastVisibleAssigned);
        }
        
        const snapshot = await query.limit(PAGE_SIZE * 5).get();

        if (snapshot.empty && tableBody.rows.length === 0) {
            statusMessage.textContent = `No assigned learners found yet.`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        let learnersData = [];
        const existingAdmissionIds = new Set(Array.from(tableBody.querySelectorAll('tr')).map(row => row.cells[0].textContent));
        const uniqueLearners = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const admissionId = data.admissionId;

            if (existingAdmissionIds.has(admissionId) || uniqueLearners.has(admissionId)) {
                 return;
            }
            uniqueLearners.add(admissionId);

            const isAssigned = data.section && data.section.trim() !== '' && data.section !== 'Unassigned';

            if (isAssigned) {
                learnersData.push(data);
            }
        });

        const filteredLearners = learnersData.filter(data => {
            if (filterGrade === 'All') return true;
            
            let gradeValue = (filterGrade === 'R') ? 'R' : parseInt(filterGrade, 10);
            return data.grade === gradeValue || String(data.grade) === filterGrade;
        });
        
        const learnersToShow = filteredLearners.slice(0, PAGE_SIZE);

        learnersToShow.forEach(data => {
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
        });

        if (snapshot.docs.length > 0) {
             lastVisibleAssigned = snapshot.docs[snapshot.docs.length - 1]; 
        }

        if (loadMoreBtn) {
            if (snapshot.docs.length < (PAGE_SIZE * 5)) { 
                loadMoreBtn.style.display = 'none'; 
            } else {
                loadMoreBtn.style.display = 'inline-block';
            }
        }
        
        const currentTotal = tableBody.rows.length;
        statusMessage.textContent = `Displaying ${currentTotal} active assigned learner(s) for Grade ${filterGrade === 'All' ? 'R - 7' : filterGrade}.`;
        
    } catch (error) {
        console.error("Error loading Assigned Learners data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}

/**
 * Fetches and displays absentee records for a specific date.
 * @param {string} filterGrade - The grade to filter by.
 * @param {string} filterClass - The class section to filter by.
 */
async function loadAttendanceRecords(filterGrade, filterClass = 'All') {
    const tableBody = document.querySelector('#attendance-records-table tbody');
    const statusMessage = document.getElementById('attendance-records-status');

    tableBody.innerHTML = '';

    if (!filterGrade) {
        statusMessage.textContent = 'Please select a grade to view records.';
        statusMessage.style.display = 'block';
        return;
    }

    let statusText = `Fetching absentee records for Grade ${filterGrade}`;
    if (filterClass !== 'All') {
        statusText += `, Class ${filterClass}`;
    }
    statusMessage.textContent = statusText + '...';
    statusMessage.style.display = 'block';

    try {
        let query = db.collection('attendance_records').where('status', '==', 'absent');

        if (filterGrade !== 'All') {
            // Use a range query to find all classes for a given grade (e.g., >= '6' and < '7')
            if (filterClass !== 'All') {
                // If a specific class is selected, query for that exact class
                query = query.where('fullGradeSection', '==', filterClass);
            } else {
                // Otherwise, query for all classes within the grade
                const start = String(filterGrade);
                const end = (filterGrade === 'R') ? 'S' : String(Number(filterGrade) + 1);
                query = query.where('fullGradeSection', '>=', start).where('fullGradeSection', '<', end);
            }
        }

        // Order by date descending to see the most recent absences first
        const snapshot = await query.orderBy('fullGradeSection').orderBy('date', 'desc').get();

        if (snapshot.empty) {
            let emptyMessage = `No learners were marked absent for Grade ${filterGrade}`;
            if (filterClass !== 'All') emptyMessage += ` in Class ${filterClass}`;
            statusMessage.textContent = emptyMessage + '.';
            return;
        }

        let absenteeCount = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = tableBody.insertRow();
            row.insertCell().textContent = data.admissionId || 'N/A'; // Column 1: Admission No.
            row.insertCell().textContent = data.date || 'N/A'; // Column 2: Date
            row.insertCell().textContent = data.learnerName || 'N/A';
            row.insertCell().textContent = data.fullGradeSection || 'N/A';

            const statusCell = row.insertCell();
            const status = data.status || 'unknown';
            const statusClass = status.replace(/\s/g, '-').toLowerCase();
            statusCell.innerHTML = `<span class="status-badge status-${statusClass}">${status}</span>`;

            absenteeCount++;
        });

        let successMessage = `Found ${absenteeCount} absent learner(s) for Grade ${filterGrade}`;
        if (filterClass !== 'All') successMessage += ` in Class ${filterClass}`;
        statusMessage.textContent = successMessage + '.';

    } catch (error) {
        console.error("Error loading attendance records:", error);
        statusMessage.textContent = 'An error occurred while loading attendance records. Please check the console.';
        if (error.code === 'failed-precondition') {
            statusMessage.innerHTML += '<br><strong>Action Required:</strong> A database index is required for this query. Please contact your system administrator and ask them to create the composite index for the `attendance_records` collection as specified in the browser console error log.';
        }
    }
}

/**
 * Updates the learner's document with the assigned section and the combined fullGradeSection.
 */
async function setLearnerSection(admissionId, grade, newSection) {
    const statusMessageElement = document.getElementById('assignment-status-message');
    statusMessageElement.textContent = 'Updating...';
    
    const finalSection = newSection.trim() === '' ? null : newSection; 
    const fullGradeSection = finalSection ? `${grade}${finalSection}` : null;
    const assignmentDisplay = fullGradeSection || `${grade} (Unassigned)`;

    if (!confirm(`Are you sure you want to assign this learner to class ${assignmentDisplay}?`)) {
        statusMessageElement.textContent = 'Assignment cancelled.';
        return;
    }

    try {
        const snapshot = await db.collection('sams_registrations')
            .where('admissionId', '==', admissionId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            statusMessageElement.textContent = "Error: Learner document not found in database.";
            return;
        }

        const docRef = snapshot.docs[0].ref;
        
        await docRef.update({
            section: finalSection,   
            fullGradeSection: fullGradeSection 
        });

        // Call global UI update function
        selectedLearnerData.section = finalSection;
        selectedLearnerData.fullGradeSection = fullGradeSection;
        // NOTE: Assumes displayLearnerAssignmentTool is defined in ui-handlers.js
        if (typeof displayLearnerAssignmentTool === 'function') {
            displayLearnerAssignmentTool(selectedLearnerData); 
        } else {
            document.getElementById('current-section-display').textContent = assignmentDisplay;
        }
        
        statusMessageElement.textContent = `Success! Learner updated to ${assignmentDisplay}.`;
        
        // Reset pagination state for list views so they reload when you click "Back"
        lastVisibleUnassigned = null;
        lastVisibleAssigned = null;
        lastVisibleAll = null;

    } catch (error) {
        console.error("Error updating learner section:", error);
        statusMessageElement.textContent = "An error occurred while assigning the section. Please try again.";
    }
}

/**
 * Fetches all unique class sections from all teacher profiles.
 * This is used to populate the class assignment dropdown.
 * @returns {Promise<string[]>} A promise that resolves to an array of unique class names.
 */
async function fetchAllUniqueClassSections() {
    const uniqueSections = new Set();
    try {
        const snapshot = await db.collection('users').where('role', '==', 'teacher').get();

        if (snapshot.empty) {
            console.warn("No teachers found to populate class sections.");
            return [];
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.teachingAssignments && Array.isArray(data.teachingAssignments)) {
                data.teachingAssignments.forEach(assignment => {
                    if (assignment.fullClass) uniqueSections.add(assignment.fullClass);
                });
            }
        });

        return Array.from(uniqueSections).sort();
    } catch (error) {
        console.error("Error fetching unique class sections:", error);
        return []; // Return empty array on error
    }
}

async function addNewLearner() {
    const form = document.getElementById('add-learner-form');
    const statusMessage = document.getElementById('add-learner-status');
    
    const admissionId = document.getElementById('new-admission-id').value.trim();
    const name = document.getElementById('new-learner-name').value.trim();
    const surname = document.getElementById('new-learner-surname').value.trim();
    let grade = document.getElementById('new-grade').value.trim().toUpperCase(); 
    
    statusMessage.textContent = 'Processing...';

    if (!admissionId || !name || !surname || !grade) {
        statusMessage.textContent = 'Please fill in all required fields.';
        return;
    }

    if (grade !== 'R' && !isNaN(parseInt(grade, 10))) {
        grade = parseInt(grade, 10);
    } else if (grade !== 'R' && !['1', '2', '3', '4', '5', '6', '7'].includes(String(grade))) {
         statusMessage.textContent = 'Invalid Grade. Please use a number (1-7) or "R" for Reception.';
         return;
    }

    try {
        const existing = await db.collection('sams_registrations')
            .where('admissionId', '==', admissionId)
            .limit(1)
            .get();

        if (!existing.empty) {
            statusMessage.textContent = `Error: Learner with Admission ID ${admissionId} already exists.`;
            return;
        }

        const newLearnerData = {
            admissionId: admissionId,
            learnerName: name,
            learnerSurname: surname,
            grade: grade,
            section: null, 
            fullGradeSection: null, 
            importedAt: firebase.firestore.FieldValue.serverTimestamp(),
            learnerID: 'MANUAL_ENTRY', 
            parent1Email: 'N/A',
        };

        await db.collection('sams_registrations').add(newLearnerData);
        
        statusMessage.textContent = `Success! Learner ${name} ${surname} (ID: ${admissionId}) added.`;
        form.reset();
        
        lastVisibleAll = null;
        
        // Call global UI refresh function
        if (document.getElementById('all-learners-list-view').style.display === 'block') {
            const gradeFilter = document.getElementById('grade-filter');
            loadAllActiveLearners(gradeFilter ? gradeFilter.value : 'All', true);
        }

    } catch (error) {
        console.error("Error adding learner:", error);
        statusMessage.textContent = "An error occurred while adding the learner. Check console.";
    }
}


/**
 * Submits the announcement data to Firestore.
 */
async function publishAnnouncement() {
    const announcementForm = document.getElementById('new-announcement-form');
    const title = document.getElementById('announcement-title').value;
    const content = document.getElementById('announcement-content').value;
    const date = document.getElementById('announcement-date').value;

    if (!title || !content || !date) {
        alert("Please fill in all announcement fields.");
        return;
    }

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
}

// =========================================================
// === LEARNER EDIT FORM DATA FUNCTIONS (NEW) ===
// =========================================================

/**
 * Reads form data and updates the learner's Firestore document.
 * @param {string} admissionId - The ID of the learner to update.
 */
async function updateLearnerDetails(admissionId) {
    const statusMessageElement = document.getElementById('edit-status-message');
    statusMessageElement.textContent = 'Saving changes...';
    statusMessageElement.style.display = 'block';
    statusMessageElement.classList.remove('error');

    const name = document.getElementById('edit-name').value.trim();
    const surname = document.getElementById('edit-surname').value.trim();
    let grade = document.getElementById('edit-grade').value.trim().toUpperCase(); 
    const dob = document.getElementById('edit-dob').value.trim();
    const parentName = document.getElementById('edit-parent-name').value.trim();
    const parentEmail = document.getElementById('edit-parent-email').value.trim();
    const parentContact = document.getElementById('edit-parent-contact').value.trim();
    
    if (!name || !surname || !grade) {
        statusMessageElement.textContent = 'Error: First Name, Last Name, and Grade are required.';
        statusMessageElement.classList.add('error');
        return;
    }
    
    // Grade validation
    if (grade !== 'R' && !['1', '2', '3', '4', '5', '6', '7'].includes(String(grade))) {
        statusMessageElement.textContent = 'Invalid Grade. Use "R" or a number 1-7.';
        statusMessageElement.classList.add('error');
        return;
    }
    grade = (grade === 'R') ? 'R' : parseInt(grade, 10); 

    try {
        const snapshot = await db.collection('sams_registrations')
            .where('admissionId', '==', admissionId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            statusMessageElement.textContent = "Error: Learner document not found.";
            statusMessageElement.classList.add('error');
            return;
        }

        const docRef = snapshot.docs[0].ref;
        
        const updateData = {
            learnerName: name,
            learnerSurname: surname,
            grade: grade, 
            parent1Name: parentName,
            parent1Email: parentEmail,
            parent1Contact: parentContact,
        };

        if (dob) {
            updateData.learnerDOB = dob;
        } else if (selectedLearnerData.learnerDOB) {
            // Explicitly remove DOB if the user cleared the field
             updateData.learnerDOB = firebase.firestore.FieldValue.delete();
        }
        
        // If the grade was changed, clear the section assignment (as it may be invalid)
        if (grade !== selectedLearnerData.grade) {
            updateData.section = null;
            updateData.fullGradeSection = null;
        }

        await docRef.update(updateData);

        // Update the global state
        selectedLearnerData = { 
            ...selectedLearnerData, 
            ...updateData,
            learnerDOB: dob // Update DOB in global state for immediate display
        };

        statusMessageElement.textContent = `Success! Learner profile for ${name} updated.`;
        statusMessageElement.classList.remove('error');

        // Optional: Immediately transition to the details view to show the result
        setTimeout(() => {
            window.location.hash = `#sams-learners`; 
            // NOTE: Assumes handleNavigation is defined in ui-handlers.js
            if (typeof handleNavigation === 'function') {
                handleNavigation(); 
            }
        }, 1500);

    } catch (error) {
        console.error("Error updating learner details:", error);
        statusMessageElement.textContent = "An error occurred during save. Check console.";
        statusMessageElement.classList.add('error');
    }
}


// =========================================================
// === EMPLOYEE MANAGEMENT SYSTEM (EMS) FUNCTIONS (UPDATED) ===
// =========================================================

/**
 * Queries Firebase for all active users with the role 'teacher' for the EMS list view.
 */
async function loadAllTeachers(filterGrade = 'All', reset = false) {
    const tableBody = document.querySelector('#teachers-data-table tbody');
    const statusMessage = document.getElementById('teachers-data-status');
    let loadMoreBtn = document.getElementById('load-more-teachers-btn');

    if (reset) {
        tableBody.innerHTML = '';
        lastVisibleTeachers = null;
        if(loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
    
    statusMessage.textContent = `Fetching teacher profiles for ${filterGrade === 'All' ? 'All Grades' : 'Grade ' + filterGrade}...`;
    
    try {
        let query = db.collection('users')
                      .where('role', '==', 'teacher');

        if (filterGrade !== 'All') {
            query = query.where('assignedGrades', 'array-contains', filterGrade);
        }
        // query = query.orderBy('surname').orderBy('preferredName'); // This requires a composite index. Sorting will be done client-side.
        
        if (lastVisibleTeachers) {
            query = query.startAfter(lastVisibleTeachers);
        }

        // Fetch teachers, using PAGE_SIZE
        const snapshot = await query.limit(PAGE_SIZE).get(); 

        if (snapshot.empty && tableBody.rows.length === 0) {
            statusMessage.textContent = `No teacher profiles found for ${filterGrade === 'All' ? 'All Grades' : 'Grade ' + filterGrade}.`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }
        
        const existingEmails = new Set(Array.from(tableBody.querySelectorAll('tr')).map(row => row.getAttribute('data-email')));

        // Sort the documents client-side by surname, then preferredName
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const nameA = `${a.data().surname} ${a.data().preferredName}`;
            const nameB = `${b.data().surname} ${b.data().preferredName}`;
            return nameA.localeCompare(nameB);
        });

        sortedDocs.forEach(doc => {
            const data = { ...doc.data(), uid: doc.id }; 
            const email = data.email;

            if (existingEmails.has(email)) {
                 return;
            }
            
            const row = tableBody.insertRow();
            row.setAttribute('data-email', email);
            
            // Column 1: Name
            row.insertCell().textContent = `${data.preferredName || ''} ${data.surname || ''}`;
            // Column 2: Email
            row.insertCell().textContent = data.email;
            // Column 3: Assigned Grade
            const roleCell = row.insertCell();
            if (data.isClassTeacher) {
                const subjects = (data.assignedSubjects && data.assignedSubjects.length > 0) ? `Teaches: ${data.assignedSubjects.join(', ')}` : 'No subjects listed';
                roleCell.innerHTML = `<strong>Class Teacher: ${data.responsibleClass || 'N/A'}</strong><br><small>${subjects}</small>`;
            } else {
                const grades = (data.assignedGrades && data.assignedGrades.length > 0) 
                    ? `Grades: ${data.assignedGrades.join(', ')}` 
                    : 'No grades assigned';
                roleCell.innerHTML = `<strong>Subject Teacher</strong><br><small>${grades}</small>`;
            }


            // Column 4: Action Menu
            const actionCell = row.insertCell();
            
            // Use the kebab menu for actions (View, Edit/Assign)
            if (typeof createTeacherKebabMenu === 'function') {
                actionCell.appendChild(createTeacherKebabMenu(data)); 
            } else {
                const viewButton = document.createElement('button');
                viewButton.textContent = 'View Profile';
                viewButton.className = 'cta-button-small'; 
                viewButton.onclick = () => alert(`Viewing profile for ${data.preferredName} ${data.surname}`);
                actionCell.appendChild(viewButton);
            }
        });
        
        if (!snapshot.empty) {
            // Set the cursor for the next page
            lastVisibleTeachers = snapshot.docs[snapshot.docs.length - 1];
        }

        if (loadMoreBtn) {
            if (snapshot.docs.length < PAGE_SIZE) {
                loadMoreBtn.style.display = 'none'; 
            } else {
                loadMoreBtn.style.display = 'inline-block';
            }
        }
        
        const currentTotal = tableBody.rows.length;
        statusMessage.textContent = `Displaying ${currentTotal} teacher profile(s) for ${filterGrade === 'All' ? 'All Grades' : 'Grade ' + filterGrade}.`;

    } catch (error) {
        console.error("Error loading Teacher data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}

/**
 * Updates a teacher's profile details and assigned grade in Firestore.
 * This is called from the UI when saving the teacher edit form.
 *
 * @param {string} teacherUid - The unique ID (UID) of the teacher document.
 */
async function assignTeacherGrade(teacherUid) {
    // Note: Assumes global selectedTeacherData is available.
    const statusMessage = document.getElementById('edit-teacher-status-message');
    
    // Get values from the edit form (assuming fields from your previous prompt)
    const newAssignedName = document.getElementById('edit-teacher-name').value.trim();
    const newAssignedSurname = document.getElementById('edit-teacher-surname').value.trim();
    const newAssignedContact = document.getElementById('edit-teacher-contact').value.trim();
    const newAssignedQualifications = document.getElementById('edit-teacher-qualifications').value.trim();
    const newAssignedGradesString = document.getElementById('edit-teacher-grades').value.trim();
    const newAssignedClassesString = document.getElementById('edit-teacher-classes').value.trim();
    const newAssignedSubjectsString = document.getElementById('edit-teacher-subjects').value.trim();
    
    // Reset status message
    statusMessage.style.display = 'none';
    
    if (!teacherUid) {
        statusMessage.textContent = 'Error: Teacher UID is missing.';
        statusMessage.style.backgroundColor = '#fdd';
        statusMessage.style.display = 'block';
        return;
    }

    // Convert comma-separated string to a clean array of strings
    const newAssignedGrades = newAssignedGradesString.split(',').map(g => g.trim().toUpperCase()).filter(g => g);
    const newAssignedClasses = newAssignedClassesString.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
    const newAssignedSubjects = newAssignedSubjectsString.split(',').map(s => s.trim()).filter(s => s);

    try {
        const teacherRef = db.collection('users').doc(teacherUid);
        
        const updateData = {
            preferredName: newAssignedName,
            surname: newAssignedSurname,
            contactNumber: newAssignedContact,
            qualifications: newAssignedQualifications,
            assignedGrades: newAssignedGrades,
            assignedClasses: newAssignedClasses,
            assignedSubjects: newAssignedSubjects,
            assignedGrade: firebase.firestore.FieldValue.delete(), // Remove the old field
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await teacherRef.update(updateData);

        statusMessage.textContent = `Success! Teacher profile and Assigned Grades updated.`;
        statusMessage.style.backgroundColor = '#dfd';
        statusMessage.style.display = 'block';
        
        // Update the globally stored data to reflect the change immediately
        if (selectedTeacherData && selectedTeacherData.uid === teacherUid) {
            Object.assign(selectedTeacherData, updateData);
            // Directly re-render the details view with the new data
            // NOTE: Assumes displayTeacherDetails is defined in ui-handlers.js
            if (typeof displayTeacherDetails === 'function') {
                displayTeacherDetails();
            }
        }
        
        // Reset pagination for list refresh
        lastVisibleTeachers = null;

        // Delay navigation to allow user to see success message
        setTimeout(() => {
            // Navigate back to the details view to show the updated info
            window.location.hash = `#teacher-details`;
            // NOTE: Assumes handleNavigation is defined in ui-handlers.js
            if (typeof handleNavigation === 'function') {
                handleNavigation();
            }
        }, 1500);

    } catch (error) {
        console.error("Error updating teacher profile:", error);
        statusMessage.textContent = `Update failed: ${error.message}`;
        statusMessage.style.backgroundColor = '#fdd';
        statusMessage.display = 'block';
    }
}

/**
 * Prompts for confirmation and then permanently removes a teacher's profile from Firestore.
 * Note: This does not delete the user from Firebase Authentication, only their profile data.
 * @param {Object} data - The teacher data object, containing the UID.
 */
async function confirmAndRemoveTeacher(data) {
    const teacherName = `${data.preferredName || ''} ${data.surname || ''}`.trim();
    const teacherUid = data.uid;

    if (!confirm(`WARNING: Are you sure you want to PERMANENTLY remove the teacher profile for "${teacherName}"? This action cannot be undone.`)) {
        return;
    }

    if (!teacherUid) {
        alert('Error: Teacher UID not found. Cannot remove profile.');
        return;
    }

    try {
        const teacherRef = db.collection('users').doc(teacherUid);
        await teacherRef.delete();

        alert(`Success! Teacher profile for "${teacherName}" has been removed.`);

        lastVisibleTeachers = null; // Reset pagination
        loadAllTeachers(true); // Refresh the teacher list

    } catch (error) {
        console.error("Error removing teacher profile:", error);
        alert("An error occurred while removing the teacher. Please check the console for details.");
    }
}