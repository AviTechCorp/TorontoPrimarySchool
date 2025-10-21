// parents-portal.js


// Function to load and display parent profile data
function loadParentProfile() {
  // Retrieve the user data from sessionStorage
  const userData = JSON.parse(sessionStorage.getItem('currentUser'));

  // Update Welcome Header t Display Name
  const portalTitle = document.querySelector('.portal-title');
  if (portalTitle) {
    portalTitle.textContent = `Welcome, ${userData.name} ${userData.surname}!`;
  }
  
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

// ** 2. Portal Section Switching for Usability **
function setupPortalNavigation() {
  const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
  const sections = document.querySelectorAll('.portal-section');

  // Function to show the target section and hide others
  function showSection(targetId) {
    sections.forEach(section => {
      section.classList.remove('active-section');
      section.classList.add('hidden-section');
      if (section.id === targetId) {
        section.classList.add('active-section');
        section.classList.remove('hidden-section');
      }
    });
  }

  // Handle link clicks
  sidebarLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all links
      sidebarLinks.forEach(l => l.classList.remove('active'));
      // Add active class to the clicked link
      this.classList.add('active');
      
      const targetId = this.getAttribute('href').substring(1);
      showSection(targetId);
      
      // Update URL hash
      history.pushState(null, null, `#${targetId}`);
    });
  });

  // Handle page load based on URL hash (default to dashboard)
  const initialHash = window.location.hash.substring(1) || 'dashboard';
  showSection(initialHash);
  const initialLink = document.querySelector(`.sidebar ul li a[href="#${initialHash}"]`);
  if (initialLink) {
    initialLink.classList.add('active');
  }
}

// ** 3. Initialization **
document.addEventListener('DOMContentLoaded', () => {
  loadParentProfile();
  setupPortalNavigation();
});