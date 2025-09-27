// Function to load and display parent profile data
function loadParentProfile() {
    // Retrieve the user data from sessionStorage
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));

    // Check if the user data exists
    if (userData) {
        // Find the profile details elements and update their content
        document.querySelector('#profile .profile-details p:nth-child(1)').innerHTML = `<strong>Name:</strong> ${userData.name} ${userData.surname}`;
        document.querySelector('#profile .profile-details p:nth-child(2)').innerHTML = `<strong>Email:</strong> ${userData.email}`;
        document.querySelector('#profile .profile-details p:nth-child(3)').innerHTML = `<strong>Contact:</strong> ${userData.contact}`;
        document.querySelector('#profile .profile-details p:nth-child(4)').innerHTML = `<strong>Relationship:</strong> ${userData.relationship}`;
        
        // Update the heading for the learner's section
        document.getElementById('learner-section').querySelector('h2').textContent = `${userData.learnerFirstName} ${userData.learnerSurname}'s Section`;
        
        // Optionally populate the learner details as well
        const learnerDetails = `
            <p><strong>Learner Surname:</strong> ${userData.learnerSurname}</p>
            <p><strong>First Name:</strong> ${userData.learnerFirstName}</p>
            <p><strong>Middle Name:</strong> ${userData.learnerMiddleName || 'N/A'}</p>
            <p><strong>Date of Birth:</strong> ${userData.learnerDOB}</p>
            <p><strong>Gender:</strong> ${userData.learnerGender}</p>
            <p><strong>Grade:</strong> ${userData.learnerGrade}</p>
            <p><strong>Admission Number:</strong> ${userData.admissionNumber}</p>
        `;
        document.getElementById('learner-section').innerHTML += `<div class="profile-card">${learnerDetails}</div>`;

    } else {
        // Fallback if data is not in sessionStorage
        console.error("User data not found in session storage. Please log in again.");
        // Redirect to login page or show a user-friendly message
    }
}

// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', loadParentProfile);