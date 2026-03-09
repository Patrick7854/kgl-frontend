/**
 * KGL Groceries LTD - Sales Agent Dashboard
 * FIXED: Now shows products in dropdown
 */

// ========================================
// GLOBAL VARIABLES
// ========================================
let currentUser = null;
let currentBranch = '';
let produceList = [];
let mySales = [];
let myCreditSales = [];

// ========================================
// CHECK AUTHENTICATION
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Sales Dashboard loaded');
    
    if (!APIService.isAuthenticated()) {
        console.log('❌ Not authenticated, redirecting');
        window.location.href = '/frontend/pages/login.html';
        return;
    }
    
    currentUser = APIService.getCurrentUser();
    
    if (currentUser.role !== 'Sales') {
        console.log('❌ Access denied');
        alert('Access denied. Sales Agents only.');
        APIService.redirectToDashboard(currentUser.role);
        return;
    }
    
    currentBranch = currentUser.branch;
    console.log('✅ Authenticated as:', currentUser.name);
    console.log('🏢 Branch:', currentBranch);
    
    updateUserInfo();
    await loadProduce();
    await loadMySales();
    setupPage();
    
    setInterval(async () => {
        console.log('🔄 Auto-refreshing sales data...');
        await loadProduce();
        await loadMySales();
    }, 30000);
});

// ========================================
// UPDATE USER INFO
// ========================================
function updateUserInfo() {
    const userNameElements = document.querySelectorAll('#userName');
    userNameElements.forEach(el => {
        if (el) el.textContent = currentUser.name;
    });
    
    const branchElements = document.querySelectorAll('#branchName, #branchDisplay');
    branchElements.forEach(el => {
        if (el) el.textContent = currentBranch + ' Branch';
    });
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
        const response = await APIService.getProduce(currentBranch, token);
        console.log('📥 Load produce response:', response);
        
        if (response?.success) {
            produceList = response.produce || [];
            console.log(`✅ Loaded ${produceList.length} produce items`);
            
            // Log each item for debugging
            produceList.forEach((item, i) => {
                console.log(`   Item ${i+1}: ${item.name} - ${item.tonnage}kg @ UGX ${item.sellingPrice}`);
            });
            
            updateStockDisplay();
            updateAllDropdowns(); // This will update ALL dropdowns on the page
        } else {
            produceList = [];
        }
    } catch (error) {
        console.log('❌ Error loading produce:', error);
        produceList = [];
    }
}

// ========================================
// UPDATE ALL DROPDOWNS
// ========================================
function updateAllDropdowns() {
    console.log('🔄 Updating all dropdowns...');
    const dropdowns = [
        { id: 'produceSelect', name: 'New Sale' },
        { id: 'productSelect', name: 'Credit Sale' }
    ];
    
    dropdowns.forEach(dd => {
        const select = document.getElementById(dd.id);
        if (select) {
            console.log(`   Found dropdown: ${dd.name} (${dd.id})`);
            updateProduceDropdown(select);
        } else {
            console.log(`   ❌ Dropdown not found: ${dd.id}`);
        }
    });
}

// ========================================
// UPDATE PRODUCE DROPDOWN - FIXED VERSION
// ========================================
function updateProduceDropdown(produceSelect) {
    console.log('📋 Updating produce dropdown...');
    
    if (!produceSelect) {
        console.log('❌ produceSelect is null');
        return;
    }
    
    // Clear existing options
    produceSelect.innerHTML = '<option value="">Select Product</option>';
    console.log(`📦 produceList has ${produceList.length} items`);
    
    if (produceList.length === 0) {
        console.log('⚠️ No produce items available');
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
            console.log(`   ✅ Added: ${item.name} (${item.tonnage}kg)`);
        } else {
            console.log(`   ⚠️ Skipped: ${item.name} (out of stock)`);
        }
    });
    
    console.log(`📋 Total options added: ${optionCount}`);
}

// ========================================
// LOAD MY SALES
// ========================================
async function loadMySales() {
    try {
        const token = localStorage.getItem('kgl_token');
        if (!token) return;
        
        console.log('🔍 Fetching my sales history...');
        
        const salesResponse = await APIService.getSales(token);
        if (salesResponse?.success) {
            mySales = salesResponse.sales.filter(sale => sale.salesAgent === currentUser.name);
            console.log(`✅ Loaded ${mySales.length} personal cash sales`);
        }
        
        const creditResponse = await APIService.getCreditSales(token);
        if (creditResponse?.success) {
            myCreditSales = creditResponse.creditSales.filter(credit => credit.salesAgent === currentUser.name);
            console.log(`✅ Loaded ${myCreditSales.length} personal credit sales`);
        }
        
        updateSalesDisplay();
    } catch (error) {
        console.log('❌ Error loading sales:', error);
    }
}

