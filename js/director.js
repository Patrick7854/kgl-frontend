/**
 * KARIBU GROCERIES LTD (KGL) - Director Dashboard
 * FULLY WORKING VERSION - Add/Delete/Edit Users
 * UPDATED: Fixed stock values, sales data, credit data, added edit functionality
 * Branches: MAGANJO and MATUGGA
 * Director: Mr. Orban
 */

// ========================================
// GLOBAL VARIABLES
// ========================================
let usersList = [];

// ========================================
// CHECK AUTHENTICATION - UPDATED
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Director Dashboard loaded');
    
    // Check if user is logged in
    if (!APIService.isAuthenticated()) {
        console.log('❌ Not authenticated, redirecting');
        window.location.href = '/frontend/pages/login.html';
        return;
    }
    
    // Get current user
    const user = APIService.getCurrentUser();
    console.log('🔍 [DEBUG] Current user from storage:', user);
    
    // Verify user is Director
    if (user.role !== 'Director') {
        console.log('❌ Access denied');
        alert('Access denied. Director only.');
        APIService.redirectToDashboard(user.role);
        return;
    }
    
    console.log('✅ Authenticated as:', user.name);
    
    // Update UI with user name
    updateUserInfo(user);
    
    // Load users
    await loadUsers();
    
    // Load real stock and sales data
    await loadStockData();
    await loadTodaysSales();
    await loadCreditData();
    
    // Setup modal
    setupModal();
});

// ========================================
// UPDATE USER INFO
// ========================================
function updateUserInfo(user) {
    const userNameElements = document.querySelectorAll('#userName');
    userNameElements.forEach(el => {
        if (el) el.textContent = user.name;
    });
}

// ========================================
// LOAD USERS (WITH DEBUG)
// ========================================
async function loadUsers() {
    try {
        showLoading(true);
        
        // Get token from localStorage
        const token = localStorage.getItem('kgl_token');
        console.log('🔍 [DEBUG] Token from localStorage:', token ? 'Token exists (length: ' + token.length + ')' : 'NO TOKEN');
        
        if (!token) {
            console.log('❌ [DEBUG] No token found! User might need to login again.');
            window.location.href = '/frontend/pages/login.html';
            return;
        }
        
        // Call API with token
        console.log('🔍 [DEBUG] Calling APIService.getUsers...');
        const response = await APIService.getUsers(token);
        
        if (response.success) {
            usersList = response.users;
            
            // Update total users display
            const totalUsersEl = document.getElementById('totalUsers');
            if (totalUsersEl) {
                totalUsersEl.textContent = usersList.length;
            }
            
            displayUsers();
            console.log(`✅ Loaded ${usersList.length} users`);
        } else {
            console.log('❌ API returned error:', response.message);
            // If token is invalid, redirect to login
            if (response.message === 'No token, authorization denied' || 
                response.message === 'Token is not valid') {
                alert('Session expired. Please login again.');
                APIService.logout();
            }
        }
    } catch (error) {
        console.log('❌ Error loading users:', error);
        usersList = [];
        displayUsers();
    } finally {
        showLoading(false);
    }
}

// ========================================
// LOAD STOCK DATA FOR DASHBOARD
// ========================================
async function loadStockData() {
    try {
        const token = localStorage.getItem('kgl_token');
        
        if (!token) {
            console.log('❌ No token found');
            return;
        }
        
        console.log('🔍 Fetching stock data...');
        const response = await APIService.getProduce(null, token);
        
        if (response.success) {
            const produce = response.produce || [];
            
            // Calculate totals per branch
            let maganjoStock = 0;
            let matuggaStock = 0;
            let totalStock = 0;
            
            produce.forEach(item => {
                const value = item.tonnage * (item.sellingPrice || 0);
                totalStock += value;
                
                if (item.branch === 'MAGANJO') {
                    maganjoStock += value;
                } else if (item.branch === 'MATUGGA') {
                    matuggaStock += value;
                }
            });
            
            // Update UI
            updateStockDisplay(totalStock, maganjoStock, matuggaStock);
            
            console.log(`✅ Stock values updated: MAGANJO=${maganjoStock}, MATUGGA=${matuggaStock}`);
        }
    } catch (error) {
        console.log('❌ Error loading stock:', error);
    }
}

