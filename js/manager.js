/**
 * KARIBU GROCERIES LTD (KGL) - Manager Dashboard
 * Branches: MAGANJO and MATUGGA
 * UNIVERSAL FIX - Dashboard updates for all branches
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
    
    if (!APIService.isAuthenticated()) {
        window.location.href = '/frontend/pages/login.html';
        return;
    }
    
    currentUser = APIService.getCurrentUser();
    
    if (currentUser.role !== 'Manager') {
        alert('Access denied. Manager only.');
        APIService.redirectToDashboard(currentUser.role);
        return;
    }
    
    currentBranch = currentUser.branch;
    console.log('✅ Authenticated as:', currentUser.name);
    console.log('🏢 Branch:', currentBranch);
    
    updateUserInfo();
    await loadProduce();
    await loadTodaysSales();
    setupPage();
    
    // Auto-refresh every 30 seconds
    setInterval(async () => {
        console.log('🔄 Auto-refreshing inventory...');
        await loadProduce();
        await loadTodaysSales();
    }, 30000);
});

// ========================================
// UPDATE USER INFO
// ========================================
function updateUserInfo() {
    document.querySelectorAll('#userName').forEach(el => {
        if (el) el.textContent = currentUser.name;
    });
    
    document.querySelectorAll('#branchName, #branchDisplay').forEach(el => {
        if (el) el.textContent = currentBranch + ' Branch';
    });
}

// ========================================
// LOAD TODAY'S SALES
// ========================================
async function loadTodaysSales() {
    try {
        const token = localStorage.getItem('kgl_token');
        if (!token) return;
        
        const response = await APIService.getSales(token, true);
        
        if (response?.success) {
            const todaySalesAmount = response.sales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
            const todaySalesEl = document.getElementById('todaySales');
            if (todaySalesEl) {
                todaySalesEl.textContent = 'UGX ' + todaySalesAmount.toLocaleString();
            }
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
            window.location.href = '/frontend/pages/login.html';
            return;
        }
        
        console.log(`🔍 Fetching produce for ${currentBranch} branch...`);
        showLoadingInAllTables();
        
        const response = await APIService.getProduce(currentBranch, token);
        
        if (response?.success) {
            produceList = response.produce || [];
            console.log(`✅ Loaded ${produceList.length} items for ${currentBranch}`);
            
            // Force update ALL displays
            forceUpdateAllDisplays();
            
        } else {
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
// FORCE UPDATE ALL DISPLAYS
// ========================================
function forceUpdateAllDisplays() {
    console.log('🔄 Force updating all displays...');
    
    // Update inventory table if it exists
    updateInventoryDisplay();
    
    // Update dashboard stats
    updateDashboardStats();
    
    // Update all dropdowns
    updateAllDropdowns();
    
    // Check low stock
    checkLowStock();
    
    // Force dashboard table to refresh
    const inventoryBody = document.getElementById('inventoryTableBody');
    if (inventoryBody && produceList.length > 0) {
        console.log(`📊 Dashboard table updated with ${produceList.length} items`);
    }
}

// ========================================
// SHOW LOADING IN ALL TABLES
// ========================================
function showLoadingInAllTables() {
    ['inventoryTableBody', 'recentInventoryBody', 'stockBody'].forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table) {
            table.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px;"><i class="fas fa-spinner fa-spin" style="font-size: 30px;"></i><p>Loading inventory...</p></td></tr>`;
        }
    });
}

// ========================================
// SHOW EMPTY STATE
// ========================================
function showEmptyState() {
    const inventoryBody = document.getElementById('inventoryTableBody');
    if (inventoryBody) {
        inventoryBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-box-open" style="font-size: 40px; color: #ccc;"></i><p>No inventory found. Add some stock!</p></td></tr>`;
    }
}

// ========================================
// SHOW ERROR STATE
// ========================================
function showErrorState() {
    const inventoryBody = document.getElementById('inventoryTableBody');
    if (inventoryBody) {
        inventoryBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-exclamation-circle" style="font-size: 40px; color: var(--danger);"></i><p>Error loading inventory</p></td></tr>`;
    }
}

// ========================================
// UPDATE ALL DROPDOWNS
// ========================================
function updateAllDropdowns() {
    ['produceSelect', 'productSelect', 'itemSelect'].forEach(id => {
        const select = document.getElementById(id);
        if (select) updateProduceDropdown(select);
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
        let totalKg = 0, lowStockCount = 0;
        
        produceList.forEach(item => {
            totalKg += item.tonnage || 0;
            if (item.tonnage < 1000 && item.tonnage > 0) lowStockCount++;
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
        if (outOfStock.length > 0) message += `${outOfStock.length} item(s) out of stock. `;
        if (lowStockItems.length > 0) message += `${lowStockItems.length} item(s) low on stock (<1000kg).`;
        messageSpan.textContent = message;
        alertDiv.style.display = 'flex';
    } else if (alertDiv) {
        alertDiv.style.display = 'none';
    }
}

// ========================================
// UPDATE INVENTORY DISPLAY - FORCED UPDATE
// ========================================
function updateInventoryDisplay() {
    console.log('📊 Updating inventory display...');
    
    const inventoryBody = document.getElementById('inventoryTableBody');
    if (!inventoryBody) {
        console.log('ℹ️ No inventory table on this page');
        return;
    }
    
    if (produceList.length === 0) {
        inventoryBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-box-open" style="font-size: 40px; color: #ccc;"></i><p>No inventory found. Add some stock!</p></td></tr>`;
        return;
    }
    
    let html = '', totalStock = 0, lowStockCount = 0;
    
    [...produceList].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).forEach(item => {
        totalStock += item.tonnage || 0;
        
        let statusClass = 'in-stock', statusText = 'In Stock';
        if (item.tonnage <= 0) {
            statusClass = 'out-stock'; statusText = 'Out of Stock';
        } else if (item.tonnage < 1000) {
            statusClass = 'low-stock'; statusText = 'Low Stock'; lowStockCount++;
        }
        
        html += `<tr data-produce-id="${item._id || item.id}">
            <td>${item.name}</td>
            <td>${item.type || item.name}</td>
            <td>${item.tonnage.toLocaleString()} kg</td>
            <td class="price-cell">UGX ${item.sellingPrice?.toLocaleString() || '0'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Today'}</td>
            <td><button class="action-btn edit-price" onclick="editPrice('${item._id || item.id}', ${item.sellingPrice || 0}, this.closest('tr'))"><i class="fas fa-edit"></i></button></td>
        </tr>`;
    });
    
    inventoryBody.innerHTML = html;
    
    // Update stats after table update
    const totalStockEl = document.getElementById('totalStock');
    const totalProductsEl = document.getElementById('totalProducts');
    const lowStockEl = document.getElementById('lowStock');
    
    if (totalStockEl) totalStockEl.textContent = totalStock.toLocaleString() + ' kg';
    if (totalProductsEl) totalProductsEl.textContent = produceList.length;
    if (lowStockEl) lowStockEl.textContent = lowStockCount;
    
    console.log(`✅ Display updated with ${produceList.length} items`);
}

// ========================================
// UPDATE PRODUCE DROPDOWN
// ========================================
function updateProduceDropdown(produceSelect) {
    if (!produceSelect) return;
    
    produceSelect.innerHTML = '<option value="">Select Produce</option>';
    
    if (produceList.length === 0) return;
    
    produceList.forEach(item => {
        if (item.tonnage > 0) {
            const option = document.createElement('option');
            option.value = item.name;
            option.textContent = `${item.name} - ${item.tonnage}kg @ UGX ${item.sellingPrice}/kg`;
            option.setAttribute('data-price', item.sellingPrice);
            option.setAttribute('data-max', item.tonnage);
            produceSelect.appendChild(option);
        }
    });
}

// ========================================
// SETUP PAGE
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
        forceUpdateAllDisplays();
    }
}

// ========================================
// PROCUREMENT PAGE - FIXED
// ========================================
function setupProcurementPage() {
    console.log('📝 Setting up procurement page');
    const form = document.getElementById('procurementForm');
    if (!form) return;
    
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    
    if (dateInput) dateInput.value = today;
    if (timeInput) {
        const now = new Date();
        timeInput.value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    }
    
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
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
        
        // Validate
        for (let [key, value] of Object.entries(produceData)) {
            if (!value && value !== 0) {
                alert(`❌ Please fill in ${key}`);
                return;
            }
        }
        
        if (produceData.tonnage < 1000) {
            alert('❌ Minimum 1000kg required');
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            const token = localStorage.getItem('kgl_token');
            if (!token) {
                alert('Session expired');
                return;
            }
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
            
            const response = await APIService.createProduce(produceData, token);
            
            if (response?.success) {
                alert('✅ Procurement recorded!');
                e.target.reset();
                if (dateInput) dateInput.value = today;
                
                // CRITICAL: Force reload of produce and update ALL displays
                await loadProduce();
                
                // If we're on dashboard, ensure it updates
                if (window.location.pathname.includes('dashboard.html')) {
                    forceUpdateAllDisplays();
                }
                
                console.log('✅ Procurement added and displays updated');
            } else {
                alert('❌ Error: ' + (response?.message || 'Failed'));
            }
        } catch (error) {
            console.log('❌ Error:', error);
            alert('Error recording procurement');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
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
        const opt = produceSelect.options[produceSelect.selectedIndex];
        const price = opt?.getAttribute('data-price') || 0;
        document.getElementById('amountPaid').value = price * (parseInt(this.value) || 0);
    });
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const produce = produceList.find(p => p.name === produceSelect.value);
        const quantity = parseInt(document.getElementById('quantity').value);
        
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
        
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        
        try {
            const token = localStorage.getItem('kgl_token');
            if (!token) {
                alert('Session expired');
                return;
            }
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            btn.disabled = true;
            
            const response = await APIService.createSale(saleData, token);
            
            if (response.success) {
                alert('✅ Sale recorded!');
                form.reset();
                await loadProduce();
                await loadTodaysSales();
                updateProduceDropdown(produceSelect);
            } else {
                alert('❌ Error: ' + (response.message || 'Failed'));
            }
        } catch (error) {
            console.log('❌ Error:', error);
            alert('Error recording sale');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
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
    if (dueDateEl) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        dueDateEl.value = nextMonth.toISOString().split('T')[0];
    }
    
    updateProduceDropdown(produceSelect);
    
    const quantityEl = document.getElementById('quantity');
    const amountDueEl = document.getElementById('amountDue');
    
    if (quantityEl && amountDueEl) {
        quantityEl.addEventListener('input', function() {
            const opt = produceSelect.options[produceSelect.selectedIndex];
            const price = opt?.getAttribute('data-price') || 0;
            amountDueEl.value = price * (parseInt(this.value) || 0);
        });
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const produce = produceList.find(p => p.name === produceSelect.value);
        const quantity = parseInt(document.getElementById('quantity').value);
        
        if (!produce || produce.tonnage < quantity) {
            alert('Insufficient stock!');
            return;
        }
        
        const creditData = {
            buyerName: document.getElementById('buyerName').value,
            idType: document.getElementById('idType')?.value || 'NIN',
            idNumber: document.getElementById('idNumber')?.value || '',
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
        
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        
        try {
            const token = localStorage.getItem('kgl_token');
            if (!token) {
                alert('Session expired');
                return;
            }
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            btn.disabled = true;
            
            const response = await APIService.createCreditSale(creditData, token);
            
            if (response.success) {
                alert('✅ Credit sale recorded!');
                form.reset();
                if (dispatchDateEl) dispatchDateEl.value = today;
                if (dueDateEl) {
                    const nextMonth = new Date();
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    dueDateEl.value = nextMonth.toISOString().split('T')[0];
                }
                await loadProduce();
                await loadTodaysSales();
                updateProduceDropdown(produceSelect);
            } else {
                alert('❌ Error: ' + (response.message || 'Failed'));
            }
        } catch (error) {
            console.log('❌ Error:', error);
            alert('Error recording credit sale');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
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
// EDIT PRICE FUNCTIONS
// ========================================
function editPrice(produceId, currentPrice, row) {
    const newPrice = prompt("Enter new selling price (UGX per kg):", currentPrice);
    if (newPrice === null) return;
    
    const priceValue = parseInt(newPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
        alert('❌ Enter a valid positive number');
        return;
    }
    
    if (!confirm(`Change price from UGX ${currentPrice} to UGX ${priceValue}?`)) return;
    updateProducePrice(produceId, priceValue, row);
}

async function updateProducePrice(produceId, newPrice, row) {
    try {
        const token = localStorage.getItem('kgl_token');
        if (!token) {
            alert('Session expired');
            return;
        }
        
        row.style.opacity = '0.5';
        const response = await APIService.updateProduce(produceId, { sellingPrice: newPrice }, token);
        
        if (response.success) {
            const priceCell = row.querySelector('.price-cell');
            if (priceCell) priceCell.textContent = 'UGX ' + newPrice.toLocaleString();
            
            const index = produceList.findIndex(p => p._id === produceId || p.id === produceId);
            if (index !== -1) produceList[index].sellingPrice = newPrice;
            
            alert('✅ Price updated!');
        } else {
            alert('❌ Error: ' + (response.message || 'Failed'));
        }
    } catch (error) {
        console.log('❌ Error:', error);
        alert('Error updating price');
    } finally {
        row.style.opacity = '1';
    }
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

console.log('🚀 Manager.js loaded - UNIVERSAL FIX for all branches');