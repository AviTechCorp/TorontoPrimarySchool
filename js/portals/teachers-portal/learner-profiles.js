// js/portals/teachers-portal/learner-profiles.js

/**
 * Sets up the initial state and event listeners for the Learner Profiles section.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 */
function setupLearnerProfileSection(db) {
    const classFilter = document.getElementById('profile-class-filter');
    const backButton = document.getElementById('back-to-learner-profile-list');

    document.getElementById('learner-profile-list-view').style.display = 'block';
    document.getElementById('learner-profile-detail-view').style.display = 'none';

    classFilter.addEventListener('change', (e) => {
        const selectedClass = e.target.value;
        if (selectedClass) {
            loadLearnersForProfileList(db, selectedClass);
        } else {
            document.getElementById('learner-profile-list-container').innerHTML = '';
            document.getElementById('learner-profile-list-status').textContent = 'Please select a class to load learners.';
        }
    });

    backButton.addEventListener('click', () => {
        document.getElementById('learner-profile-list-view').style.display = 'block';
        document.getElementById('learner-profile-detail-view').style.display = 'none';
    });
}

/**
 * Loads and displays a list of learners for the selected class.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} className - The class to load learners for.
 */
async function loadLearnersForProfileList(db, className) {
    const container = document.getElementById('learner-profile-list-container');
    const status = document.getElementById('learner-profile-list-status');
    status.textContent = `Loading learners for class ${className}...`;
    container.innerHTML = '';

    try {
        const snapshot = await db.collection('sams_registrations').where('fullGradeSection', '==', className).get();
        if (snapshot.empty) {
            status.textContent = `No learners found in class ${className}.`;
            return;
        }

        const learners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        sortLearnersByName(learners);

        let listHTML = '<ul class="resource-list">';
        learners.forEach(learner => {
            listHTML += `
                <li>
                    <i class="fas fa-user-graduate"></i>
                    <div>
                        <h3>${formatLearnerName(learner)}</h3>
                        <p>Admission No: ${learner.admissionId}</p>
                    </div>
                    <button class="cta-button-small" onclick="showLearnerProfileDetail('${learner.id}')">View Profile</button>
                </li>`;
        });
        listHTML += '</ul>';
        container.innerHTML = listHTML;
        status.textContent = `Displaying ${learners.length} learner(s) for class ${className}.`;
    } catch (error) {
        console.error("Error loading learners for profile list:", error);
        status.textContent = 'An error occurred while loading learners.';
    }
}

/**
 * Fetches and displays the detailed profile for a single learner.
 * @param {string} learnerDocId - The Firestore document ID of the learner.
 */
async function showLearnerProfileDetail(learnerDocId) {
    document.getElementById('learner-profile-list-view').style.display = 'none';
    document.getElementById('learner-profile-detail-view').style.display = 'block';

    const contentContainer = document.getElementById('learner-profile-content');
    contentContainer.innerHTML = '<p class="data-status-message">Loading learner profile...</p>';

    const db = firebase.firestore();
    const teacherData = JSON.parse(sessionStorage.getItem('currentUser'));

    try {
        const learnerDoc = await db.collection('sams_registrations').doc(learnerDocId).get();
        if (!learnerDoc.exists) throw new Error("Learner document not found.");
        const learnerData = learnerDoc.data();

        contentContainer.innerHTML = `
            <div class="profile-header">
                <img src="${learnerData.photoUrl || '../../images/placeholder-profile.png'}" alt="Learner Photo" class="profile-pic-large">
                <div class="profile-header-info">
                    <h2>${formatLearnerName(learnerData)}</h2>
                    <p><strong>Admission No:</strong> ${learnerData.admissionId}</p>
                    <p><strong>Class:</strong> ${learnerData.fullGradeSection}</p>
                </div>
            </div>
            <div class="profile-details-grid">
                <div><h4>Learner Details</h4>
                    <p><strong>Date of Birth:</strong> ${learnerData.learnerDOB || 'N/A'}</p>
                    <p><strong>Gender:</strong> ${learnerData.gender || 'N/A'}</p>
                    <p><strong>Home Language:</strong> ${learnerData.homeLanguage || 'N/A'}</p>
                </div>
                <div><h4>Parent/Guardian 1</h4>
                    <p><strong>Name:</strong> ${learnerData.parent1Name || 'N/A'}</p>
                    <p><strong>Contact:</strong> ${learnerData.parent1Contact || 'N/A'}</p>
                    <p><strong>Email:</strong> ${learnerData.parent1Email || 'N/A'}</p>
                </div>
                 <div><h4>Parent/Guardian 2</h4>
                    <p><strong>Name:</strong> ${learnerData.parent2Name || 'N/A'}</p>
                    <p><strong>Contact:</strong> ${learnerData.parent2Contact || 'N/A'}</p>
                    <p><strong>Email:</strong> ${learnerData.parent2Email || 'N/A'}</p>
                </div>
            </div>`;

        loadBehavioralComments(db, learnerDocId);
        document.getElementById('add-comment-form').onsubmit = (e) => {
            e.preventDefault();
            saveBehavioralComment(db, learnerDocId, teacherData);
        };
        displayLearnerDocuments(learnerData);
    } catch (error) {
        console.error("Error showing learner profile detail:", error);
        contentContainer.innerHTML = '<p class="data-status-message error">Could not load learner profile.</p>';
    }
}