// ========================================
// UPDATE STOCK DISPLAY
// ========================================
function updateStockDisplay() {
    const stockBody = document.getElementById('stockBody');
    if (!stockBody) return;
    
    if (produceList.length === 0) {
        stockBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px;"><i class="fas fa-box-open" style="font-size: 30px; color: #ccc;"></i><p style="margin-top: 10px;">No stock available</p></td></tr>`;
        return;
    }
    
    let html = '';
    let totalStock = 0;
    
    produceList.forEach(item => {
        totalStock += item.tonnage || 0;
        
        let statusClass = 'in-stock', statusText = 'In Stock';
        if (item.tonnage <= 0) {
            statusClass = 'out-stock'; statusText = 'Out of Stock';
        } else if (item.tonnage < 1000) {
            statusClass = 'low-stock'; statusText = 'Low Stock';
        }
        
        html += `<tr><td>${item.name}</td><td>${item.tonnage} kg</td><td>UGX ${item.sellingPrice?.toLocaleString() || '0'}</td><td><span class="status-badge ${statusClass}">${statusText}</span></td></tr>`;
    });
    
    stockBody.innerHTML = html;
    
    const availableStockEl = document.getElementById('availableStock');
    if (availableStockEl) availableStockEl.textContent = totalStock + ' kg';
}

// ========================================
// UPDATE SALES DISPLAY
// ========================================
function updateSalesDisplay() {
    const recentBody = document.getElementById('recentSalesBody');
    if (!recentBody) return;
    
    const cashFormatted = mySales.map(s => ({
        dateTime: s.dateTime,
        produceName: s.produceName,
        quantity: s.quantity,
        amount: s.amountPaid,
        buyerName: s.buyerName,
        type: 'Cash'
    }));
    
    const creditFormatted = myCreditSales.map(c => ({
        dateTime: c.createdAt || c.dateTime,
        produceName: c.produceName,
        quantity: c.quantity,
        amount: c.amountDue,
        buyerName: c.buyerName,
        type: 'Credit'
    }));
    
    const allSales = [...cashFormatted, ...creditFormatted]
        .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
        .slice(0, 5);
    
    if (allSales.length === 0) {
        recentBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px;"><i class="fas fa-shopping-cart" style="font-size: 30px; color: #ccc;"></i><p style="margin-top: 10px;">No sales yet. Record your first sale!</p></td></tr>`;
    } else {
        let html = '';
        allSales.forEach(sale => {
            html += `<tr><td>${new Date(sale.dateTime).toLocaleString()}</td><td>${sale.produceName}</td><td>${sale.quantity} kg</td><td>UGX ${(sale.amount || 0).toLocaleString()}</td><td>${sale.buyerName}</td><td><span class="badge ${sale.type === 'Cash' ? 'badge-success' : 'badge-warning'}">${sale.type}</span></td></tr>`;
        });
        recentBody.innerHTML = html;
    }
    
    const today = new Date().toDateString();
    const todaySalesAmount = mySales
        .filter(s => new Date(s.dateTime).toDateString() === today)
        .reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    
    const todayCreditAmount = myCreditSales
        .filter(c => new Date(c.createdAt || c.dateTime).toDateString() === today)
        .reduce((sum, c) => sum + (c.amountDue || 0), 0);
    
    const todaySalesEl = document.getElementById('todaySales');
    const creditSalesEl = document.getElementById('creditSales');
    
    if (todaySalesEl) todaySalesEl.textContent = 'UGX ' + todaySalesAmount.toLocaleString();
    if (creditSalesEl) creditSalesEl.textContent = 'UGX ' + todayCreditAmount.toLocaleString();
}

// ========================================
// SETUP PAGE BASED ON CURRENT PAGE
// ========================================
function setupPage() {
    const path = window.location.pathname;
    console.log('🔧 Setting up page for path:', path);
    
    if (path.includes('newsale.html')) {
        setupNewSalePage();
    } else if (path.includes('creditsale.html')) {
        setupCreditSalePage();
    } else if (path.includes('history.html')) {
        setupHistoryPage();
    } else if (path.includes('dashboard.html')) {
        updateStockDisplay();
        updateSalesDisplay();
    }
}

