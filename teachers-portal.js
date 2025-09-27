// teachers-portal.js

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyELV81r6M6MeGdclMhKKFBAvFVucm1WQC10YgqkCZSfbrK-JGM4wmTFGBa8-iUtRy1AA/exec"; 

// Function to handle the click event on a parent's email.
function loadParentData() {
    const parentDataContainer = document.getElementById('parent-data-container');
    
    parentDataContainer.innerHTML = '<p>Loading parent data...</p>';

    fetch(APPS_SCRIPT_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            parentDataContainer.innerHTML = '';
            const table = document.createElement('table');
            let tableHTML = `<thead><tr><th>Parent Name</th><th>Email</th><th>Learner's Name</th><th>Contact</th></tr></thead><tbody>`;
            data.forEach(parent => {
                const parentEmail = parent["Parent's Email"];
                const learnerName = parent["Learner's Full Name"];
                
                const encodedEmail = encodeURIComponent(parentEmail);
                const encodedName = encodeURIComponent(learnerName);
                
                const contactURL = `${APPS_SCRIPT_URL}?page=compose-message&email=${encodedEmail}&name=${encodedName}`;

                tableHTML += ` <tr>
                                  <td>${parent["Parent's Full Name"]}</td>
                                  <td>${parentEmail}</td>
                                  <td>${learnerName}</td>
                                  <td>
                                      <a href="${contactURL}" class="contact-link" target="_blank">Contact</a>
                                  </td>
                               </tr> `;
            });
            tableHTML += `</tbody>`;
            table.innerHTML = tableHTML;
            parentDataContainer.appendChild(table);
        })
        .catch(error => {
            console.error('Error fetching parent data:', error);
            parentDataContainer.innerHTML = '<p>Failed to load parent data. Please ensure the Apps Script URL is correct and deployed.</p>';
        });
}

// Function to load and display teacher profile data
function loadTeacherProfile() {
    // Retrieve the user data from sessionStorage
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));

    // Check if the user data exists
    if (userData) {
        // Find the profile details elements and update their content
        document.querySelector('#profile .profile-details p:nth-child(1)').innerHTML = `<strong>Surname:</strong> ${userData.surname}`;
        document.querySelector('#profile .profile-details p:nth-child(2)').innerHTML = `<strong>preferredName:</strong> ${userData.preferredName}`;
        document.querySelector('#profile .profile-details p:nth-child(3)').innerHTML = `<strong>Email:</strong> ${userData.email}`;
        
    } else {
        // Fallback if data is not in sessionStorage
        console.error("User data not found in session storage. Please log in again.");
        // Redirect to login page or show a user-friendly message
    }
}

// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', loadTeacherProfile);

// Sidebar navigation functionality
const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
sidebarLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
            e.preventDefault();
            targetSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

document.addEventListener('DOMContentLoaded', loadTeacherProfile);