/**
 * Loads and displays the history of behavioral comments for a learner.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} learnerDocId - The Firestore document ID of the learner.
 */
async function loadBehavioralComments(db, learnerDocId) {
    const container = document.getElementById('learner-comments-history');
    container.innerHTML = '<p class="data-status-message">Loading comments...</p>';

    const commentsRef = db.collection('sams_registrations').doc(learnerDocId).collection('behavioral_comments').orderBy('timestamp', 'desc');
    commentsRef.onSnapshot(snapshot => {
        if (snapshot.empty) {
            container.innerHTML = '<p class="info-message">No behavioral comments have been recorded for this learner.</p>';
            return;
        }
        container.innerHTML = snapshot.docs.map(doc => {
            const comment = doc.data();
            const date = comment.timestamp.toDate().toLocaleString();
            return `<div class="comment-item"><p class="comment-text">${comment.commentText}</p><p class="comment-meta">By ${comment.teacherName} on ${date}</p></div>`;
        }).join('');
    }, error => {
        console.error("Error loading comments:", error);
        container.innerHTML = '<p class="data-status-message error">Could not load comments.</p>';
    });
}

/**
 * Saves a new behavioral comment to Firestore.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {string} learnerDocId - The Firestore document ID of the learner.
 * @param {object} teacherData - The authenticated teacher's data.
 */
async function saveBehavioralComment(db, learnerDocId, teacherData) {
    const commentInput = document.getElementById('new-comment-text');
    const statusMessage = document.getElementById('comment-status-message');
    const commentText = commentInput.value.trim();
    if (!commentText) { alert('Please enter a comment.'); return; }

    try {
        await db.collection('sams_registrations').doc(learnerDocId).collection('behavioral_comments').add({
            commentText, teacherId: teacherData.uid, teacherName: `${teacherData.preferredName} ${teacherData.surname}`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        commentInput.value = '';
        statusMessage.textContent = 'Comment saved successfully.';
        statusMessage.className = 'status-message-box success';
        statusMessage.style.display = 'block';
        setTimeout(() => statusMessage.style.display = 'none', 3000);
    } catch (error) {
        console.error("Error saving comment:", error);
        statusMessage.textContent = 'Failed to save comment.';
        statusMessage.className = 'status-message-box error';
        statusMessage.style.display = 'block';
    }
}

/**
 * Displays links to the learner's uploaded documents.
 * @param {object} learnerData - The learner's data object from Firestore.
 */
function displayLearnerDocuments(learnerData) {
    const container = document.getElementById('learner-document-links');
    const docLinks = [
        { key: 'birthCertificateUrl', label: "Birth Certificate" }, { key: 'parentIDUrl', label: 'Parent ID' },
        { key: 'proofOfResidenceUrl', label: 'Proof of Residence' }, { key: 'reportCardUrl', label: 'Previous Report Card' }
    ];
    const linksHTML = docLinks.map(doc => learnerData[doc.key] ? `<li><a href="${learnerData[doc.key]}" target="_blank" rel="noopener noreferrer"><i class="far fa-file-pdf"></i> ${doc.label}</a></li>` : '').join('');
    container.innerHTML = linksHTML || '<p class="info-message">No documents were found for this learner.</p>';
}

window.showLearnerProfileDetail = showLearnerProfileDetail;