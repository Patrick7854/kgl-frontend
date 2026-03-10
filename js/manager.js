/**
 * KARIBU GROCERIES LTD (KGL) - Manager Dashboard
 * Branches: MAGANJO and MATUGGA
 * FULLY FIXED - Procurement now works!
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
        console.log('❌ Not authenticated, redirecting');
        window.location.href = '/frontend/pages/login.html';
        return;
    }
    
    currentUser = APIService.getCurrentUser();
    
    if (currentUser.role !== 'Manager') {
        console.log('❌ Access denied');
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
        
        console.log('💰 Fetching today\'s sales...');
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
        
        console.log('🔍 Fetching produce for branch:', currentBranch);
        showLoadingInAllTables();
        
        const response = await APIService.getProduce(currentBranch, token);
        console.log('📥 Load produce response:', response);
        
        if (response?.success) {
            produceList = response.produce || [];
            console.log(`✅ Loaded ${produceList.length} produce items`);
            
            updateInventoryDisplay();
            updateDashboardStats();
            updateAllDropdowns();
            checkLowStock();
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
// SHOW LOADING IN ALL TABLES
// ========================================
function showLoadingInAllTables() {
    const tables = ['inventoryTableBody', 'recentInventoryBody', 'stockBody'];
    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table) {
            table.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px;"><i class="fas fa-spinner fa-spin" style="font-size: 30px; color: var(--gold-primary);"></i><p style="margin-top: 10px;">Loading inventory...</p></td></tr>`;
        }
    });
}

// ========================================
// SHOW EMPTY STATE
// ========================================
function showEmptyState() {
    const inventoryBody = document.getElementById('inventoryTableBody');
    if (inventoryBody) {
        inventoryBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-box-open" style="font-size: 40px; color: #ccc;"></i><p style="margin-top: 10px;">No inventory found. Add some stock!</p></td></tr>`;
    }
}

// ========================================
// SHOW ERROR STATE
// ========================================
function showErrorState() {
    const inventoryBody = document.getElementById('inventoryTableBody');
    if (inventoryBody) {
        inventoryBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-exclamation-circle" style="font-size: 40px; color: var(--danger);"></i><p style="margin-top: 10px;">Error loading inventory</p></td></tr>`;
    }
}

// ========================================
// UPDATE ALL DROPDOWNS
// ========================================
function updateAllDropdowns() {
    const dropdowns = ['produceSelect', 'productSelect', 'itemSelect'];
    dropdowns.forEach(id => {
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
// UPDATE INVENTORY DISPLAY
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
            inventoryBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-box-open" style="font-size: 40px; color: #ccc;"></i><p style="margin-top: 10px;">No inventory found. Add some stock!</p></td></tr>`;
        } else {
            console.log(`📊 Generating HTML for ${produceList.length} items`);
            let html = '', totalStock = 0, lowStockCount = 0;
            
            [...produceList].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).forEach((item, index) => {
                console.log(`   Item ${index + 1}:`, item.name, item.tonnage, 'kg');
                totalStock += item.tonnage || 0;
                
                let statusClass = 'in-stock', statusText = 'In Stock';
                if (item.tonnage <= 0) {
                    statusClass = 'out-stock'; statusText = 'Out of Stock';
                } else if (item.tonnage < 1000) {
                    statusClass = 'low-stock'; statusText = 'Low Stock'; lowStockCount++;
                }
                
                html += `<tr data-produce-id="${item._id || item.id}"><td>${item.name}</td><td>${item.type || item.name}</td><td>${item.tonnage.toLocaleString()} kg</td><td class="price-cell">UGX ${item.sellingPrice?.toLocaleString() || '0'}</td><td><span class="status-badge ${statusClass}">${statusText}</span></td><td>${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Today'}</td><td><button class="action-btn edit-price" title="Edit Price" onclick="editPrice('${item._id || item.id}', ${item.sellingPrice || 0}, this.closest('tr'))"><i class="fas fa-edit"></i></button></td></tr>`;
            });
            
            inventoryBody.innerHTML = html;
            
            const totalStockEl = document.getElementById('totalStock');
            const totalProductsEl = document.getElementById('totalProducts');
            const lowStockEl = document.getElementById('lowStock');
            
            if (totalStockEl) totalStockEl.textContent = totalStock.toLocaleString() + ' kg';
            if (totalProductsEl) totalProductsEl.textContent = produceList.length;
            if (lowStockEl) lowStockEl.textContent = lowStockCount;
        }
    } else {
        console.log('❌ inventoryTableBody not found - are you on the right page?');
    }
}

// ========================================
// UPDATE PRODUCE DROPDOWN
// ========================================
function updateProduceDropdown(produceSelect) {
    console.log('🔄 updateProduceDropdown called');
    if (!produceSelect) {
        console.log('❌ produceSelect is null');
        return;
    }
    
    console.log('📦 produceList length:', produceList.length);
    produceSelect.innerHTML = '<option value="">Select Produce</option>';
    
    if (produceList.length === 0) {
        console.log('⚠️ No produce items to display');
        return;
    }
    
    let optionCount = 0;
    produceList.forEach(item => {
        if (item.tonnage > 0) {
            const option = document.createElement('option');
            option.value = item.name;
            option.textContent = `${item.name} - ${item.tonnage}kg available @ UGX ${item.sellingPrice}/kg`;
            option.setAttribute('data-price', item.sellingPrice);
            option.setAttribute('data-max', item.tonnage);
            produceSelect.appendChild(option);
            optionCount++;
            console.log(`   ✅ Added option: ${item.name} (${item.tonnage}kg)`);
        }
    });
    
    console.log(`📋 Total options added: ${optionCount}`);
}

// ========================================
// SETUP PAGE BASED ON CURRENT PAGE
// ========================================
function setupPage() {
    const path = window.location.pathname;
    console.log('🔧 Setting up page for path:', path);
    
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
// SALES PAGE
// ========================================
function setupSalesPage() {
    console.log('💰 Setting up sales page');
    console.log('📦 Current produceList length:', produceList.length);
    
    const produceSelect = document.getElementById('produceSelect');
    const form = document.getElementById('saleForm');
    
    if (!produceSelect) {
        console.log('❌ produceSelect not found');
        return;
    }
    if (!form) {
        console.log('❌ saleForm not found');
        return;
    }
    
    console.log('🔄 Updating produce dropdown...');
    updateProduceDropdown(produceSelect);
    console.log('📋 Dropdown options count:', produceSelect.options.length);
    
    document.getElementById('quantity').addEventListener('input', function() {
        const selectedOption = produceSelect.options[produceSelect.selectedIndex];
        const price = selectedOption?.getAttribute('data-price') || 0;
        const quantity = parseInt(this.value) || 0;
        document.getElementById('amountPaid').value = price * quantity;
    });
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const selectedOption = produceSelect.options[produceSelect.selectedIndex];
        if (!selectedOption || selectedOption.value === '') {
            alert('Please select a product');
            return;
        }
        
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
    
    console.log('✅ Sales page setup complete');
}

// ========================================
// CREDIT SALES PAGE
// ========================================
function setupCreditSalesPage() {
    console.log('💳 Setting up credit sales page');
    console.log('📦 Current produceList length:', produceList.length);
    
    const produceSelect = document.getElementById('produceSelect');
    const form = document.getElementById('creditSaleForm');
    
    if (!produceSelect) {
        console.log('❌ produceSelect not found');
        return;
    }
    if (!form) {
        console.log('❌ creditSaleForm not found');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const dispatchDateEl = document.getElementById('dispatchDate');
    const dueDateEl = document.getElementById('dueDate');
    
    if (dispatchDateEl) dispatchDateEl.value = today;
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    if (dueDateEl) dueDateEl.value = nextMonth.toISOString().split('T')[0];
    
    console.log('🔄 Updating credit sales dropdown...');
    updateProduceDropdown(produceSelect);
    console.log('📋 Credit dropdown options:', produceSelect.options.length);
    
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
        if (!selectedOption || selectedOption.value === '') {
            alert('Please select a product');
            return;
        }
        
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
    
    console.log('✅ Credit sales page setup complete');
}

// ========================================
// PROCUREMENT PAGE - COMPLETELY REWRITTEN
// ========================================
function setupProcurementPage() {
    console.log('📝 Setting up procurement page');
    
    // Get the form
    const form = document.getElementById('procurementForm');
    if (!form) {
        console.log('❌ Procurement form not found - check HTML');
        return;
    }
    
    console.log('✅ Procurement form found');
    
    // Set default date and time
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    
    if (dateInput) {
        dateInput.value = today;
        console.log('📅 Date set to:', today);
    }
    
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    if (timeInput) {
        timeInput.value = currentTime;
        console.log('⏰ Time set to:', currentTime);
    }
    
    // Remove all existing event listeners by creating a fresh form
    const parent = form.parentNode;
    const newForm = document.createElement('form');
    newForm.id = 'procurementForm';
    newForm.innerHTML = form.innerHTML;
    parent.replaceChild(newForm, form);
    
    console.log('🔄 Form recreated with fresh event listener');
    
    // Add the submit event listener
    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('🎯 FORM SUBMIT EVENT TRIGGERED!');
        
        // Get all form values
        const produceName = document.getElementById('produceName')?.value;
        const produceType = document.getElementById('produceType')?.value;
        const tonnage = document.getElementById('tonnage')?.value;
        const cost = document.getElementById('cost')?.value;
        const dealerName = document.getElementById('dealerName')?.value;
        const dealerContact = document.getElementById('dealerContact')?.value;
        const sellingPrice = document.getElementById('sellingPrice')?.value;
        const date = document.getElementById('date')?.value;
        const time = document.getElementById('time')?.value;
        
        console.log('📋 Form values:', {
            produceName, produceType, tonnage, cost,
            dealerName, dealerContact, sellingPrice,
            branch: currentBranch, date, time
        });
        
        // Validate all fields
        if (!produceName || !produceType || !tonnage || !cost || !dealerName || 
            !dealerContact || !sellingPrice || !date || !time) {
            alert('❌ Please fill in all fields');
            console.log('❌ Validation failed: missing fields');
            return;
        }
        
        // Validate tonnage
        const tonnageNum = parseInt(tonnage);
        if (tonnageNum < 1000) {
            alert('❌ Tonnage must be at least 1000kg');
            console.log('❌ Validation failed: tonnage too low');
            return;
        }
        
        // Prepare data for API
        const produceData = {
            name: produceName,
            type: produceType,
            tonnage: tonnageNum,
            cost: parseInt(cost),
            dealerName: dealerName,
            dealerContact: dealerContact,
            sellingPrice: parseInt(sellingPrice),
            branch: currentBranch,
            date: date,
            time: time
        };
        
        console.log('📦 Prepared produce data:', produceData);
        
        // Get submit button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Get token
            const token = localStorage.getItem('kgl_token');
            if (!token) {
                alert('Session expired. Please login again.');
                window.location.href = '/frontend/pages/login.html';
                return;
            }
            
            console.log('🔑 Token found, sending API request...');
            
            // Show loading state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
            
            // Call API
            const response = await APIService.createProduce(produceData, token);
            console.log('📥 API Response:', response);
            
            if (response?.success) {
                alert('✅ Procurement recorded successfully!');
                console.log('✅ Procurement saved');
                
                // Reset form
                e.target.reset();
                if (dateInput) dateInput.value = today;
                if (timeInput) {
                    const now = new Date();
                    timeInput.value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                }
                
                // Reload data
                await loadProduce();
                console.log('✅ Inventory refreshed');
                
            } else {
                alert('❌ Error: ' + (response?.message || 'Failed to record procurement'));
                console.log('❌ API error:', response?.message);
            }
        } catch (error) {
            console.log('❌ Exception:', error);
            alert('❌ Error recording procurement. Check console for details.');
        } finally {
            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            console.log('🔘 Submit button restored');
        }
    });
    
    console.log('✅ Procurement page setup complete - form ready');
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
    
    if (!confirm(`Change price from UGX ${currentPrice} to UGX ${priceValue}?`)) return;
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
            if (priceCell) priceCell.textContent = 'UGX ' + newPrice.toLocaleString();
            
            const index = produceList.findIndex(p => p._id === produceId || p.id === produceId);
            if (index !== -1) produceList[index].sellingPrice = newPrice;
            
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
style.textContent = `@keyframes pulse {0% { transform: scale(1); }50% { transform: scale(1.05); background-color: var(--gold-light); }100% { transform: scale(1); }}`;
document.head.appendChild(style);

console.log('🚀 Manager.js loaded - PROCUREMENT FIXED!');