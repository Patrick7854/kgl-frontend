/**
 * KARIBU GROCERIES LTD (KGL) - Sales Agent Dashboard
 * Branches: MAGANJO and MATUGGA
 * Sales Agent can: Record sales, credit sales, view history
 * UPDATED: Fixed recent sales to show REAL data
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
    
    // Check if user is logged in
    if (!APIService.isAuthenticated()) {
        console.log('❌ Not authenticated, redirecting');
        window.location.href = '/frontend/pages/login.html';
        return;
    }
    
    // Get current user
    currentUser = APIService.getCurrentUser();
    
    // Verify user is Sales Agent
    if (currentUser.role !== 'Sales') {
        console.log('❌ Access denied');
        alert('Access denied. Sales Agents only.');
        APIService.redirectToDashboard(currentUser.role);
        return;
    }
    
    currentBranch = currentUser.branch;
    console.log('✅ Authenticated as:', currentUser.name);
    console.log('🏢 Branch:', currentBranch);
    
    // Update UI with user info
    updateUserInfo();
    
    // Load data
    await loadProduce();
    await loadMySales(); // This now loads REAL data
    
    // Setup page based on which page we're on
    setupPage();
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
        
        // Pass the token to APIService.getProduce
        const response = await APIService.getProduce(currentBranch, token);
        
        if (response.success) {
            produceList = response.produce || [];
            console.log(`✅ Loaded ${produceList.length} produce items`);
            updateStockDisplay();
        } else {
            console.log('❌ Failed to load produce:', response.message);
            produceList = [];
        }
    } catch (error) {
        console.log('❌ Error loading produce:', error);
        produceList = [];
    }
}

// ========================================
// 🟢 FIXED: LOAD MY SALES FROM API (NO MORE MOCK DATA)
// ========================================
async function loadMySales() {
    try {
        const token = localStorage.getItem('kgl_token');
        
        if (!token) {
            console.log('❌ No token found');
            return;
        }
        
        console.log('🔍 Fetching my sales history...');
        
        // Get all sales
        const salesResponse = await APIService.getSales(token);
        
        if (salesResponse.success) {
            const allSales = salesResponse.sales || [];
            
            // Filter sales by current user's name
            mySales = allSales.filter(sale => 
                sale.salesAgent === currentUser.name
            );
            
            console.log(`✅ Loaded ${mySales.length} personal cash sales`);
        } else {
            console.log('❌ Failed to load sales:', salesResponse.message);
            mySales = [];
        }
        
        // Get credit sales
        const creditResponse = await APIService.getCreditSales(token);
        
        if (creditResponse.success) {
            const allCreditSales = creditResponse.creditSales || [];
            
            // Filter credit sales by current user's name
            myCreditSales = allCreditSales.filter(credit => 
                credit.salesAgent === currentUser.name
            );
            
            console.log(`✅ Loaded ${myCreditSales.length} personal credit sales`);
        } else {
            console.log('❌ Failed to load credit sales:', creditResponse.message);
            myCreditSales = [];
        }
        
        // Update the display with real data
        updateSalesDisplay();
        
    } catch (error) {
        console.log('❌ Error loading sales:', error);
        mySales = [];
        myCreditSales = [];
    }
}

// ========================================
// UPDATE STOCK DISPLAY
// ========================================
function updateStockDisplay() {
    // Update dashboard stock table
    const stockBody = document.getElementById('stockBody');
    if (stockBody) {
        if (produceList.length === 0) {
            stockBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px;">
                        <i class="fas fa-box-open" style="font-size: 30px; color: #ccc;"></i>
                        <p style="margin-top: 10px;">No stock available</p>
                    </td>
                </tr>
            `;
        } else {
            let html = '';
            let totalStock = 0;
            
            produceList.forEach(item => {
                totalStock += item.tonnage || 0;
                
                let statusClass = 'in-stock';
                let statusText = 'In Stock';
                
                if (item.tonnage <= 0) {
                    statusClass = 'out-stock';
                    statusText = 'Out of Stock';
                } else if (item.tonnage < 1000) {
                    statusClass = 'low-stock';
                    statusText = 'Low Stock';
                }
                
                html += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.tonnage} kg</td>
                        <td>UGX ${item.sellingPrice?.toLocaleString() || '0'}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    </tr>
                `;
            });
            
            stockBody.innerHTML = html;
            
            // Update stats
            const availableStockEl = document.getElementById('availableStock');
            if (availableStockEl) {
                availableStockEl.textContent = totalStock + ' kg';
            }
        }
    }
}

// ========================================
// 🟢 FIXED: UPDATE SALES DISPLAY (NOW SHOWS AMOUNTS)
// ========================================
function updateSalesDisplay() {
    // Update dashboard recent sales
    const recentBody = document.getElementById('recentSalesBody');
    if (recentBody) {
        // Format cash sales
        const cashSalesFormatted = mySales.map(sale => ({
            dateTime: sale.dateTime,
            produceName: sale.produceName,
            quantity: sale.quantity,
            amount: sale.amountPaid,
            buyerName: sale.buyerName,
            type: 'Cash'
        }));
        
        // Format credit sales
        const creditSalesFormatted = myCreditSales.map(credit => ({
            dateTime: credit.createdAt || credit.dateTime,
            produceName: credit.produceName,
            quantity: credit.quantity,
            amount: credit.amountDue,
            buyerName: credit.buyerName,
            type: 'Credit'
        }));
        
        // Combine and sort all sales (newest first)
        const allSales = [...cashSalesFormatted, ...creditSalesFormatted]
            .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
            .slice(0, 5); // Show last 5
        
        if (allSales.length === 0) {
            recentBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        <i class="fas fa-shopping-cart" style="font-size: 30px; color: #ccc;"></i>
                        <p style="margin-top: 10px;">No sales yet. Record your first sale!</p>
                    </td>
                </tr>
            `;
        } else {
            let html = '';
            allSales.forEach(sale => {
                const date = new Date(sale.dateTime).toLocaleString();
                const amount = 'UGX ' + (sale.amount || 0).toLocaleString();
                
                html += `
                    <tr>
                        <td>${date}</td>
                        <td>${sale.produceName}</td>
                        <td>${sale.quantity} kg</td>
                        <td>${amount}</td>
                        <td>${sale.buyerName}</td>
                        <td><span class="badge ${sale.type === 'Cash' ? 'badge-success' : 'badge-warning'}">${sale.type}</span></td>
                    </tr>
                `;
            });
            recentBody.innerHTML = html;
        }
    }
    
    // Update stats
    const todaySalesEl = document.getElementById('todaySales');
    const creditSalesEl = document.getElementById('creditSales');
    const availableStockEl = document.getElementById('availableStock');
    
    // Calculate today's sales AMOUNT (not count)
    const today = new Date().toDateString();
    const todaySalesAmount = mySales
        .filter(sale => new Date(sale.dateTime).toDateString() === today)
        .reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
    
    // Calculate today's credit AMOUNT
    const todayCreditAmount = myCreditSales
        .filter(credit => new Date(credit.createdAt || credit.dateTime).toDateString() === today)
        .reduce((sum, credit) => sum + (credit.amountDue || 0), 0);
    
    if (todaySalesEl) todaySalesEl.textContent = 'UGX ' + todaySalesAmount.toLocaleString();
    if (creditSalesEl) creditSalesEl.textContent = 'UGX ' + todayCreditAmount.toLocaleString();
    
    // Calculate total stock
    const totalStock = produceList.reduce((sum, item) => sum + (item.tonnage || 0), 0);
    if (availableStockEl) availableStockEl.textContent = totalStock + ' kg';
}

// ========================================
// SETUP PAGE BASED ON CURRENT PAGE
// ========================================
function setupPage() {
    const path = window.location.pathname;
    
    if (path.includes('newsale.html')) {
        setupNewSalePage();
    } else if (path.includes('creditsale.html')) {
        setupCreditSalePage();
    } else if (path.includes('history.html')) {
        setupHistoryPage();
    }
}

// ========================================
// NEW SALE PAGE
// ========================================
function setupNewSalePage() {
    const produceSelect = document.getElementById('produceSelect');
    const form = document.getElementById('saleForm');
    
    if (!produceSelect || !form) return;
    
    // Populate produce dropdown
    updateProduceDropdown(produceSelect);
    
    // Calculate amount when quantity changes
    document.getElementById('quantity').addEventListener('input', function() {
        const selectedOption = produceSelect.options[produceSelect.selectedIndex];
        const price = selectedOption?.getAttribute('data-price') || 0;
        const quantity = parseInt(this.value) || 0;
        document.getElementById('amountPaid').value = price * quantity;
    });
    
    // Validate quantity against available stock
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
        const quantity = parseInt(document.getElementById('quantity').value);
        const maxStock = parseInt(selectedOption?.getAttribute('data-max') || 0);
        
        // Check if enough stock
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
                await loadProduce(); // Reload stock
                await loadMySales(); // Reload sales
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
// CREDIT SALE PAGE
// ========================================
function setupCreditSalePage() {
    const produceSelect = document.getElementById('produceSelect');
    const form = document.getElementById('creditSaleForm');
    
    if (!produceSelect || !form) return;
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const dispatchDateEl = document.getElementById('dispatchDate');
    const dueDateEl = document.getElementById('dueDate');
    
    if (dispatchDateEl) dispatchDateEl.value = today;
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    if (dueDateEl) dueDateEl.value = nextMonth.toISOString().split('T')[0];
    
    // Populate produce dropdown
    updateProduceDropdown(produceSelect);
    
    // Calculate amount when quantity changes
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
    
    // Validate quantity against available stock
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
        const quantity = parseInt(document.getElementById('quantity').value);
        const maxStock = parseInt(selectedOption?.getAttribute('data-max') || 0);
        
        // Check if enough stock
        if (quantity > maxStock) {
            alert('Insufficient stock!');
            return;
        }
        
        // Get ID type and number
        const idTypeEl = document.getElementById('idType');
        const idNumberEl = document.getElementById('idNumber');
        
        const creditData = {
            buyerName: document.getElementById('buyerName').value,
            idType: idTypeEl ? idTypeEl.value : 'NIN',
            idNumber: idNumberEl ? idNumberEl.value : document.getElementById('nin')?.value || '',
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
        
        console.log('📝 Submitting credit sale:', creditData);
        
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
                
                // Reset dates
                if (dispatchDateEl) dispatchDateEl.value = today;
                if (dueDateEl) dueDateEl.value = nextMonth.toISOString().split('T')[0];
                
                await loadProduce(); // Reload stock
                await loadMySales(); // Reload sales
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
// HELPER: Update produce dropdown
// ========================================
function updateProduceDropdown(produceSelect) {
    if (!produceSelect) return;
    
    // Clear existing options
    produceSelect.innerHTML = '<option value="">Select Product</option>';
    
    // Add new options
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
// HISTORY PAGE
// ========================================
function setupHistoryPage() {
    // Initial display
    updateSalesDisplay();
    
    const applyFilter = document.getElementById('applyFilter');
    if (applyFilter) {
        applyFilter.addEventListener('click', filterHistory);
    }
    
    const filterType = document.getElementById('filterType');
    const dateFilter = document.getElementById('dateFilter');
    
    if (filterType) {
        filterType.addEventListener('change', filterHistory);
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', filterHistory);
    }
}

// ========================================
// FILTER HISTORY
// ========================================
function filterHistory() {
    const filterType = document.getElementById('filterType')?.value || 'all';
    const dateFilter = document.getElementById('dateFilter')?.value;
    
    let filteredSales = [];
    
    // Format all sales
    const cashSalesFormatted = mySales.map(sale => ({
        ...sale,
        displayType: 'Cash',
        displayAmount: sale.amountPaid,
        displayStatus: 'Completed',
        displayDate: sale.dateTime
    }));
    
    const creditSalesFormatted = myCreditSales.map(credit => ({
        ...credit,
        displayType: 'Credit',
        displayAmount: credit.amountDue,
        displayStatus: credit.status,
        displayDate: credit.createdAt || credit.dateTime
    }));
    
    // Filter by type
    if (filterType === 'cash') {
        filteredSales = cashSalesFormatted;
    } else if (filterType === 'credit') {
        filteredSales = creditSalesFormatted;
    } else {
        filteredSales = [...cashSalesFormatted, ...creditSalesFormatted];
    }
    
    // Filter by date
    if (dateFilter) {
        filteredSales = filteredSales.filter(s => 
            new Date(s.displayDate).toISOString().split('T')[0] === dateFilter
        );
    }
    
    // Sort by date
    filteredSales.sort((a, b) => new Date(b.displayDate) - new Date(a.displayDate));
    
    // Display in history table
    displayHistory(filteredSales);
}

// ========================================
// DISPLAY HISTORY
// ========================================
function displayHistory(sales) {
    const historyBody = document.getElementById('salesHistoryBody');
    if (!historyBody) return;
    
    if (sales.length === 0) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-history" style="font-size: 40px; color: #ccc;"></i>
                    <p style="margin-top: 10px;">No sales found</p>
                </td>
            </tr>
        `;
        document.getElementById('totalAmount').textContent = 'Total: UGX 0';
        return;
    }
    
    let html = '';
    let total = 0;
    
    sales.forEach(sale => {
        total += sale.displayAmount || 0;
        const date = new Date(sale.displayDate).toLocaleString();
        const amount = 'UGX ' + (sale.displayAmount || 0).toLocaleString();
        const statusClass = sale.displayStatus === 'Pending' ? 'warning' : 'success';
        
        html += `
            <tr>
                <td>${date}</td>
                <td>${sale.produceName}</td>
                <td>${sale.quantity} kg</td>
                <td>${amount}</td>
                <td>${sale.buyerName}</td>
                <td>${sale.displayType}</td>
                <td><span class="status-badge ${statusClass}">${sale.displayStatus}</span></td>
            </tr>
        `;
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

// ========================================
// AUTO-REFRESH DATA EVERY 30 SECONDS
// ========================================
setInterval(async () => {
    console.log('🔄 Auto-refreshing sales data...');
    if (currentUser) {
        await loadProduce();
        await loadMySales();
    }
}, 30000);

console.log('🚀 Sales.js loaded - FULLY FIXED');