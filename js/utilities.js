/**
 * KGL Groceries LTD - Validation Utilities
 * Contains helper functions for form validation
 */

// ========================================
// VALIDATION FUNCTIONS
// ========================================

const Validators = {
    // Check if email is valid
    email: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Check if password is at least 6 characters
    password: function(password) {
        return password && password.length >= 6;
    },

    // Check if phone number is valid (Ugandan format)
    phone: function(phone) {
        const phoneRegex = /^(?:\+256|0)[0-9]{9}$/;
        return phoneRegex.test(phone);
    },

    // Check if text meets minimum length
    text: function(text, minLength = 2) {
        return text && text.trim().length >= minLength;
    },

    // Check if amount is valid
    amount: function(amount, minDigits = 5) {
        const num = parseFloat(amount);
        if (isNaN(num) || num <= 0) return false;
        return amount.toString().length >= minDigits;
    },

    // Check if tonnage is valid
    tonnage: function(tonnage, isProcurement = false) {
        const num = parseFloat(tonnage);
        if (isNaN(num) || num <= 0) return false;
        if (isProcurement && num < 1000) return false;
        return true;
    },

    // Check if date is not empty
    date: function(date) {
        return date && date.trim() !== '';
    },

    // Check if time is not empty
    time: function(time) {
        return time && time.trim() !== '';
    },

    // Check if NIN is valid
    nin: function(nin) {
        const ninRegex = /^[A-Z0-9]{14}$/;
        return ninRegex.test(nin);
    }
};

// ========================================
// UI HELPER FUNCTIONS
// ========================================

const UIHelpers = {
    // Show error on a specific field
    showFieldError: function(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorSpan = document.getElementById(fieldId + 'Error');
        
        if (field) {
            field.classList.add('error');
        }
        
        if (errorSpan) {
            errorSpan.textContent = message;
        }
    },

    // Clear error from a field
    clearFieldError: function(fieldId) {
        const field = document.getElementById(fieldId);
        const errorSpan = document.getElementById(fieldId + 'Error');
        
        if (field) {
            field.classList.remove('error');
        }
        
        if (errorSpan) {
            errorSpan.textContent = '';
        }
    },

    // Show loading spinner on button
    showLoading: function(button) {
        if (button) {
            button.classList.add('loading');
            button.disabled = true;
        }
    },

    // Hide loading spinner on button
    hideLoading: function(button) {
        if (button) {
            button.classList.remove('loading');
            button.disabled = false;
        }
    },

    // Format currency
    formatCurrency: function(amount) {
        return 'UGX ' + amount.toLocaleString();
    },

    // Show message
    showToast: function(message, type = 'success') {
        alert(message);
    }
};