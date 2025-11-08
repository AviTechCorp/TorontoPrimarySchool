// js/portals/teachers-portal/portfolio-viewer.js

document.addEventListener('DOMContentLoaded', () => {
    // This config must match your main project's config
    const firebaseConfig = {
        apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
        authDomain: "school-website-66326.firebaseapp.com",
        projectId: "school-website-66326",
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    const urlParams = new URLSearchParams(window.location.search);
    const teacherId = urlParams.get('teacherId');

    if (!teacherId) {
        document.getElementById('portfolio-items-container').innerHTML = '<p class="status-message" style="color: red;">Error: No teacher ID provided.</p>';
        document.getElementById('print-cover-teacher-name').textContent = 'Unknown Teacher';
        return;
    }

    loadFullPortfolio(db, teacherId);

    // **NEW**: Add print button functionality
    const printBtn = document.getElementById('print-page-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => window.print());
    }
});

/**
 * Defines the fixed order for portfolio categories.
 */
const PORTFOLIO_CATEGORY_ORDER = [
    "Table Of Content",
    "Job Description",
    "Mission and Vision",
    "School Calender",
    "Personal Time Table",
    "Lesson Plans",
    "Student Assessments",
    "Classroom Management",
    "Teaching Philosophy",
    "Student Work Samples",
    "Professional Development",
    "Parent Communication",
    "Other"
];

/**
 * Loads the teacher's profile and all portfolio items.
 * @param {firebase.firestore.Firestore} db - Firestore instance.
 * @param {string} teacherId - The UID of the teacher.
 */
async function loadFullPortfolio(db, teacherId) {
    const teacherNameEl = document.getElementById('print-cover-teacher-name');
    const dateEl = document.getElementById('print-cover-date');
    const container = document.getElementById('portfolio-items-container');
    const lastUpdatedEl = document.getElementById('last-updated-date');

    try {
        // 1. Fetch teacher's name for the cover page
        const teacherDoc = await db.collection('users').doc(teacherId).get();
        if (teacherDoc.exists) {
            const teacherData = teacherDoc.data();
            teacherNameEl.textContent = `${teacherData.preferredName || ''} ${teacherData.surname || ''}`;
        } else {
            teacherNameEl.textContent = 'Teacher Not Found';
        }
        dateEl.textContent = `Portfolio as of: ${new Date().toLocaleDateString()}`;

        // 2. Fetch portfolio items
        const snapshot = await db.collection('teacher_portfolios')
            .where('teacherId', '==', teacherId)
            .orderBy('uploadedAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p class="status-message">This portfolio is currently empty.</p>';
            return;
        }

        // **NEW**: Find the most recent upload date for the "Last Updated" footer
        const mostRecentTimestamp = snapshot.docs[0].data().uploadedAt; // Because the query is ordered by date desc
        if (lastUpdatedEl && mostRecentTimestamp) {
            lastUpdatedEl.textContent = mostRecentTimestamp.toDate().toLocaleString();
        }

        const itemsByCategory = {};
        snapshot.forEach(doc => {
            const item = doc.data();
            if (!itemsByCategory[item.category]) {
                itemsByCategory[item.category] = [];
            }
            itemsByCategory[item.category].push(item);
        });

        // 3. Render items in the correct order
        let portfolioHTML = '';
        PORTFOLIO_CATEGORY_ORDER.forEach(category => {
            if (itemsByCategory[category]) {
                portfolioHTML += `<h4 class="portfolio-category-title">${category}</h4><ul class="resource-list">`;
                itemsByCategory[category].forEach(item => {
                    portfolioHTML += `
                        <li>
                            <i class="far fa-file-alt"></i>
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="Uploaded: ${item.uploadedAt.toDate().toLocaleDateString()}">${item.description}</a>
                        </li>`;
                });
                portfolioHTML += `</ul>`;
            }
        });
        container.innerHTML = portfolioHTML;

    } catch (error) {
        console.error("Error loading portfolio:", error);
        container.innerHTML = '<p class="status-message" style="color: red;">Could not load portfolio due to an error.</p>';
    }
}