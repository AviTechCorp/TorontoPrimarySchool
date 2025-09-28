// learners-portal.js

// ** 1. Profile Data Loading **
function loadLearnerProfile() {
  // Using sessionStorage to retrieve data set during a successful login
  const userData = JSON.parse(sessionStorage.getItem('currentUser'));

  if (userData && userData.role === 'learner') {
    const fullName = userData.fullName || 'Valued Learner'; 
    
    // Update Welcome Header
    const learnerNameDisplay = document.getElementById('learner-name-display');
    if (learnerNameDisplay) {
      learnerNameDisplay.textContent = fullName;
    }

    // Update Learner Profile Details
    // NOTE: We use .innerHTML to preserve the <strong> tag
    document.getElementById('profile-name-full').innerHTML = `<strong>Full Name:</strong> ${fullName}`;
    document.getElementById('profile-adm-num').innerHTML = `<strong>Admission No:</strong> ${userData.admissionNumber || 'N/A'}`;
    document.getElementById('profile-grade').innerHTML = `<strong>Current Grade:</strong> Grade ${userData.grade || 'N/A'}`;
    document.getElementById('profile-email').innerHTML = `<strong>Portal Email:</strong> ${userData.email || 'N/A'}`;
    document.getElementById('profile-dob').innerHTML = `<strong>Date of Birth:</strong> ${userData.dob || 'N/A'}`;
    document.getElementById('profile-gender').innerHTML = `<strong>Gender:</strong> ${userData.gender || 'N/A'}`;
    
    // Optional: Populate Parent Info if available in the user data
    // document.getElementById('profile-parent-name').innerHTML = `<strong>Name:</strong> ${userData.parentName || 'N/A'}`;
    // document.getElementById('profile-parent-contact').innerHTML = `<strong>Contact:</strong> ${userData.parentContact || 'N/A'}`;
    // document.getElementById('profile-parent-email').innerHTML = `<strong>Email:</strong> ${userData.parentEmail || 'N/A'}`;

  } else {
    console.error("User data not found or role is not 'learner'. Redirecting.");
    // Secure the page by redirecting if user isn't authenticated as a learner
    window.location.href = 'auth.html'; 
  }
}


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
      
      // Update URL hash for sharing/back button functionality
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
  loadLearnerProfile();
  setupPortalNavigation();
});