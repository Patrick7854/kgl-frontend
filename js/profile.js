// ========================================
// Profile Management - Edit profile and picture
// ========================================

let currentUser = null;

// Load user data when page loads
document.addEventListener('DOMContentLoaded', async function() {
    currentUser = APIService.getCurrentUser();
    if (currentUser) {
        displayUserProfile();
    }
    
    // Setup profile edit modal
    setupProfileModal();
});

// Display user profile in sidebar and topbar
function displayUserProfile() {
    // Update all places where user name appears
    document.querySelectorAll('.user-name, #userName, .profile-name').forEach(el => {
        if (el) el.textContent = currentUser.name;
    });
    
    // Update role badges
    document.querySelectorAll('.user-role').forEach(el => {
        if (el) el.textContent = currentUser.role;
    });
    
    // Update profile picture if exists
    const savedPic = localStorage.getItem('profile_pic');
    if (savedPic) {
        document.querySelectorAll('.profile-avatar, .user-avatar').forEach(el => {
            el.innerHTML = `<img src="${savedPic}" class="avatar-image">`;
        });
    }
}

// Setup profile edit modal
function setupProfileModal() {
    // Create modal HTML
    const modalHTML = `
        <div id="profileModal" class="modal">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2><i class="fas fa-user-edit"></i> Edit Profile</h2>
                    <button class="close-modal" onclick="closeProfileModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div class="profile-preview" id="profilePreview" style="width: 100px; height: 100px; border-radius: 50%; background: #1B7F7A; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px;">
                            ${currentUser?.name?.charAt(0) || 'U'}
                        </div>
                        <button onclick="document.getElementById('picUpload').click()" class="btn btn-primary" style="margin-top: 10px;">
                            <i class="fas fa-camera"></i> Change Photo
                        </button>
                        <input type="file" id="picUpload" accept="image/*" style="display: none;" onchange="previewImage(this)">
                    </div>
                    
                    <form id="profileForm">
                        <div class="form-group">
                            <label><i class="fas fa-user"></i> Full Name</label>
                            <input type="text" id="profileName" value="${currentUser?.name || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-envelope"></i> Email</label>
                            <input type="email" id="profileEmail" value="${currentUser?.email || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-phone"></i> Contact</label>
                            <input type="text" id="profileContact" value="${currentUser?.contact || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-store"></i> Branch</label>
                            <input type="text" id="profileBranch" value="${currentUser?.branch || ''}" readonly disabled style="background: #f5f5f5;">
                        </div>
                        
                        <div class="form-group">
                            <label><i class="fas fa-tag"></i> Role</label>
                            <input type="text" id="profileRole" value="${currentUser?.role || ''}" readonly disabled style="background: #f5f5f5;">
                        </div>
                        
                        <button type="submit" class="btn btn-success btn-block">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page if not exists
    if (!document.getElementById('profileModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // Add edit button to topbar if not exists
    addEditProfileButton();
}

// Add edit profile button to topbar
function addEditProfileButton() {
    const topbar = document.querySelector('.topbar .user-info');
    if (topbar && !document.getElementById('editProfileBtn')) {
        const editBtn = document.createElement('button');
        editBtn.id = 'editProfileBtn';
        editBtn.className = 'btn btn-primary';
        editBtn.style.marginRight = '10px';
        editBtn.innerHTML = '<i class="fas fa-user-edit"></i>';
        editBtn.onclick = openProfileModal;
        topbar.insertBefore(editBtn, topbar.firstChild);
    }
}

// Open profile modal
function openProfileModal() {
    document.getElementById('profileModal').classList.add('active');
}

// Close profile modal
function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

// Preview image before upload
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profilePreview');
            preview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            
            // Save to localStorage (in real app, this would upload to server)
            localStorage.setItem('profile_pic', e.target.result);
            
            // Update all avatars
            document.querySelectorAll('.profile-avatar, .user-avatar').forEach(el => {
                el.innerHTML = `<img src="${e.target.result}" class="avatar-image">`;
            });
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Handle profile form submission
document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'profileForm') {
        e.preventDefault();
        
        const updatedUser = {
            name: document.getElementById('profileName').value,
            email: document.getElementById('profileEmail').value,
            contact: document.getElementById('profileContact').value
        };
        
        // Update local storage
        const currentUser = APIService.getCurrentUser();
        const updatedUserData = { ...currentUser, ...updatedUser };
        localStorage.setItem('kgl_user', JSON.stringify(updatedUserData));
        
        // Update UI
        displayUserProfile();
        
        // Show success message
        alert('Profile updated successfully!');
        closeProfileModal();
        
        // In real app, you would also update backend
        // updateUserOnServer(updatedUser);
    }
});

// Add CSS for avatar images
const style = document.createElement('style');
style.textContent = `
    .avatar-image {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
    }
    
    .profile-avatar, .user-avatar {
        overflow: hidden;
    }
    
    #editProfileBtn {
        padding: 8px 12px;
        border-radius: 8px;
    }
    
    .profile-preview img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
    }
`;
document.head.appendChild(style);