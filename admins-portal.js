// admin.js

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

// Get the form element
const announcementForm = document.getElementById('new-announcement-form');

// Add a submit event listener to the form
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

// Function to load and display admin profile data
function loadAdminProfile() {
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));

    if (userData) {
        document.querySelector('#profile .profile-details p:nth-child(1)').innerHTML = `<strong>Name:</strong> ${userData.preferredName} ${userData.surname}`;
        document.querySelector('#profile .profile-details p:nth-child(2)').innerHTML = `<strong>Special ID:</strong> ${userData.specialId}`;
        document.querySelector('#profile .profile-details p:nth-child(3)').innerHTML = `<strong>Email:</strong> ${userData.email}`;
    } else {
        console.error("User data not found in session storage. Please log in again.");
    }
}

document.addEventListener('DOMContentLoaded', loadAdminProfile);
