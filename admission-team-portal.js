// admission-team-portal.js

// === IMPORTANT: Use the URL from the Application Form for fetching submissions ===
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyYCBiHB7oaAchC--LfvJhpAOqOOqVNYtsd90-2g4gHp1LHzkz_7lhrMMvVaD41Pmyr3g/exec';


// Global variable to store all fetched applications for quick access/interaction
let allApplicationsData = [];

// Status options for the Admissions Team
const STATUS_OPTIONS = [
    'New Submission', 
    'In Review', 
    'Interview Scheduled', 
    'Offer Extended', 
    'Offer Accepted',
    'Waitlisted',
    'Rejected'
];

// --- CORE DATA HANDLING & DISPLAY FUNCTIONS ---

/**
 * Loads and displays the list of all submitted applications.
 * This is the main function called by the "Load Data" button and after a status update.
 */
function loadAllApplications() {
    const button = document.getElementById('load-data-btn');
    
    // Check if the button exists before trying to access properties
    const hasButton = !!button; 
    

    // 1. Show Loading State on Button and All Sections
    if (hasButton) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-sync fa-spin"></i> Loading...';
    }
    
    // Clear ALL data containers and show loading message
    const allDataContainers = document.querySelectorAll('.data-table-container');
    allDataContainers.forEach(c => {
        // Updated loading message to be dynamic
        c.innerHTML = '<p class="loading-message"><i class="fas fa-sync fa-spin"></i> Fetching application submissions...</p>';
    });
    
    fetch(APPS_SCRIPT_URL)
        .then(response => {
            const contentType = response.headers.get("content-type");
            if (!response.ok || !contentType || !contentType.includes("application/json")) {
                throw new Error('Apps Script returned an error or non-JSON content. Check deployment permissions.');
            }
            return response.json();
        })
        .then(data => {
            const applications = Array.isArray(data) ? data : (data.data || []);
            allApplicationsData = applications; 
            
            // 2. Update button state and metrics
            if (hasButton) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-database"></i> Reload Applications Data';
            }
            document.getElementById('metric-total-count').textContent = applications.length;

            // 3. Filter and display data in ALL status sections
            // This is the function that automatically sends data to the correct sidebar section
            displayApplicationsByStatus(applications);

        })
        .catch(error => {
            // 4. Handle error state
            if (hasButton) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Load Data Failed (Retry)';
            }
            console.error('Error fetching application data:', error);
            const allDataContainers = document.querySelectorAll('.data-table-container');
            allDataContainers.forEach(c => {
                c.innerHTML = '<p class="error-message"><i class="fas fa-exclamation-triangle"></i> Failed to load application data. Check Apps Script URL and deployment.</p>';
            });
        });
}

/**
 * Filters the main data set and renders tables in the appropriate sections.
 * @param {Array<Object>} applications - The full list of application data.
 */
function displayApplicationsByStatus(applications) {
    
    // Define the status groups using ONLY lowercase strings for robust filtering.
    const groups = {
        'applicant-list-new': ['new submission'], 
        'applicant-list-review': ['in review', 'interview scheduled'],
        'applicant-list-offers': ['offer extended', 'offer accepted'],
        'applicant-list-waitlist': ['waitlisted'],
        'applicant-list-rejected': ['rejected'] 
    };

    let newCount = 0;
    let offersCount = 0; 

    // Filter and render for each group
    for (const containerId in groups) {
        const statuses = groups[containerId];
        
        const filteredData = applications.filter(app => {
            // CRITICAL: Use app["Status"] and convert it to lowercase for case-insensitive filtering
            const sheetStatus = (app["Status"] || 'New Submission').toLowerCase();
            
            // Update Dashboard Metrics while filtering (also check lowercase)
            if (sheetStatus === 'new submission') newCount++;
            if (sheetStatus === 'offer extended' || sheetStatus === 'offer accepted') offersCount++;
            
            // Return true if the normalized status matches one of the target lowercase statuses
            return statuses.includes(sheetStatus);
        });

        const container = document.getElementById(containerId);
        if (container) {
            renderApplicantTable(container, filteredData);
        }
    }

    // Update Dashboard Metrics
    document.getElementById('metric-new-count').textContent = newCount;
    document.getElementById('metric-offers-count').textContent = offersCount;
}

/**
 * Renders the HTML table into a specified container.
 * @param {HTMLElement} container - The DOM element to render the table into.
 * @param {Array<Object>} filteredApplications - The list of applications for this table.
 */
