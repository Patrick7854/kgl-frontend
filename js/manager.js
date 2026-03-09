/**
 * KARIBU GROCERIES LTD (KGL) - Manager Dashboard
 * Branches: MAGANJO and MATUGGA
 * Manager can: Add stock, record sales, credit sales, view inventory
 * FULLY FIXED - Procurement and Today's Sales now work!
 */

// ========================================
// GLOBAL VARIABLES
// ========================================
let currentUser = null;
let currentBranch = '';
let produceList = [];

// ========================================
// CHECK AUTHENTICATION
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Manager Dashboard loaded');
    
    // Check if user is logged in
    if (!APIService.isAuthenticated()) {
        console.log('❌ Not authenticated, redirecting');
        window.location.href = '/frontend/pages/login.html';
        return;
    }
    
    // Get current user
    currentUser = APIService.getCurrentUser();
    
    // Verify user is Manager
    if (currentUser.role !== 'Manager') {
        console.log('❌ Access denied');
        alert('Access denied. Manager only.');
        APIService.redirectToDashboard(currentUser.role);
        return;
    }
    
    currentBranch = currentUser.branch;
    console.log('✅ Authenticated as:', currentUser.name);
    console.log('🏢 Branch:', currentBranch);
    
    // Update UI with user info
    updateUserInfo();
    
    // Load produce for this branch
    await loadProduce();
    
    // Load today's sales
    await loadTodaysSales();
    
    // Setup page based on which page we're on
    setupPage();
    
    // Auto-refresh every 10 seconds
    setInterval(async () => {
        console.log('🔄 Auto-refreshing inventory...');
        await loadProduce();
        await loadTodaysSales();
    }, 10000);
});

// ========================================
// UPDATE USER INFO
// ========================================
function updateUserInfo() {
    // Update user name
    const userNameElements = document.querySelectorAll('#userName');
    userNameElements.forEach(el => {
        if (el) el.textContent = currentUser.name;
    });
    
    // Update branch name
    const branchElements = document.querySelectorAll('#branchName, #branchDisplay');
    branchElements.forEach(el => {
        if (el) el.textContent = currentBranch + ' Branch';
    });
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
        
        console.log('💰 Fetching today\'s sales...');
        
        const response = await APIService.getSales(token, true);
        
        let todaySalesAmount = 0;
        
        if (response && response.success) {
            todaySalesAmount = response.sales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
            console.log(`💰 Today's sales total: UGX ${todaySalesAmount}`);
        }
        
        const todaySalesEl = document.getElementById('todaySales');
        if (todaySalesEl) {
            todaySalesEl.textContent = 'UGX ' + todaySalesAmount.toLocaleString();
        }
        
    } catch (error) {
        console.log('❌ Error loading today\'s sales:', error);
    }
}

// ========================================
// LOAD PRODUCE FROM API
// ========================================
async function loadProduce() {
    try {
        const token = localStorage.getItem('kgl_token');
        
        if (!token) {
            console.log('❌ No token found! Redirecting to login...');
            window.location.href = '/frontend/pages/login.html';
            return;
        }
        
        console.log('🔍 Fetching produce for branch:', currentBranch);
        
        showLoadingInAllTables();
        
        const response = await APIService.getProduce(currentBranch, token);
        
        console.log('📥 Load produce response:', response);
        
        if (response && response.success) {
            produceList = response.produce || [];
            console.log(`✅ Loaded ${produceList.length} produce items`);
            
            updateInventoryDisplay();
            updateDashboardStats();
            updateAllDropdowns();
            
            if (document.getElementById('inventoryTableBody')) {
                updateInventoryDisplay();
            }
            
            checkLowStock();
            
        } else {
            console.log('❌ Failed to load produce:', response?.message);
            produceList = [];
            showEmptyState();
        }
    } catch (error) {
        console.log('❌ Error loading produce:', error);
        produceList = [];
        showErrorState();
    }
}

