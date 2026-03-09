// frontend/js/base.js
// This file helps all pages find the right paths

// This detects if we're on a real website or on your computer
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';

// This sets the base path for all links
const BASE_PATH = isLocal ? '/frontend' : '';

console.log('📍 Base path set to:', BASE_PATH);
console.log('💻 Running on:', isLocal ? 'Local computer' : 'Live website');