// ========================================
// UPDATE STOCK DISPLAY
// ========================================
function updateStockDisplay(totalStock, maganjoStock, matuggaStock) {
    // Update main stock value in stats grid
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        const heading = card.querySelector('h3');
        if (heading && heading.textContent.includes('Total Stock')) {
            const valueEl = card.querySelector('p');
            if (valueEl) {
                valueEl.textContent = 'UGX ' + totalStock.toLocaleString();
            }
        }
    });
    
    // Update MAGANJO stock value
    const maganjoSections = document.querySelectorAll('.branch-section');
    if (maganjoSections.length > 0) {
        const maganjoCards = maganjoSections[0].querySelectorAll('.stat-card');
        if (maganjoCards.length > 1) {
            const stockValueEl = maganjoCards[1].querySelector('p');
            if (stockValueEl) {
                stockValueEl.textContent = 'UGX ' + maganjoStock.toLocaleString();
            }
        }
    }
    
    // Update MATUGGA stock value
    if (maganjoSections.length > 1) {
        const matuggaCards = maganjoSections[1].querySelectorAll('.stat-card');
        if (matuggaCards.length > 1) {
            const stockValueEl = matuggaCards[1].querySelector('p');
            if (stockValueEl) {
                stockValueEl.textContent = 'UGX ' + matuggaStock.toLocaleString();
            }
        }
    }
}

// ========================================
// LOAD TODAY'S SALES
// ========================================
async function loadTodaysSales() {
    try {
        const token = localStorage.getItem('kgl_token');
        
        if (!token) {
            console.log('❌ No token found');
            return;
        }
        
        console.log('🔍 Fetching sales data...');
        const response = await APIService.getSales(token);
        
        if (response.success) {
            const sales = response.sales || [];
            
            // Get today's date
            const today = new Date().toDateString();
            
            // Filter today's sales
            const todaysSales = sales.filter(sale => 
                new Date(sale.dateTime).toDateString() === today
            );
            
            // Calculate totals per branch
            let maganjoToday = 0;
            let matuggaToday = 0;
            
            todaysSales.forEach(sale => {
                if (sale.branch === 'MAGANJO') {
                    maganjoToday += sale.amountPaid || 0;
                } else if (sale.branch === 'MATUGGA') {
                    matuggaToday += sale.amountPaid || 0;
                }
            });
            
            // Update UI
            updateSalesDisplay(maganjoToday, matuggaToday);
            
            console.log(`✅ Today's sales: MAGANJO=${maganjoToday}, MATUGGA=${matuggaToday}`);
        }
    } catch (error) {
        console.log('❌ Error loading sales:', error);
    }
}

// ========================================
// UPDATE SALES DISPLAY
// ========================================
function updateSalesDisplay(maganjoToday, matuggaToday) {
    const maganjoSections = document.querySelectorAll('.branch-section');
    
    // Update MAGANJO today's sales
    if (maganjoSections.length > 0) {
        const maganjoCards = maganjoSections[0].querySelectorAll('.stat-card');
        if (maganjoCards.length > 2) {
            const salesValueEl = maganjoCards[2].querySelector('p');
            if (salesValueEl) {
                salesValueEl.textContent = 'UGX ' + maganjoToday.toLocaleString();
            }
        }
    }
    
    // Update MATUGGA today's sales
    if (maganjoSections.length > 1) {
        const matuggaCards = maganjoSections[1].querySelectorAll('.stat-card');
        if (matuggaCards.length > 2) {
            const salesValueEl = matuggaCards[2].querySelector('p');
            if (salesValueEl) {
                salesValueEl.textContent = 'UGX ' + matuggaToday.toLocaleString();
            }
        }
    }
    
    // Update total sales in stats grid
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        const heading = card.querySelector('h3');
        if (heading && heading.textContent.includes('Total Sales')) {
            const valueEl = card.querySelector('p');
            if (valueEl) {
                valueEl.textContent = 'UGX ' + (maganjoToday + matuggaToday).toLocaleString();
            }
        }
    });
}

