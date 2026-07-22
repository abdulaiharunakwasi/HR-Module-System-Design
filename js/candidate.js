const API_URL = 'https://hr-module-system.onrender.com';
let currentUser = null;
let jobs = [];
let applications = [];
let selectedFile = null;
let isLoaded = false;

console.log('✅ candidate.js loaded');

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ DOM ready - starting init');
    
    const token = localStorage.getItem('token');
    console.log('📝 Token exists?', !!token);
    
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        await loadAllData();
        setupEventListeners();
        isLoaded = true;
        console.log('✅ All data loaded successfully');
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('Error loading data: ' + error.message, 'error');
    }
});

// ========================================
// LOAD ALL DATA
// ========================================
async function loadAllData() {
    console.log('🔄 Loading data...');
    await loadUserProfile();
    await loadJobs();
    await loadApplications();
}

// ========================================
// LOAD USER PROFILE
// ========================================
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
        console.log('👤 User loaded:', currentUser.username);
        
        document.getElementById('candidateGreeting').textContent = `Welcome, ${currentUser.fullName || currentUser.username}!`;
        document.getElementById('profileFullName').value = currentUser.fullName || '';
        document.getElementById('profileUsername').value = currentUser.username || '';
        document.getElementById('profileEmail').value = currentUser.email || '';
        document.getElementById('profilePhone').value = currentUser.phone || '';
    } catch (error) {
        console.error('❌ Profile error:', error);
        throw error;
    }
}

// ========================================
// LOAD JOBS
// ========================================
async function loadJobs() {
    try {
        const response = await fetch(`${API_URL}/jobs`);
        if (!response.ok) throw new Error('Failed to load jobs');
        
        jobs = await response.json();
        console.log('💼 Jobs loaded:', jobs.length);
        displayJobs(jobs);
    } catch (error) {
        console.error('❌ Jobs error:', error);
        throw error;
    }
}