function renderApplicantTable(container, filteredApplications) {
    container.innerHTML = ''; // Clear existing content

    if (filteredApplications.length === 0) {
        // Updated message to be more generic, as data loads automatically
        container.innerHTML = '<p class="info-message">No applications currently found in this stage.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = "data-table admissions-table";
    
    let tableHTML = `
        <thead>
            <tr>
                <th>Date/Time</th>
                <th>Learner Name</th>
                <th>Grade Applied</th>
                <th>Current Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
    `;

    filteredApplications.forEach(app => {
        // Find the index in the original global array (crucial for viewApplicantDetails)
        const originalIndex = allApplicationsData.findIndex(item => 
            item["timestamp"] === app["timestamp"] && 
            item["learner-name"] === app["learner-name"]
        );

        const timestamp = app["timestamp"] || 'N/A';
        const learnerName = `${app["learner-name"] || ''} ${app["learner-surname"] || 'N/A'}`;
        const grade = app["grade"] || 'N/A';
        // Use the corrected header key: "Status"
        const status = app["Status"] || 'New Submission'; 
        const statusClass = status.replace(/\s/g, '-').toLowerCase();
        
        tableHTML += `
            <tr>
                <td>${timestamp}</td>
                <td>${learnerName}</td>
                <td>${grade}</td>
                <td><span class="status-badge status-${statusClass}">${status}</span></td>
                <td>
                    <button onclick="viewApplicantDetails(${originalIndex})" class="applicant-action-btn"><i class="fas fa-search"></i> Details</button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `</tbody>`;
    table.innerHTML = tableHTML;
    container.appendChild(table);
}


/**
 * Handles viewing the full details of an applicant using the global data array index.
 * @param {number} index - The index of the applicant in the allApplicationsData array.
 */
function viewApplicantDetails(index) {
    const applicant = allApplicationsData[index];

    if (!applicant) {
        alert("Applicant record not found.");
        return;
    }

    // Row number is index + 2 (since sheet is 1-based and row 1 is headers)
    const sheetRowNumber = index + 2; 
    const learnerFullName = `${applicant["learner-name"] || ''} ${applicant["learner-surname"] || 'N/A'}`; 
    
    // Keys to exclude from the main details grid for a cleaner view
    // NOTE: The detail view uses the key 'status' as a temporary exclusion, but reads 'Status' for the current status.
    const EXCLUDE_KEYS = ['timestamp', 'Status', 'Row Number']; 

    // Build details view (using the keys from the Google Sheet)
    let detailsHTML = `
        <h3>Application Details: ${learnerFullName}</h3>
        <p><strong>Submission ID (Row):</strong> ${sheetRowNumber}</p>
        <div class="applicant-details-grid">
    `;
    
    for (const key in applicant) {
        if (applicant.hasOwnProperty(key)) {
            // Skip excluded keys
            if (EXCLUDE_KEYS.includes(key)) continue; 

            const readableKey = key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            // Use 'Not Provided' for empty values
            const value = applicant[key] || 'Not Provided';

            detailsHTML += `
                <div class="detail-item">
                    <strong>${readableKey}:</strong> 
                    <span>${value}</span>
                </div>
            `;
        }
    }

    detailsHTML += `</div><hr><h4>Update Application Status</h4>`;

    // Status Dropdown and Update Button
    // Use the corrected header key: "Status"
    const currentStatus = applicant["Status"] || 'New Submission'; 
    
    detailsHTML += `
        <div class="status-update-controls">
            <select id="new-status-${sheetRowNumber}" class="status-dropdown">
                ${STATUS_OPTIONS.map(status => `
                    <option value="${status}" ${currentStatus === status ? 'selected' : ''}>${status}</option>
                `).join('')}
            </select>
            <button onclick="updateApplicantStatus(${sheetRowNumber})" class="btn-primary update-btn">Update Status</button>
        </div>
    `;

    // Modal Display Logic
    const modalContent = document.getElementById('applicant-modal-content');
    const modal = document.getElementById('applicant-details-modal');

    if (modal && modalContent) {
        modalContent.innerHTML = detailsHTML;
        modal.style.display = 'block';

        document.querySelector('.modal-close-btn').onclick = function() {
            modal.style.display = 'none';
        }
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    }
}


/**
 * Sends a request to the Google Apps Script to update the status of a specific row.
 * @param {number} row - The 1-based row number in the Google Sheet.
 */
async function updateApplicantStatus(row) {
    const statusSelect = document.getElementById(`new-status-${row}`);
    const newStatus = statusSelect.value;

    if (!confirm(`Are you sure you want to update Row ${row} to status: ${newStatus} AND send an email update to the applicant?`)) {
        return;
    }
    
    // The Apps Script will handle the status update AND the email sending
    const updateUrl = `${APPS_SCRIPT_URL}?action=updateStatus&row=${row}&status=${encodeURIComponent(newStatus)}`;
    
    try {
        const response = await fetch(updateUrl);
        const result = await response.json();

        if (result.status === 'success') {
            alert(`Status updated successfully to: ${newStatus}!\nAn email notification has been sent.\nRefreshing all tables...`);
            
            document.getElementById('applicant-details-modal').style.display = 'none';
            // CRITICAL: Reload ALL data and re-render ALL tables
            loadAllApplications(); 
        } else {
            alert(`Update Failed: ${result.message || 'Unknown error.'}`);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Network error during status update. Check console for details.');
    }
}


// --- Profile and Navigation Setup ---

function setupPortalNavigation() {
    const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
    const sections = document.querySelectorAll('.portal-section');

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

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const targetId = this.getAttribute('href').substring(1);
            showSection(targetId);
        });
    });

    const initialHash = window.location.hash.substring(1) || 'dashboard';
    showSection(initialHash);
    const initialLink = document.querySelector(`.sidebar ul li a[href="#${initialHash}"]`);
    if (initialLink) {
        initialLink.classList.add('active');
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupPortalNavigation();
    
    // 💥 FIX: Load ALL data automatically upon page load 💥
    window.loadAllApplications(); 
    
    // Expose functions to the global scope for HTML event handlers
    window.viewApplicantDetails = viewApplicantDetails;
    window.loadAllApplications = loadAllApplications;
    window.updateApplicantStatus = updateApplicantStatus; 
});