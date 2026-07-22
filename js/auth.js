const API_URL = 'https://hr-module-system.onrender.com/api';

// Switch between login and register tabs
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab');
    
    if (tab === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        tabs.forEach((t, i) => {
            t.classList.toggle('active', i === 0);
        });
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        tabs.forEach((t, i) => {
            t.classList.toggle('active', i === 1);
        });
    }
}

// Check auth and redirect
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        if (window.location.pathname.includes('dashboard.html') || 
            window.location.pathname.includes('candidate-dashboard.html')) {
            window.location.href = 'index.html';
        }
        return false;
    }
    
    // Redirect based on role
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        if (user.role === 'candidate') {
            window.location.href = 'candidate-dashboard.html';
        } else {
            window.location.href = 'dashboard.html';
        }
        return false;
    }
    
    // Check if user has access to current page
    if (window.location.pathname.includes('dashboard.html') && user.role === 'candidate') {
        window.location.href = 'candidate-dashboard.html';
        return false;
    }
    
    if (window.location.pathname.includes('candidate-dashboard.html') && 
        (user.role === 'hr' || user.role === 'admin')) {
        window.location.href = 'dashboard.html';
        return false;
    }
    
    return true;
}

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    // Check auth status
    if (window.location.pathname.includes('dashboard.html') || 
        window.location.pathname.includes('candidate-dashboard.html')) {
        checkAuth();
    }
    
    // LOGIN FORM
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            
            if (!username || !password) {
                showToast('Please enter username and password', 'error');
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }
                
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                showToast('Login successful!', 'success');
                
                setTimeout(() => {
                    if (data.user.role === 'candidate') {
                        window.location.href = 'candidate-dashboard.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 500);
            } catch (error) {
                showToast('Login failed: ' + error.message, 'error');
            }
        });
    }
    
    // REGISTER FORM
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fullName = document.getElementById('registerFullName').value.trim();
            const username = document.getElementById('registerUsername').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const phone = document.getElementById('registerPhone').value.trim();
            const password = document.getElementById('registerPassword').value;
            const role = document.getElementById('registerRole').value;
            
            // Validation
            if (!fullName || !username || !email || !password) {
                showToast('Please fill in all required fields', 'error');
                return;
            }
            
            if (password.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }
            
            if (!email.includes('@')) {
                showToast('Please enter a valid email address', 'error');
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        fullName, 
                        username, 
                        email, 
                        phone, 
                        password, 
                        role 
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Registration failed');
                }
                
                showToast('Account created successfully! Please login.', 'success');
                
                // Clear form
                registerForm.reset();
                
                // Switch to login tab after 1 second
                setTimeout(() => {
                    switchTab('login');
                }, 1000);
                
            } catch (error) {
                showToast('Registration failed: ' + error.message, 'error');
            }
        });
    }
});

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
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}