// ========================================
// LOAD CREDIT DATA
// ========================================
async function loadCreditData() {
    try {
        const token = localStorage.getItem('kgl_token');
        
        if (!token) {
            console.log('❌ No token found');
            return;
        }
        
        console.log('🔍 Fetching credit sales data...');
        const response = await APIService.getCreditSales(token);
        
        if (response.success) {
            const creditSales = response.creditSales || [];
            
            // Calculate pending credit
            const pendingCredit = creditSales
                .filter(c => c.status === 'Pending')
                .reduce((sum, c) => sum + (c.amountDue || 0), 0);
            
            // Update credit sales in stats grid
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach(card => {
                const heading = card.querySelector('h3');
                if (heading && heading.textContent.includes('Credit Sales')) {
                    const valueEl = card.querySelector('p');
                    if (valueEl) {
                        valueEl.textContent = 'UGX ' + pendingCredit.toLocaleString();
                    }
                }
            });
            
            console.log(`✅ Credit data updated: ${pendingCredit}`);
        }
    } catch (error) {
        console.log('❌ Error loading credit:', error);
    }
}

// ========================================
// SHOW LOADING
// ========================================
function showLoading(show) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    if (show) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 30px; color: var(--gold-primary);"></i>
                    <p style="margin-top: 10px;">Loading users...</p>
                </td>
            </tr>
        `;
    }
}

// ========================================
// DISPLAY USERS
// ========================================
function displayUsers() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (usersList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-users" style="font-size: 30px; color: var(--gray-medium);"></i>
                    <p style="margin-top: 10px;">No users found</p>
                </td>
            </tr>
        `;
        updateUserCount();
        return;
    }
    
    usersList.forEach(user => {
        addUserRow(user);
    });
    
    updateUserCount();
}

// ========================================
// 🟢 UPDATED: ADD USER ROW WITH EDIT BUTTON
// ========================================
function addUserRow(user) {
    const tableBody = document.getElementById('usersTableBody');
    
    const row = document.createElement('tr');
    row.setAttribute('data-user-id', user.id || user._id);
    
    let roleClass = '';
    let roleDisplay = user.role;
    
    if (user.role === 'Manager') {
        roleClass = 'manager';
        roleDisplay = 'Manager';
    } else if (user.role === 'Sales') {
        roleClass = 'sales';
        roleDisplay = 'Sales Agent';
    } else if (user.role === 'Director') {
        roleClass = 'director';
        roleDisplay = 'Director';
    }
    
    row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td><span class="role-badge ${roleClass}">${roleDisplay}</span></td>
        <td>${user.branch}</td>
        <td>${user.contact}</td>
        <td>
            <button class="action-btn edit" title="Edit User" ${user.role === 'Director' ? 'disabled' : ''}>
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" title="Delete User" ${user.role === 'Director' ? 'disabled' : ''}>
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tableBody.appendChild(row);
    
    // Add event listeners
    const editBtn = row.querySelector('.action-btn.edit');
    if (editBtn && user.role !== 'Director') {
        editBtn.addEventListener('click', () => openEditModal(user, row));
    }
    
    const deleteBtn = row.querySelector('.action-btn.delete');
    if (deleteBtn && user.role !== 'Director') {
        deleteBtn.addEventListener('click', () => deleteUser(user.id || user._id, row));
    }
}

