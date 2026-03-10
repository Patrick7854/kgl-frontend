/**
 * KGL Groceries LTD - Login Functionality
 * FIXED: No more redirect loops!
 */

// ========================================
// GET FORM ELEMENTS
// ========================================
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const loginBtn = document.getElementById('loginBtn');
const errorContainer = document.getElementById('errorContainer');
const errorText = document.getElementById('errorText');
const rememberMeCheckbox = document.getElementById('rememberMe');

// ========================================
// CLEAR LOGIN FIELDS
// ========================================
function clearLoginFields() {
    console.log('🧹 Clearing login fields...');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (rememberMeCheckbox) rememberMeCheckbox.checked = false;
}

// ========================================
// PAGE LOAD
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded');
    console.log('📍 Current URL:', window.location.href);
    
    clearLoginFields();
    
    // Check if already logged in
    if (localStorage.getItem('kgl_token') && localStorage.getItem('kgl_user')) {
        const user = JSON.parse(localStorage.getItem('kgl_user'));
        console.log('⚠️ Already logged in as:', user.role);
    }

    // Load saved email only if remember me was checked
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail && rememberMeCheckbox.checked) {
        emailInput.value = savedEmail;
    } else {
        localStorage.removeItem('remembered_email');
    }

    emailInput.addEventListener('input', validateEmail);
    passwordInput.addEventListener('input', validatePassword);
    
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
});

// ========================================
// TOGGLE PASSWORD VISIBILITY
// ========================================
togglePasswordBtn.addEventListener('click', function() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    const icon = togglePasswordBtn.querySelector('i');
    icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
});

// ========================================
// FORM SUBMISSION
// ========================================
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    clearErrors();
    
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    
    if (isEmailValid && isPasswordValid) {
        attemptLogin();
    }
});

// ========================================
// VALIDATE EMAIL
// ========================================
function validateEmail() {
    const email = emailInput.value.trim();
    
    if (!email) {
        showFieldError('email', 'Email is required');
        return false;
    }
    
    if (!Validators.email(email)) {
        showFieldError('email', 'Enter a valid email');
        return false;
    }
    
    clearFieldError('email');
    return true;
}

// ========================================
// VALIDATE PASSWORD
// ========================================
function validatePassword() {
    const password = passwordInput.value;
    
    if (!password) {
        showFieldError('password', 'Password is required');
        return false;
    }
    
    if (!Validators.password(password)) {
        showFieldError('password', 'Password must be at least 6 characters');
        return false;
    }
    
    clearFieldError('password');
    return true;
}

// ========================================
// FIELD ERROR HELPERS
// ========================================
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorSpan = document.getElementById(fieldId + 'Error');
    
    if (field) field.classList.add('error');
    if (errorSpan) errorSpan.textContent = message;
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorSpan = document.getElementById(fieldId + 'Error');
    
    if (field) field.classList.remove('error');
    if (errorSpan) errorSpan.textContent = '';
}

function clearErrors() {
    clearFieldError('email');
    clearFieldError('password');
    errorContainer.style.display = 'none';
    errorText.textContent = '';
}

function showErrorMessage(message) {
    errorText.textContent = message;
    errorContainer.style.display = 'flex';
    
    setTimeout(function() {
        errorContainer.style.display = 'none';
    }, 5000);
}

// ========================================
// ATTEMPT LOGIN
// ========================================
async function attemptLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox.checked;
    
    if (!email || !password) {
        showErrorMessage('Please fill in all fields');
        return;
    }
    
    try {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        
        console.log('🔍 Attempting login for:', email);
        
        const response = await APIService.login(email, password);
        console.log('📥 Login response:', response);
        
        if (response && response.success) {
            localStorage.setItem('kgl_user', JSON.stringify(response.user));
            localStorage.setItem('kgl_token', response.token);
            
            if (rememberMe) {
                localStorage.setItem('remembered_email', email);
            } else {
                localStorage.removeItem('remembered_email');
            }
            
            console.log('✅ Login successful! Redirecting to:', response.user.role);
            redirectToDashboard(response.user.role);
        } else {
            throw new Error(response?.message || 'Login failed');
        }
        
    } catch (error) {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        
        console.log('❌ Login error:', error);
        showErrorMessage(error.message || 'Invalid email or password');
        
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// ========================================
// REDIRECT BASED ON ROLE
// ========================================
function redirectToDashboard(role) {
    console.log('➡️ Redirecting to:', role, 'dashboard');
    
    let dashboardPath = '';
    switch(role) {
        case 'Director':
            dashboardPath = 'director/dashboard.html';
            break;
        case 'Manager':
            dashboardPath = 'manager/dashboard.html';
            break;
        case 'Sales':
            dashboardPath = 'sales/dashboard.html';
            break;
        default:
            dashboardPath = 'login.html';
    }
    
    const baseUrl = window.location.origin;
    const newUrl = baseUrl + '/pages/' + dashboardPath;
    
    console.log('🎯 Redirecting to:', newUrl);
    window.location.href = newUrl;
}

// ========================================
// HANDLE PAGE SHOW
// ========================================
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log('📱 Page loaded from cache - clearing fields');
        clearLoginFields();
    }
});

// ========================================
// LOGOUT FUNCTION
// ========================================
function logout() {
    console.log('🚪 Logging out...');
    localStorage.clear();
    window.location.href = '/pages/login.html';
}

// ========================================
// ATTACH LOGOUT TO BUTTONS
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtns = document.querySelectorAll('.logout-btn, #logoutBtn');
    
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });
    
    console.log('🔌 Logout handlers attached to', logoutBtns.length, 'buttons');
});

console.log('🚀 Auth.js loaded - FIXED VERSION with proper logout');