// ========================================
// NEW SALE PAGE - FIXED VERSION
// ========================================
function setupNewSalePage() {
    console.log('💰 Setting up New Sale page');
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
    
    // Force update the dropdown
    console.log('🔄 Updating new sale dropdown...');
    updateProduceDropdown(produceSelect);
    
    document.getElementById('quantity').addEventListener('input', function() {
        const selectedOption = produceSelect.options[produceSelect.selectedIndex];
        const price = selectedOption?.getAttribute('data-price') || 0;
        const quantity = parseInt(this.value) || 0;
        document.getElementById('amountPaid').value = price * quantity;
    });
    
    document.getElementById('quantity').addEventListener('change', function() {
        const selectedOption = produceSelect.options[produceSelect.selectedIndex];
        const maxStock = parseInt(selectedOption?.getAttribute('data-max') || 0);
        const quantity = parseInt(this.value) || 0;
        
        if (quantity > maxStock) {
            alert(`Only ${maxStock}kg available!`);
            this.value = maxStock;
            this.dispatchEvent(new Event('input'));
        }
    });
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const selectedOption = produceSelect.options[produceSelect.selectedIndex];
        if (!selectedOption || selectedOption.value === '') {
            alert('Please select a product');
            return;
        }
        
        const quantity = parseInt(document.getElementById('quantity').value);
        const maxStock = parseInt(selectedOption?.getAttribute('data-max') || 0);
        
        if (quantity > maxStock) {
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
                await loadMySales();
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
    
    console.log('✅ New Sale page setup complete');
}

// ========================================
// CREDIT SALE PAGE - FIXED VERSION
// ========================================
function setupCreditSalePage() {
    console.log('💳 Setting up Credit Sale page');
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
    
    console.log('🔄 Updating credit sale dropdown...');
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
    
    if (quantityEl) {
        quantityEl.addEventListener('change', function() {
            const selectedOption = produceSelect.options[produceSelect.selectedIndex];
            const maxStock = parseInt(selectedOption?.getAttribute('data-max') || 0);
            const quantity = parseInt(this.value) || 0;
            
            if (quantity > maxStock) {
                alert(`Only ${maxStock}kg available!`);
                this.value = maxStock;
                this.dispatchEvent(new Event('input'));
            }
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
        const maxStock = parseInt(selectedOption?.getAttribute('data-max') || 0);
        
        if (quantity > maxStock) {
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
                await loadMySales();
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
    
    console.log('✅ Credit Sale page setup complete');
}

// ========================================
// HISTORY PAGE
// ========================================
function setupHistoryPage() {
    updateSalesDisplay();
    
    const applyFilter = document.getElementById('applyFilter');
    const filterType = document.getElementById('filterType');
    const dateFilter = document.getElementById('dateFilter');
    
    if (applyFilter) applyFilter.addEventListener('click', filterHistory);
    if (filterType) filterType.addEventListener('change', filterHistory);
    if (dateFilter) dateFilter.addEventListener('change', filterHistory);
}

// ========================================
// FILTER HISTORY
// ========================================
function filterHistory() {
    const filterType = document.getElementById('filterType')?.value || 'all';
    const dateFilter = document.getElementById('dateFilter')?.value;
    
    const cashFormatted = mySales.map(s => ({
        ...s,
        displayType: 'Cash',
        displayAmount: s.amountPaid,
        displayStatus: 'Completed',
        displayDate: s.dateTime
    }));
    
    const creditFormatted = myCreditSales.map(c => ({
        ...c,
        displayType: 'Credit',
        displayAmount: c.amountDue,
        displayStatus: c.status,
        displayDate: c.createdAt || c.dateTime
    }));
    
    let filtered = filterType === 'cash' ? cashFormatted : 
                   filterType === 'credit' ? creditFormatted : 
                   [...cashFormatted, ...creditFormatted];
    
    if (dateFilter) {
        filtered = filtered.filter(s => 
            new Date(s.displayDate).toISOString().split('T')[0] === dateFilter
        );
    }
    
    filtered.sort((a, b) => new Date(b.displayDate) - new Date(a.displayDate));
    displayHistory(filtered);
}

// ========================================
// DISPLAY HISTORY
// ========================================
function displayHistory(sales) {
    const historyBody = document.getElementById('salesHistoryBody');
    if (!historyBody) return;
    
    if (sales.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-history" style="font-size: 40px; color: #ccc;"></i><p style="margin-top: 10px;">No sales found</p></td></tr>`;
        document.getElementById('totalAmount').textContent = 'Total: UGX 0';
        return;
    }
    
    let html = '';
    let total = 0;
    
    sales.forEach(sale => {
        total += sale.displayAmount || 0;
        html += `<tr><td>${new Date(sale.displayDate).toLocaleString()}</td><td>${sale.produceName}</td><td>${sale.quantity} kg</td><td>UGX ${(sale.displayAmount || 0).toLocaleString()}</td><td>${sale.buyerName}</td><td>${sale.displayType}</td><td><span class="status-badge ${sale.displayStatus === 'Pending' ? 'warning' : 'success'}">${sale.displayStatus}</span></td></tr>`;
    });
    
    historyBody.innerHTML = html;
    document.getElementById('totalAmount').textContent = 'Total: UGX ' + total.toLocaleString();
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

console.log('🚀 Sales.js loaded - FULLY FIXED with product dropdown');