// ========================================
// 🟢 NEW: OPEN EDIT MODAL
// ========================================
function openEditModal(user, row) {
    // Create edit modal HTML
    const editModalHTML = `
        <div id="editUserModal" class="modal active">
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-user-edit"></i> Edit User</h2>
                    <button class="close-modal" onclick="document.getElementById('editUserModal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editUserForm">
                        <input type="hidden" id="editUserId" value="${user._id || user.id}">
                        
                        <div class="form-group">
                            <label for="editName">
                                <i class="fas fa-user"></i> Full Name
                            </label>
                            <input type="text" id="editName" value="${user.name}" required>
                        </div>

                        <div class="form-group">
                            <label for="editEmail">
                                <i class="fas fa-envelope"></i> Email
                            </label>
                            <input type="email" id="editEmail" value="${user.email}" readonly style="background: #f5f5f5;">
                            <small style="color: var(--gray-dark);">Email cannot be changed</small>
                        </div>

                        <div class="form-group">
                            <label for="editRole">
                                <i class="fas fa-user-tag"></i> Role
                            </label>
                            <select id="editRole" required>
                                <option value="Manager" ${user.role === 'Manager' ? 'selected' : ''}>Manager</option>
                                <option value="Sales" ${user.role === 'Sales' ? 'selected' : ''}>Sales Agent</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="editBranch">
                                <i class="fas fa-store"></i> Branch
                            </label>
                            <select id="editBranch" required>
                                <option value="MAGANJO" ${user.branch === 'MAGANJO' ? 'selected' : ''}>MAGANJO</option>
                                <option value="MATUGGA" ${user.branch === 'MATUGGA' ? 'selected' : ''}>MATUGGA</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="editContact">
                                <i class="fas fa-phone"></i> Phone Number
                            </label>
                            <input type="text" id="editContact" value="${user.contact}" required>
                        </div>

                        <div class="form-group">
                            <label for="editPassword">
                                <i class="fas fa-lock"></i> New Password (leave blank to keep current)
                            </label>
                            <input type="password" id="editPassword" placeholder="Enter new password">
                            <small style="color: var(--gray-dark);">Minimum 6 characters</small>
                        </div>

                        <button type="submit" class="btn btn-success btn-block">
                            <i class="fas fa-save"></i> Update User
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing edit modal
    const existingModal = document.getElementById('editUserModal');
    if (existingModal) existingModal.remove();
    
    // Add new modal to page
    document.body.insertAdjacentHTML('beforeend', editModalHTML);
    
    // Handle form submission
    document.getElementById('editUserForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('editUserId').value;
        const userData = {
            name: document.getElementById('editName').value.trim(),
            role: document.getElementById('editRole').value,
            branch: document.getElementById('editBranch').value,
            contact: document.getElementById('editContact').value.trim()
        };
        
        const newPassword = document.getElementById('editPassword').value;
        
        // Validate
        if (!userData.name || userData.name.length < 3) {
            alert('Name must be at least 3 characters');
            return;
        }
        
        if (!userData.contact || userData.contact.length < 10) {
            alert('Valid phone number required');
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            submitBtn.disabled = true;
            
            const token = localStorage.getItem('kgl_token');
            
            // If password provided, add to update
            if (newPassword && newPassword.length >= 6) {
                userData.password = newPassword;
            }
            
            const response = await APIService.updateUser(userId, userData, token);
            
            if (response.success) {
                alert('✅ User updated successfully!');
                
                // Update the row in the table
                const nameCell = row.cells[0];
                const roleCell = row.cells[2];
                const branchCell = row.cells[3];
                const contactCell = row.cells[4];
                
                nameCell.textContent = userData.name;
                branchCell.textContent = userData.branch;
                contactCell.textContent = userData.contact;
                
                // Update role badge
                let roleClass = '';
                let roleDisplay = userData.role;
                
                if (userData.role === 'Manager') {
                    roleClass = 'manager';
                    roleDisplay = 'Manager';
                } else if (userData.role === 'Sales') {
                    roleClass = 'sales';
                    roleDisplay = 'Sales Agent';
                }
                
                roleCell.innerHTML = `<span class="role-badge ${roleClass}">${roleDisplay}</span>`;
                
                // Close modal
                document.getElementById('editUserModal').remove();
                
                // Update usersList
                const index = usersList.findIndex(u => (u._id || u.id) === userId);
                if (index !== -1) {
                    usersList[index] = { ...usersList[index], ...userData };
                }
                
            } else {
                alert('❌ Error: ' + (response.message || 'Failed to update user'));
            }
        } catch (error) {
            console.log('❌ Error:', error);
            alert('Error updating user');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ========================================
// DELETE USER
// ========================================
async function deleteUser(userId, row) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        row.style.opacity = '0.5';
        
        const token = localStorage.getItem('kgl_token');
        const response = await APIService.deleteUser(userId, token);
        
        if (response.success) {
            usersList = usersList.filter(u => (u.id || u._id) !== userId);
            row.remove();
            updateUserCount();
            
            // Update total users display
            const totalUsersEl = document.getElementById('totalUsers');
            if (totalUsersEl) {
                totalUsersEl.textContent = usersList.length;
            }
            
            alert('User deleted successfully');
            console.log('✅ User deleted');
        }
    } catch (error) {
        console.log('❌ Error deleting user:', error);
        alert(error.message || 'Error deleting user');
        row.style.opacity = '1';
    }
}

// ========================================
// UPDATE USER COUNT
// ========================================
function updateUserCount() {
    const countElement = document.getElementById('userCount');
    if (countElement) {
        countElement.textContent = usersList.length;
    }
}

// ========================================
// SETUP MODAL
// ========================================
function setupModal() {
    const addUserBtn = document.getElementById('addUserBtn');
    const modal = document.getElementById('userModal');
    const closeBtn = document.getElementById('closeModal');
    const form = document.getElementById('createUserForm');
    
    // Open modal
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });
    }
    
    // Close modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            form.reset();
        });
    }
    
    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            form.reset();
        }
    });
    
    // Handle form submit
    if (form) {
        form.addEventListener('submit', createUser);
    }
}

// ========================================
// CREATE USER
// ========================================
async function createUser(e) {
    e.preventDefault();
    
    const userData = {
        name: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        role: document.getElementById('role').value,
        branch: document.getElementById('branch').value,
        contact: document.getElementById('contact').value.trim(),
        password: document.getElementById('password').value
    };
    
    // Validate
    if (!await validateUser(userData)) return;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitBtn.disabled = true;
        
        const token = localStorage.getItem('kgl_token');
        const response = await APIService.createUser(userData, token);
        
        if (response.success) {
            usersList.push(response.user);
            addUserRow(response.user);
            updateUserCount();
            
            // Update total users display
            const totalUsersEl = document.getElementById('totalUsers');
            if (totalUsersEl) {
                totalUsersEl.textContent = usersList.length;
            }
            
            // Close and reset
            document.getElementById('userModal').classList.remove('active');
            e.target.reset();
            
            alert('User created successfully!');
            console.log('✅ User created:', response.user);
        } else {
            alert(response.message || 'Error creating user');
        }
    } catch (error) {
        console.log('❌ Error:', error);
        alert('Error creating user');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ========================================
// VALIDATE USER
// ========================================
async function validateUser(data) {
    // Basic validations first
    if (!data.name || data.name.length < 3) {
        alert('Name must be at least 3 characters');
        return false;
    }
    
    if (!data.email || !data.email.includes('@')) {
        alert('Valid email required');
        return false;
    }
    
    if (!data.role) {
        alert('Please select a role');
        return false;
    }
    
    if (!data.branch) {
        alert('Please select a branch');
        return false;
    }
    
    if (!data.contact || data.contact.length < 10) {
        alert('Valid phone number required');
        return false;
    }
    
    if (!data.password || data.password.length < 6) {
        alert('Password must be at least 6 characters');
        return false;
    }
    
    // Check email directly from database
    try {
        const token = localStorage.getItem('kgl_token');
        
        // Get fresh list of users from database
        const response = await APIService.getUsers(token);
        
        if (response.success) {
            const freshUsersList = response.users || [];
            
            // Check if email exists in fresh list
            const emailExists = freshUsersList.some(u => u.email === data.email);
            
            if (emailExists) {
                alert('❌ This email already exists in the database!');
                console.log('Existing emails:', freshUsersList.map(u => u.email));
                return false;
            }
        }
    } catch (error) {
        console.log('❌ Error checking email:', error);
        // If we can't check, warn but continue
        if (!confirm('Could not verify email uniqueness. Continue anyway?')) {
            return false;
        }
    }
    
    return true;
}

// ========================================
// LOGOUT
// ========================================
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        APIService.logout();
    });
}

// ========================================
// AUTO-REFRESH DATA EVERY 30 SECONDS
// ========================================
setInterval(async () => {
    console.log('🔄 Auto-refreshing dashboard data...');
    await loadStockData();
    await loadTodaysSales();
    await loadCreditData();
}, 30000);

console.log('🚀 Director.js loaded - FULLY WORKING with EDIT');

// ========================================
// INITIALIZE CHARTS
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // Sales Chart
    const salesCtx = document.getElementById('salesChart')?.getContext('2d');
    if (salesCtx) {
        new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'Sales (UGX)',
                    data: [110, 115, 120, 115, 110, 105, 145],
                    borderColor: '#1B7F7A',
                    backgroundColor: 'rgba(27, 127, 122, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#1B7F7A',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => 'UGX ' + ctx.raw + 'K'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#E9EDF2' }
                    }
                }
            }
        });
    }
    
    // Stock Chart
    const stockCtx = document.getElementById('stockChart')?.getContext('2d');
    if (stockCtx) {
        new Chart(stockCtx, {
            type: 'doughnut',
            data: {
                labels: ['In Stock', 'Low Stock', 'Out of Stock'],
                datasets: [{
                    data: [65, 20, 15],
                    backgroundColor: ['#0F766E', '#B45309', '#B91C1C'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
});