// ========================================
// DISPLAY JOBS
// ========================================
function displayJobs(jobsToShow) {
    const container = document.getElementById('jobsList');
    if (!container) {
        console.warn('⚠️ jobsList container not found');
        return;
    }
    
    console.log('📊 Displaying', jobsToShow.length, 'jobs');
    
    let html = '';
    
    if (jobsToShow.length === 0) {
        html = `
            <div class="no-results">
                <i class="fas fa-briefcase"></i>
                <p>No jobs available at the moment</p>
            </div>
        `;
    } else {
        jobsToShow.forEach(job => {
            html += `
                <div class="job-card">
                    <div class="job-title">${job.title}</div>
                    <div class="job-department">${job.department || 'Various'}</div>
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
                        <button class="btn-apply" onclick="openApplyModal('${job.id}')">
                            Apply Now
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

// ========================================
// FILTER JOBS
// ========================================
function filterJobs() {
    console.log('🔍 Filtering jobs...');
    const searchTerm = document.getElementById('jobSearch').value.toLowerCase().trim();
    const typeFilter = document.getElementById('jobFilter').value;
    
    let filtered = [...jobs];
    
    if (searchTerm) {
        filtered = filtered.filter(job => 
            job.title.toLowerCase().includes(searchTerm) ||
            job.description.toLowerCase().includes(searchTerm) ||
            (job.department && job.department.toLowerCase().includes(searchTerm))
        );
    }
    
    if (typeFilter !== 'all') {
        filtered = filtered.filter(job => job.type === typeFilter);
    }
    
    displayJobs(filtered);
}

// ========================================
// LOAD APPLICATIONS
// ========================================
async function loadApplications() {
    try {
        const response = await fetch(`${API_URL}/applicants/my-applications`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load applications');
        
        applications = await response.json();
        console.log('📋 Applications loaded:', applications.length);
        displayApplications(applications);
        
        document.getElementById('appCount').textContent = `${applications.length} applications`;
        document.getElementById('appBadge').textContent = applications.length;
    } catch (error) {
        console.error('❌ Applications error:', error);
        throw error;
    }
}

// ========================================
// DISPLAY APPLICATIONS
// ========================================
function displayApplications(apps) {
    const container = document.getElementById('applicationsList');
    if (!container) return;
    
    let html = '';
    
    if (apps.length === 0) {
        html = `
            <div class="no-results">
                <i class="fas fa-file-alt"></i>
                <p>You haven't applied to any jobs yet</p>
            </div>
        `;
    } else {
        apps.forEach(app => {
            html += `
                <div class="application-card">
                    <div class="app-position">${app.position}</div>
                    <div class="app-name">${app.fullName}</div>
                    <div class="app-details">📧 ${app.email}</div>
                    <div class="app-details">📱 ${app.phone}</div>
                    <div class="app-details">💼 ${app.experience} years</div>
                    <div class="app-details">📅 ${new Date(app.appliedDate).toLocaleDateString()}</div>
                    ${app.cvFile ? `
                        <div class="app-details">
                            📄 <a href="#" onclick="downloadCV('${app.cvFile.filename}')" class="cv-link">
                                ${app.cvFile.originalName}
                            </a>
                        </div>
                    ` : ''}
                    ${app.coverLetter ? `
                        <div class="app-cover-letter">
                            💬 ${app.coverLetter.substring(0, 80)}${app.coverLetter.length > 80 ? '...' : ''}
                        </div>
                    ` : ''}
                    <span class="app-status ${app.status}">${app.status || 'pending'}</span>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

// ========================================
// SETUP EVENT LISTENERS
// ========================================
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Tab switching
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Search and filter - use input event for better performance
    document.getElementById('jobSearch').addEventListener('input', filterJobs);
    document.getElementById('jobFilter').addEventListener('change', filterJobs);
    
    // Profile form
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    
    // Apply form
    document.getElementById('applyForm').addEventListener('submit', handleApplySubmit);
    
    // File upload
    setupFileUpload();
    
    // Character counter
    document.getElementById('applyCover').addEventListener('input', function() {
        document.getElementById('charCount').textContent = `${this.value.length} characters`;
    });
    
    console.log('✅ Event listeners set up');
}

// ========================================
// SWITCH TAB
// ========================================
function switchTab(tab) {
    console.log('📑 Switching to tab:', tab);
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const tabMap = {
        'jobs': 'jobsTab',
        'applications': 'applicationsTab',
        'profile': 'profileTab'
    };
    
    document.getElementById(tabMap[tab]).classList.add('active');
}

// ========================================
// OPEN APPLY MODAL
// ========================================
function openApplyModal(jobId) {
    console.log('📝 Opening apply modal for job:', jobId);
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    document.getElementById('jobPreview').innerHTML = `
        <h3>${job.title}</h3>
        <div class="job-preview-meta">
            <span>🏢 ${job.department || 'Various'}</span>
            <span>📍 ${job.location}</span>
            <span>💼 ${job.type}</span>
            <span>💰 ${job.salary}</span>
        </div>
    `;
    
    if (currentUser) {
        document.getElementById('applyFullName').value = currentUser.fullName || '';
        document.getElementById('applyEmail').value = currentUser.email || '';
        document.getElementById('applyPhone').value = currentUser.phone || '';
    }
    
    document.getElementById('applyForm').reset();
    document.getElementById('applyCover').value = '';
    document.getElementById('charCount').textContent = '0 characters';
    removeFile();
    document.getElementById('applyForm').dataset.jobId = jobId;
    document.getElementById('applyModal').classList.add('show');
}

// ========================================
// CLOSE APPLY MODAL
// ========================================
function closeApplyModal() {
    document.getElementById('applyModal').classList.remove('show');
}

// ========================================
// HANDLE APPLY SUBMIT
// ========================================
async function handleApplySubmit(e) {
    e.preventDefault();
    console.log('📤 Submitting application...');
    
    const form = e.target;
    const jobId = form.dataset.jobId;
    const job = jobs.find(j => j.id === jobId);
    const submitBtn = form.querySelector('.btn-submit');
    
    if (!selectedFile) {
        showToast('Please upload your CV/Resume', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('userId', currentUser?.id || '');
    formData.append('jobId', jobId);
    formData.append('position', job?.title || '');
    formData.append('fullName', document.getElementById('applyFullName').value.trim());
    formData.append('email', document.getElementById('applyEmail').value.trim());
    formData.append('phone', document.getElementById('applyPhone').value.trim());
    formData.append('experience', parseInt(document.getElementById('applyExperience').value) || 0);
    formData.append('skills', document.getElementById('applySkills').value.split(',').map(s => s.trim()).filter(s => s).join(','));
    formData.append('coverLetter', document.getElementById('applyCover').value.trim());
    formData.append('cv', selectedFile);
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    try {
        const response = await fetch(`${API_URL}/applicants`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit application');
        }
        
        showToast('Application submitted successfully!', 'success');
        closeApplyModal();
        form.reset();
        removeFile();
        await loadApplications();
    } catch (error) {
        console.error('❌ Submit error:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
    }
}

// ========================================
// HANDLE PROFILE UPDATE
// ========================================
async function handleProfileUpdate(e) {
    e.preventDefault();
    console.log('📝 Updating profile...');
    
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
        document.getElementById('candidateGreeting').textContent = `Welcome, ${updatedUser.fullName || updatedUser.username}!`;
        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('❌ Profile update error:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

// ========================================
// SETUP FILE UPLOAD
// ========================================
function setupFileUpload() {
    const fileInput = document.getElementById('applyCv');
    const uploadArea = document.getElementById('fileUploadArea');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    
    if (!fileInput) return;
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            
            if (!validTypes.includes(file.type)) {
                showToast('Please upload a PDF, DOC, or DOCX file', 'error');
                this.value = '';
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                showToast('File size must be less than 5MB', 'error');
                this.value = '';
                return;
            }
            
            selectedFile = file;
            uploadArea.style.display = 'none';
            fileInfo.style.display = 'flex';
            fileName.textContent = file.name;
        }
    });
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#4F46E5';
        this.style.background = '#EEF2FF';
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = '#D1D5DB';
        this.style.background = 'white';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#D1D5DB';
        this.style.background = 'white';
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        }
    });
}

// ========================================
// REMOVE FILE
// ========================================
function removeFile() {
    const fileInput = document.getElementById('applyCv');
    const uploadArea = document.getElementById('fileUploadArea');
    const fileInfo = document.getElementById('fileInfo');
    
    fileInput.value = '';
    selectedFile = null;
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
}

// ========================================
// DOWNLOAD CV
// ========================================
async function downloadCV(filename) {
    try {
        window.open(`${API_URL}/download-cv/${filename}`, '_blank');
    } catch (error) {
        showToast('Error downloading CV: ' + error.message, 'error');
    }
}

// ========================================
// LOGOUT
// ========================================
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ========================================
// TOAST
// ========================================
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}