// ========================================
// SHOW LOADING IN ALL TABLES
// ========================================
function showLoadingInAllTables() {
    const tables = [
        'inventoryTableBody',
        'recentInventoryBody',
        'stockBody'
    ];
    
    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 30px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 30px; color: var(--gold-primary);"></i>
                        <p style="margin-top: 10px;">Loading inventory...</p>
                    </td>
                </tr>
            `;
        }
    });
}

// ========================================
// SHOW EMPTY STATE
// ========================================
function showEmptyState() {
    const inventoryBody = document.getElementById('inventoryTableBody');
    if (inventoryBody) {
        inventoryBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 40px; color: #ccc;"></i>
                    <p style="margin-top: 10px;">No inventory found. Add some stock!</p>
                </td>
            </tr>
        `;
    }
}

// ========================================
// SHOW ERROR STATE
// ========================================
function showErrorState() {
    const inventoryBody = document.getElementById('inventoryTableBody');
    if (inventoryBody) {
        inventoryBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 40px; color: var(--danger);"></i>
                    <p style="margin-top: 10px;">Error loading inventory</p>
                </td>
            </tr>
        `;
    }
}

// ========================================
// UPDATE ALL DROPDOWNS
// ========================================
function updateAllDropdowns() {
    const dropdowns = [
        'produceSelect',
        'productSelect',
        'itemSelect'
    ];
    
    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            updateProduceDropdown(select);
        }
    });
}

// ========================================
// UPDATE DASHBOARD STATS
// ========================================
function updateDashboardStats() {
    const totalStockEl = document.getElementById('totalStock');
    const totalProductsEl = document.getElementById('totalProducts');
    const lowStockEl = document.getElementById('lowStock');
    
    if (totalStockEl || totalProductsEl || lowStockEl) {
        let totalKg = 0;
        let lowStockCount = 0;
        
        produceList.forEach(item => {
            totalKg += item.tonnage || 0;
            if (item.tonnage < 1000 && item.tonnage > 0) {
                lowStockCount++;
            }
        });
        
        if (totalStockEl) totalStockEl.textContent = totalKg.toLocaleString() + ' kg';
        if (totalProductsEl) totalProductsEl.textContent = produceList.length;
        if (lowStockEl) lowStockEl.textContent = lowStockCount;
    }
}

// ========================================
// CHECK LOW STOCK
// ========================================
function checkLowStock() {
    const lowStockItems = produceList.filter(item => item.tonnage < 1000 && item.tonnage > 0);
    const outOfStock = produceList.filter(item => item.tonnage <= 0);
    
    const alertDiv = document.getElementById('lowStockAlert');
    const messageSpan = document.getElementById('lowStockMessage');
    
    if (alertDiv && messageSpan && (lowStockItems.length > 0 || outOfStock.length > 0)) {
        let message = '';
        if (outOfStock.length > 0) {
            message += `${outOfStock.length} item(s) out of stock. `;
        }
        if (lowStockItems.length > 0) {
            message += `${lowStockItems.length} item(s) low on stock (<1000kg).`;
        }
        messageSpan.textContent = message;
        alertDiv.style.display = 'flex';
    } else if (alertDiv) {
        alertDiv.style.display = 'none';
    }
}

// ========================================
// UPDATE INVENTORY DISPLAY - DEBUG VERSION
// ========================================
function updateInventoryDisplay() {
    console.log('📊 UPDATE INVENTORY DISPLAY CALLED');
    console.log('📍 Current page:', window.location.pathname);
    console.log('📦 produceList length:', produceList.length);
    
    const inventoryBody = document.getElementById('inventoryTableBody');
    console.log('🔍 inventoryBody exists:', !!inventoryBody);
    
    if (inventoryBody) {
        if (produceList.length === 0) {
            console.log('📭 Showing empty state');
            inventoryBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-box-open" style="font-size: 40px; color: #ccc;"></i>
                        <p style="margin-top: 10px;">No inventory found. Add some stock!</p>
                    </td>
                </tr>
            `;
        } else {
            console.log(`📊 Generating HTML for ${produceList.length} items`);
            let html = '';
            let totalStock = 0;
            let lowStockCount = 0;
            
            const sortedList = [...produceList].sort((a, b) => 
                new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            );
            
            sortedList.forEach((item, index) => {
                console.log(`   Item ${index + 1}:`, item.name, item.tonnage, 'kg');
                totalStock += item.tonnage || 0;
                
                let statusClass = 'in-stock';
                let statusText = 'In Stock';
                
                if (item.tonnage <= 0) {
                    statusClass = 'out-stock';
                    statusText = 'Out of Stock';
                } else if (item.tonnage < 1000) {
                    statusClass = 'low-stock';
                    statusText = 'Low Stock';
                    lowStockCount++;
                }
                
                const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Today';
                
                html += `
                    <tr data-produce-id="${item._id || item.id}">
                        <td>${item.name}</td>
                        <td>${item.type || item.name}</td>
                        <td>${item.tonnage.toLocaleString()} kg</td>
                        <td class="price-cell">UGX ${item.sellingPrice?.toLocaleString() || '0'}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${date}</td>
                        <td>
                            <button class="action-btn edit-price" title="Edit Price" onclick="editPrice('${item._id || item.id}', ${item.sellingPrice || 0}, this.closest('tr'))">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            console.log('✅ Setting innerHTML with', sortedList.length, 'rows');
            inventoryBody.innerHTML = html;
            
            const totalStockEl = document.getElementById('totalStock');
            const totalProductsEl = document.getElementById('totalProducts');
            const lowStockEl = document.getElementById('lowStock');
            
            if (totalStockEl) totalStockEl.textContent = totalStock.toLocaleString() + ' kg';
            if (totalProductsEl) totalProductsEl.textContent = produceList.length;
            if (lowStockEl) lowStockEl.textContent = lowStockCount;
            
            console.log(`📊 Stats updated: Total: ${totalStock}kg, Products: ${produceList.length}, Low: ${lowStockCount}`);
        }
    } else {
        console.log('❌ inventoryTableBody not found - are you on the right page?');
        console.log('   Dashboard page should have this element');
    }
}

// ========================================
// SETUP PAGE BASED ON CURRENT PAGE
// ========================================
function setupPage() {
    const path = window.location.pathname;
    
    if (path.includes('procurement.html')) {
        setupProcurementPage();
    } else if (path.includes('sales.html')) {
        setupSalesPage();
    } else if (path.includes('creditsales.html')) {
        setupCreditSalesPage();
    } else if (path.includes('inventory.html')) {
        setupInventoryPage();
    } else if (path.includes('dashboard.html')) {
        updateInventoryDisplay();
        updateDashboardStats();
    }
}

// ========================================
// PROCUREMENT PAGE
// ========================================
function setupProcurementPage() {
    console.log('📝 Setting up procurement page');
    const form = document.getElementById('procurementForm');
    if (!form) {
        console.log('❌ Procurement form not found');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    
    if (dateInput) dateInput.value = today;
    
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' + 
                 now.getMinutes().toString().padStart(2, '0');
    if (timeInput) timeInput.value = time;
    
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Form submitted');
        
        const produceData = {
            name: document.getElementById('produceName')?.value,
            type: document.getElementById('produceType')?.value,
            tonnage: parseInt(document.getElementById('tonnage')?.value),
            cost: parseInt(document.getElementById('cost')?.value),
            dealerName: document.getElementById('dealerName')?.value,
            dealerContact: document.getElementById('dealerContact')?.value,
            sellingPrice: parseInt(document.getElementById('sellingPrice')?.value),
            branch: currentBranch,
            date: document.getElementById('date')?.value,
            time: document.getElementById('time')?.value
        };
        
        console.log('📝 Submitting procurement:', produceData);
        
        for (let [key, value] of Object.entries(produceData)) {
            if (!value && value !== 0) {
                alert(`❌ Please fill in ${key}`);
                return;
            }
        }
        
        if (produceData.tonnage < 1000) {
            alert('❌ Tonnage must be at least 1000kg for procurement');
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            const token = localStorage.getItem('kgl_token');
            
            if (!token) {
                alert('Session expired. Please login again.');
                window.location.href = '/frontend/pages/login.html';
                return;
            }
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
            
            const response = await APIService.createProduce(produceData, token);
            
            console.log('📥 Server Response:', response);
            
            if (response && response.success) {
                alert('✅ Procurement recorded successfully!');
                
                e.target.reset();
                if (dateInput) dateInput.value = today;
                if (timeInput) timeInput.value = time;
                
                await loadProduce();
                
                console.log('✅ Procurement saved and inventory updated');
                
                const viewInventoryBtn = document.querySelector('a[href="inventory.html"]');
                if (viewInventoryBtn) {
                    viewInventoryBtn.style.animation = 'pulse 1s';
                    setTimeout(() => {
                        viewInventoryBtn.style.animation = '';
                    }, 1000);
                }
                
            } else {
                alert('❌ Error: ' + (response?.message || 'Failed to record procurement'));
            }
        } catch (error) {
            console.log('❌ Error:', error);
            alert('❌ Error recording procurement. Check console for details.');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
    
    console.log('✅ Procurement page setup complete');
}

// ========================================
// EDIT SELLING PRICE
// ========================================
function editPrice(produceId, currentPrice, row) {
    const newPrice = prompt("Enter new selling price (UGX per kg):", currentPrice);
    
    if (newPrice === null) return;
    
    const priceValue = parseInt(newPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
        alert('❌ Please enter a valid positive number');
        return;
    }
    
    if (!confirm(`Change price from UGX ${currentPrice} to UGX ${priceValue}?`)) {
        return;
    }
    
    updateProducePrice(produceId, priceValue, row);
}

// ========================================
// UPDATE PRODUCE PRICE VIA API
// ========================================
async function updateProducePrice(produceId, newPrice, row) {
    try {
        const token = localStorage.getItem('kgl_token');
        
        if (!token) {
            alert('Session expired. Please login again.');
            return;
        }
        
        row.style.opacity = '0.5';
        
        const response = await APIService.updateProduce(produceId, { sellingPrice: newPrice }, token);
        
        if (response.success) {
            const priceCell = row.querySelector('.price-cell');
            if (priceCell) {
                priceCell.textContent = 'UGX ' + newPrice.toLocaleString();
            }
            
            const index = produceList.findIndex(p => p._id === produceId || p.id === produceId);
            if (index !== -1) {
                produceList[index].sellingPrice = newPrice;
            }
            
            alert('✅ Price updated successfully!');
        } else {
            alert('❌ Error: ' + (response.message || 'Failed to update price'));
        }
    } catch (error) {
        console.log('❌ Error updating price:', error);
        alert('Error updating price');
    } finally {
        row.style.opacity = '1';
    }
}

// ========================================
// SALES PAGE
// ========================================
function setupSalesPage() {
    const produceSelect = document.getElementById('produceSelect');
    const form = document.getElementById('saleForm');
    
    if (!produceSelect || !form) return;
    
    updateProduceDropdown(produceSelect);
    
    document.getElementById('quantity').addEventListener('input', function() {
        const selectedOption = produceSelect.options[produceSelect.selectedIndex];
        const price = selectedOption?.getAttribute('data-price') || 0;
        const quantity = parseInt(this.value) || 0;
        document.getElementById('amountPaid').value = price * quantity;
    });
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const selectedOption = produceSelect.options[produceSelect.selectedIndex];
        const quantity = parseInt(document.getElementById('quantity').value);
        
        const produce = produceList.find(p => p.name === produceSelect.value);
        if (!produce || produce.tonnage < quantity) {
            alert('Insufficient stock!');
            return;
        }
        
        const saleData = {
            produceName: produceSelect.value,
            quantity: quantity,
            amountPaid: parseInt(document.getElementById('amountPaid').value),
            buyerName: document.getElementById('buyerName').value,
            salesAgent: currentUser.name,
            branch: currentBranch,
            dateTime: new Date().toISOString()
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            const token = localStorage.getItem('kgl_token');
            
            if (!token) {
                alert('Session expired. Please login again.');
                return;
            }
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            submitBtn.disabled = true;
            
            const response = await APIService.createSale(saleData, token);
            
            if (response.success) {
                alert('✅ Sale recorded successfully!');
                form.reset();
                await loadProduce();
                await loadTodaysSales();
                updateProduceDropdown(produceSelect);
            } else {
                alert('❌ Error: ' + (response.message || 'Failed to record sale'));
            }
        } catch (error) {
            console.log('❌ Error:', error);
            alert('Error recording sale');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ========================================
// UPDATE PRODUCE DROPDOWN
// ========================================
function updateProduceDropdown(produceSelect) {
    if (!produceSelect) return;
    
    produceSelect.innerHTML = '<option value="">Select Produce</option>';
    
    if (produceList.length > 0) {
        produceList.forEach(item => {
            if (item.tonnage > 0) {
                const option = document.createElement('option');
                option.value = item.name;
                option.textContent = `${item.name} - ${item.tonnage}kg available @ UGX ${item.sellingPrice}/kg`;
                option.setAttribute('data-price', item.sellingPrice);
                option.setAttribute('data-max', item.tonnage);
                produceSelect.appendChild(option);
            }
        });
    }
}

// ========================================
// CREDIT SALES PAGE
// ========================================
function setupCreditSalesPage() {
    const produceSelect = document.getElementById('produceSelect');
    const form = document.getElementById('creditSaleForm');
    
    if (!produceSelect || !form) return;
    
    const today = new Date().toISOString().split('T')[0];
    const dispatchDateEl = document.getElementById('dispatchDate');
    const dueDateEl = document.getElementById('dueDate');
    
    if (dispatchDateEl) dispatchDateEl.value = today;
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    if (dueDateEl) dueDateEl.value = nextMonth.toISOString().split('T')[0];
    
    updateProduceDropdown(produceSelect);
    
    const quantityEl = document.getElementById('quantity');
    const amountDueEl = document.getElementById('amountDue');
    
    if (quantityEl && amountDueEl) {
        quantityEl.addEventListener('input', function() {
            const selectedOption = produceSelect.options[produceSelect.selectedIndex];
            const price = selectedOption?.getAttribute('data-price') || 0;
            const quantity = parseInt(this.value) || 0;
            amountDueEl.value = price * quantity;
        });
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const selectedOption = produceSelect.options[produceSelect.selectedIndex];
        const quantity = parseInt(document.getElementById('quantity').value);
        
        const produce = produceList.find(p => p.name === produceSelect.value);
        if (!produce || produce.tonnage < quantity) {
            alert('Insufficient stock!');
            return;
        }
        
        const creditData = {
            buyerName: document.getElementById('buyerName').value,
            idType: document.getElementById('idType').value,
            idNumber: document.getElementById('idNumber').value,
            location: document.getElementById('location').value,
            contact: document.getElementById('contact').value,
            amountDue: parseInt(document.getElementById('amountDue').value),
            salesAgent: currentUser.name,
            produceName: produceSelect.value,
            quantity: quantity,
            dueDate: document.getElementById('dueDate').value,
            dispatchDate: document.getElementById('dispatchDate').value,
            branch: currentBranch,
            status: 'Pending'
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            const token = localStorage.getItem('kgl_token');
            
            if (!token) {
                alert('Session expired. Please login again.');
                return;
            }
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            submitBtn.disabled = true;
            
            const response = await APIService.createCreditSale(creditData, token);
            
            if (response.success) {
                alert('✅ Credit sale recorded successfully!');
                form.reset();
                
                if (dispatchDateEl) dispatchDateEl.value = today;
                if (dueDateEl) dueDateEl.value = nextMonth.toISOString().split('T')[0];
                
                await loadProduce();
                await loadTodaysSales();
                updateProduceDropdown(produceSelect);
            } else {
                alert('❌ Error: ' + (response.message || 'Failed to record credit sale'));
            }
        } catch (error) {
            console.log('❌ Error:', error);
            alert('Error recording credit sale');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ========================================
// INVENTORY PAGE
// ========================================
function setupInventoryPage() {
    updateInventoryDisplay();
    checkLowStock();
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
// ADD PULSE ANIMATION CSS
// ========================================
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); background-color: var(--gold-light); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

console.log('🚀 Manager.js loaded - DEBUG VERSION ACTIVE!');