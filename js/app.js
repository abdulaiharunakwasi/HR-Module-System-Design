const API_URL = 'http://localhost:3000/api';
let currentTab = 'applicants';

// DOM Elements
const form = document.getElementById('applicationForm');
const applicantsList = document.getElementById('applicantsList');
const shortlistedList = document.getElementById('shortlistedList');
const totalApplicantsSpan = document.getElementById('totalApplicants');
const shortlistedCountSpan = document.getElementById('shortlistedCount');
const searchInput = document.getElementById('searchInput');
const filterPosition = document.getElementById('filterPosition');

// Fetch all applicants
async function fetchApplicants() {
    try {
        const response = await fetch(`${API_URL}/applicants`);
        if (!response.ok) throw new Error('Failed to fetch applicants');
        return await response.json();
    } catch (error) {
        showToast('Error fetching applicants: ' + error.message, 'error');
        return [];
    }
}

// Fetch shortlisted candidates
async function fetchShortlisted() {
    try {
        const response = await fetch(`${API_URL}/shortlisted`);
        if (!response.ok) throw new Error('Failed to fetch shortlisted');
        return await response.json();
    } catch (error) {
        showToast('Error fetching shortlisted: ' + error.message, 'error');
        return [];
    }
}

// Submit application
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        position: document.getElementById('position').value,
        experience: parseInt(document.getElementById('experience').value),
        skills: document.getElementById('skills').value.split(',').map(s => s.trim()).filter(s => s),
        coverLetter: document.getElementById('coverLetter').value.trim()
    };
    
    try {
        const response = await fetch(`${API_URL}/applicants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Failed to submit application');
        
        showToast('Application submitted successfully!', 'success');
        form.reset();
        loadData();
    } catch (error) {
        showToast('Error submitting application: ' + error.message, 'error');
    }
});

// Shortlist an applicant
async function shortlistApplicant(id) {
    try {
        const response = await fetch(`${API_URL}/shortlist/${id}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to shortlist');
        }
        
        showToast('Applicant shortlisted successfully!', 'success');
        loadData();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Remove from shortlist
async function removeFromShortlist(id) {
    try {
        const response = await fetch(`${API_URL}/shortlist/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove from shortlist');
        }
        
        showToast('Removed from shortlist', 'success');
        loadData();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Delete applicant
async function deleteApplicant(id) {
    if (!confirm('Are you sure you want to delete this applicant?')) return;
    
    try {
        const response = await fetch(`${API_URL}/applicants/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete applicant');
        
        showToast('Applicant deleted successfully', 'success');
        loadData();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Render applicants
function renderApplicants(applicants, container, showShortlist = true) {
    if (!applicants || applicants.length === 0) {
        container.innerHTML = `<div class="no-applicants">No applicants found</div>`;
        return;
    }
    
    container.innerHTML = applicants.map(applicant => `
        <div class="applicant-card">
            <span class="status-badge ${applicant.status === 'shortlisted' ? 'status-shortlisted' : 'status-pending'}">
                ${applicant.status || 'pending'}
            </span>
            <h3>${applicant.fullName}</h3>
            <div class="position">${applicant.position}</div>
            <div class="details">📧 ${applicant.email}</div>
            <div class="details">📱 ${applicant.phone}</div>
            <div class="details">💼 ${applicant.experience} years experience</div>
            <div class="skills">
                ${applicant.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
            ${applicant.coverLetter ? `<div class="details" style="margin-top:5px;font-style:italic;">"${applicant.coverLetter}"</div>` : ''}
            <div class="card-actions">
                ${showShortlist && applicant.status !== 'shortlisted' ? 
                    `<button class="btn-shortlist" onclick="shortlistApplicant('${applicant.id}')">⭐ Shortlist</button>` : 
                    ''
                }
                ${!showShortlist ? 
                    `<button class="btn-remove" onclick="removeFromShortlist('${applicant.id}')">🗑️ Remove</button>` : 
                    ''
                }
                <button class="btn-delete" onclick="deleteApplicant('${applicant.id}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

// Load all data
async function loadData() {
    const [applicants, shortlisted] = await Promise.all([
        fetchApplicants(),
        fetchShortlisted()
    ]);
    
    // Update stats
    totalApplicantsSpan.textContent = `${applicants.length} Applicants`;
    shortlistedCountSpan.textContent = `${shortlisted.length} Shortlisted`;
    
    // Filter applicants
    const searchTerm = searchInput.value.toLowerCase();
    const positionFilter = filterPosition.value;
    
    let filteredApplicants = applicants;
    
    if (searchTerm) {
        filteredApplicants = filteredApplicants.filter(a => 
            a.fullName.toLowerCase().includes(searchTerm) ||
            a.position.toLowerCase().includes(searchTerm) ||
            a.skills.some(s => s.toLowerCase().includes(searchTerm))
        );
    }
    
    if (positionFilter !== 'all') {
        filteredApplicants = filteredApplicants.filter(a => 
            a.position === positionFilter
        );
    }
    
    // Render based on current tab
    if (currentTab === 'applicants') {
        renderApplicants(filteredApplicants, applicantsList, true);
    } else {
        renderApplicants(shortlisted, shortlistedList, false);
    }
}

// Toast notification
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const tab = this.dataset.tab;
        currentTab = tab;
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.getElementById(tab === 'applicants' ? 'applicantsTab' : 'shortlistedTab').classList.add('active');
        loadData();
    });
});

// Search and filter
searchInput.addEventListener('input', loadData);
filterPosition.addEventListener('change', loadData);

// Initial load
loadData();

// Auto-refresh every 30 seconds
setInterval(loadData, 30000);