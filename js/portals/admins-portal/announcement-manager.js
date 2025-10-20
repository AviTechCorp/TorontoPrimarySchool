// announcement-manager.js

// Assumes 'db' is available globally (from config-initialization.js)

// Get the announcement form element
const announcementForm = document.getElementById('new-announcement-form');

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