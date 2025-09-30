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

// Add a submit event listener to the form
if (announcementForm) {
    announcementForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default form submission

        // Get input values
        const title = document.getElementById('announcement-title').value;
        const content = document.getElementById('announcement-content').value;
        const date = document.getElementById('announcement-date').value;

        try {
            // Add a new document to the 'announcements' collection
            await db.collection('announcements').add({
                title,
                content,
                date,
                createdAt: firebase.firestore.FieldValue.serverTimestamp() // Add a timestamp
            });
            
            // Show success message and clear the form
            alert('Announcement successfully published!');
            announcementForm.reset();
            
        } catch (e) {
            console.error("Error adding document: ", e);
            alert('An error occurred while publishing the announcement. Please try again.');
        }
    });
}


// =========================================================
// === NAVIGATION & UI LOGIC (NEW) ===
// =========================================================

function handleNavigation() {
    // Determine the target section based on the URL hash (e.g., #profile)
    let targetId = window.location.hash.substring(1); 
    
    // Default to the first section if no hash or an invalid hash is present
    if (!targetId || !document.getElementById(targetId)) {
        // Use 'profile' or the first section as the default
        targetId = 'profile'; 
    }

    // 1. Deactivate all sections and links
    document.querySelectorAll('.portal-section').forEach(section => {
        section.classList.remove('active-section');
    });
    document.querySelectorAll('.sidebar ul li a').forEach(link => {
        link.classList.remove('active');
    });

    // 2. Activate the target section and link
    const targetSection = document.getElementById(targetId);
    const targetLink = document.querySelector(`.sidebar ul li a[href="#${targetId}"]`);

    if (targetSection) {
        targetSection.classList.add('active-section');
    }
    if (targetLink) {
        targetLink.classList.add('active');
    }

    // Re-load the SA-SAMS data every time the SA-SAMS section is visited
    if (targetId === 'sams-mgmt') {
        loadSamsRegistrations();
    }
}

// Listen for hash changes (when a sidebar link is clicked)
window.addEventListener('hashchange', handleNavigation);


// =========================================================
// === SA-SAMS MANAGEMENT FUNCTIONS (EXISTING) ===
// =========================================================

async function loadSamsRegistrations() {
    const tableBody = document.querySelector('#sams-data-table tbody');
    const statusMessage = document.getElementById('sams-data-status');
    // ... (rest of loadSamsRegistrations remains the same)
    tableBody.innerHTML = '';
    statusMessage.textContent = 'Fetching accepted applications...';

    try {
        const snapshot = await db.collection('sams_registrations').get();

        if (snapshot.empty) {
            statusMessage.textContent = 'No accepted applications found yet.';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const row = tableBody.insertRow();
            
            // Format imported date
            const importedDate = new Date(data.importedAt).toLocaleDateString();

            row.insertCell().textContent = data.admissionId;
            row.insertCell().textContent = `${data.learnerName} ${data.learnerSurname}`;
            row.insertCell().textContent = data.grade;
            row.insertCell().textContent = data.parent1Email;
            row.insertCell().textContent = importedDate;
            
            // Action Cell
            const actionCell = row.insertCell();
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View Details';
            viewButton.className = 'cta-button-small'; // Use the new smaller button style
            viewButton.onclick = () => showSamsDetails(data);
            actionCell.appendChild(viewButton);
        });

        statusMessage.textContent = `Successfully loaded ${snapshot.size} accepted application(s).`;
        
    } catch (error) {
        console.error("Error loading SA-SAMS data from Firebase: ", error);
        statusMessage.textContent = 'Error loading data. Check console for details.';
    }
}

function showSamsDetails(data) {
    // Simple alert for demonstration, replace with a proper modal later
    alert(
        `Learner Admission Details:\n` +
        `--------------------------\n` +
        `Admission No: ${data.admissionId}\n` +
        `Name: ${data.learnerName} ${data.learnerSurname}\n` +
        `ID: ${data.learnerID}\n` +
        `DOB: ${data.learnerDOB ? new Date(data.learnerDOB).toLocaleDateString() : 'N/A'}\n` +
        `Grade: ${data.grade}\n` +
        `Parent: ${data.parent1Name} (${data.parent1Relationship})\n` +
        `Contact: ${data.parent1Contact}\n` +
        `Email: ${data.parent1Email}`
    );
}

// Function to load and display admin profile data (EXISTING)
function loadAdminProfile() {
  const userData = JSON.parse(sessionStorage.getItem('currentUser'));

  if (userData) {
    document.querySelector('#profile .profile-details p:nth-child(1)').innerHTML = `<strong>Name:</strong> ${userData.preferredName} ${userData.surname}`;
    document.querySelector('#profile .profile-details p:nth-child(2)').innerHTML = `<strong>Role:</strong> Admin`; // Changed from Special ID for better UI fit
    document.querySelector('#profile .profile-details p:nth-child(3)').innerHTML = `<strong>Email:</strong> ${userData.email}`;
  } else {
    console.error("User data not found in session storage. Please log in again.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAdminProfile();
    // Handle navigation on initial load (will show the default section, usually #profile)
    handleNavigation(); 
});