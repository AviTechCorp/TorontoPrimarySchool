// sams-data-loaders.js

// Assumes 'db' and 'showSamsDetails' are available globally.

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