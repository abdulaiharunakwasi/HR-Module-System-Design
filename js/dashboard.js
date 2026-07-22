const API_URL = 'https://hr-module-system.onrender.com';
let currentUser = null;
let jobs = [];
let applications = [];

// Check auth on load
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    await loadUserProfile();
    await loadJobs();
    await loadApplications();
    setupProfileForm();
    setupApplyForm();
});

// Load user profile
async function loadUserProfile() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'index.html';
            }
            throw new Error('Failed to load profile');
        }
        
        currentUser = await response.json();
        document.getElementById('userGreeting').textContent = `Welcome, ${currentUser.fullName || currentUser.username}!`;
        
        // Fill profile form
        document.getElementById('profileFullName').value = currentUser.fullName || '';
        document.getElementById('profileUsername').value = currentUser.username || '';
        document.getElementById('profileEmail').value = currentUser.email || '';
        document.getElementById('profilePhone').value = currentUser.phone || '';
        document.getElementById('profileRole').value = currentUser.role || '';
    } catch (error) {
        showToast('Error loading profile: ' + error.message, 'error');
    }
}

// Load jobs
async function loadJobs() {
    try {
        const response = await fetch(`${API_URL}/jobs`);
        if (!response.ok) throw new Error('Failed to load jobs');
        
        jobs = await response.json();
        renderJobs(jobs);
    } catch (error) {
        showToast('Error loading jobs: ' + error.message, 'error');
    }
}

// Render jobs
function renderJobs(jobsToRender) {
    const container = document.getElementById('jobsList');
    if (!container) return;
    
    if (jobsToRender.length === 0) {
        container.innerHTML = '<div class="no-results">No jobs available at the moment</div>';
        return;
    }
    
    container.innerHTML = jobsToRender.map(job => `
        <div class="job-card">
            <h3>${job.title}</h3>
            <div class="company">${job.department || 'Various Departments'}</div>
            <div class="job-meta">
                <span>📍 ${job.location}</span>
                <span>💼 ${job.type}</span>
                <span>📅 ${new Date(job.postedDate).toLocaleDateString()}</span>
            </div>
            <div class="job-description">${job.description}</div>
            <div class="job-requirements">
                ${job.requirements.map(req => `<span class="req-tag">${req}</span>`).join('')}
            </div>
            <div class="job-footer">
                <span class="salary">💰 ${job.salary}</span>
                <button class="btn-apply" onclick="openApplyModal('${job.id}')">Apply Now</button>
            </div>
        </div>
    `).join('');
}

// Filter jobs
function filterJobs() {
    const searchTerm = document.getElementById('jobSearch').value.toLowerCase();
    const typeFilter = document.getElementById('jobFilter').value;
    
    let filtered = jobs;
    
    if (searchTerm) {
        filtered = filtered.filter(job => 
            job.title.toLowerCase().includes(searchTerm) ||
            job.description.toLowerCase().includes(searchTerm) ||
            job.department?.toLowerCase().includes(searchTerm)
        );
    }
    
    if (typeFilter !== 'all') {
        filtered = filtered.filter(job => job.type === typeFilter);
    }
    
    renderJobs(filtered);
}

// Load applications
async function loadApplications() {
    try {
        const response = await fetch(`${API_URL}/applicants/my-applications`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load applications');
        
        applications = await response.json();
        renderApplications(applications);
        document.getElementById('appCount').textContent = `${applications.length} applications`;
    } catch (error) {
        showToast('Error loading applications: ' + error.message, 'error');
    }
}

// Render applications
function renderApplications(apps) {
    const container = document.getElementById('applicationsList');
    if (!container) return;
    
    if (apps.length === 0) {
        container.innerHTML = '<div class="no-results">You haven\'t applied to any jobs yet</div>';
        return;
    }
    
    container.innerHTML = apps.map(app => `
        <div class="application-card">
            <h4>${app.position}</h4>
            <div class="app-position">${app.fullName}</div>
            <div class="app-details">📧 ${app.email}</div>
            <div class="app-details">📱 ${app.phone}</div>
            <div class="app-details">💼 ${app.experience} years experience</div>
            <div class="app-details">📅 Applied: ${new Date(app.appliedDate).toLocaleDateString()}</div>
            <span class="app-status ${app.status === 'shortlisted' ? 'status-shortlisted' : 'status-pending'}">
                ${app.status || 'pending'}
            </span>
        </div>
    `).join('');
}

// Open apply modal
function openApplyModal(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    const modal = document.getElementById('applyModal');
    const jobDetails = document.getElementById('jobDetails');
    
    jobDetails.innerHTML = `
        <h3 style="color: #2c3e50;">${job.title}</h3>
        <p style="color: #667eea; font-weight: 500;">${job.department || 'Various Departments'}</p>
        <p style="color: #7f8c8d; font-size: 14px;">📍 ${job.location} | 💼 ${job.type} | 💰 ${job.salary}</p>
    `;
    
    // Pre-fill with user data if available
    if (currentUser) {
        document.getElementById('applyFullName').value = currentUser.fullName || '';
        document.getElementById('applyEmail').value = currentUser.email || '';
        document.getElementById('applyPhone').value = currentUser.phone || '';
    }
    
    // Store job ID for submission
    document.getElementById('applyForm').dataset.jobId = jobId;
    modal.classList.add('show');
}

// Close apply modal
function closeApplyModal() {
    document.getElementById('applyModal').classList.remove('show');
}

// Setup apply form
function setupApplyForm() {
    const form = document.getElementById('applyForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const jobId = form.dataset.jobId;
        const job = jobs.find(j => j.id === jobId);
        
        const applicationData = {
            userId: currentUser?.id || '',
            jobId: jobId,
            position: job?.title || '',
            fullName: document.getElementById('applyFullName').value.trim(),
            email: document.getElementById('applyEmail').value.trim(),
            phone: document.getElementById('applyPhone').value.trim(),
            experience: parseInt(document.getElementById('applyExperience').value),
            skills: document.getElementById('applySkills').value.split(',').map(s => s.trim()).filter(s => s),
            coverLetter: document.getElementById('applyCover').value.trim()
        };
        
        try {
            const response = await fetch(`${API_URL}/applicants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(applicationData)
            });
            
            if (!response.ok) throw new Error('Failed to submit application');
            
            showToast('Application submitted successfully!', 'success');
            closeApplyModal();
            form.reset();
            await loadApplications();
        } catch (error) {
            showToast('Error: ' + error.message, 'error');
        }
    });
}

// Setup profile form
function setupProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updates = {
            fullName: document.getElementById('profileFullName').value.trim(),
            email: document.getElementById('profileEmail').value.trim(),
            phone: document.getElementById('profilePhone').value.trim()
        };
        
        try {
            const response = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) throw new Error('Failed to update profile');
            
            const updatedUser = await response.json();
            currentUser = updatedUser;
            document.getElementById('userGreeting').textContent = `Welcome, ${updatedUser.fullName || updatedUser.username}!`;
            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            showToast('Error: ' + error.message, 'error');
        }
    });
}

// Switch tab
function switchTab(tab) {
    document.querySelectorAll('.candidate-nav .nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tab}Tab`).classList.add('active');
    
    if (tab === 'applications') loadApplications();
}

// Show job form (for HR to post jobs)
function showJobForm() {
    if (currentUser?.role === 'hr' || currentUser?.role === 'admin') {
        window.location.href = 'dashboard.html';
    } else {
        showToast('You need HR or Admin privileges to post jobs', 'error');
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
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