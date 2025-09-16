// announcements.js

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
const announcementsCollection = db.collection('announcements');

const announcementsList = document.getElementById('announcements-list');

// Function to format the date
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
};

// Function to render announcements
const renderAnnouncements = (announcements) => {
    announcementsList.innerHTML = ''; // Clear existing announcements

    if (announcements.length === 0) {
        announcementsList.innerHTML = '<p>No announcements to display at this time.</p>';
        return;
    }

    announcements.forEach(doc => {
        const data = doc.data();
        const announcementItem = document.createElement('div');
        announcementItem.classList.add('content-item', 'announcement-item');
        
        announcementItem.innerHTML = `
            <h2>${data.title}</h2>
            <p class="announcement-date">${formatDate(data.date)}</p>
            <p>${data.content.replace(/\n/g, '<br>')}</p>
        `;
        
        announcementsList.appendChild(announcementItem);
    });
};

// Real-time listener for announcements
announcementsCollection.orderBy('date', 'desc').onSnapshot(snapshot => {
    const announcements = [];
    snapshot.forEach(doc => {
        announcements.push(doc);
    });
    renderAnnouncements(announcements);
}, err => {
    console.error('Error fetching announcements:', err);
    announcementsList.innerHTML = '<p>Failed to load announcements. Please try again later.</p>';
});