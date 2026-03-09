/**
 * KARIBU GROCERIES LTD (KGL) - Stock Overview
 * Fetches and displays real stock data from API
 */

// ========================================
// CHECK AUTHENTICATION
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Stock Overview page loaded');
    
    // Check if user is logged in
    if (!APIService.isAuthenticated()) {
        console.log('❌ Not authenticated, redirecting');
        window.location.href = '/frontend/pages/login.html';
        return;
    }
    
    // Get current user
    const user = APIService.getCurrentUser();
    
    // Verify user is Director (only directors should see all stock)
    if (user.role !== 'Director') {
        console.log('❌ Access denied');
        alert('Access denied. Directors only.');
        APIService.redirectToDashboard(user.role);
        return;
    }
    
    console.log('✅ Authenticated as:', user.name);
    
    // Load stock data
    await loadStockData();
});

// ========================================
// LOAD STOCK DATA FROM API
// ========================================
async function loadStockData() {
    try {
        const token = localStorage.getItem('kgl_token');
        
        if (!token) {
            console.log('❌ No token found');
            window.location.href = '/frontend/pages/login.html';
            return;
        }
        
        console.log('🔍 Fetching stock data...');
        
        // Show loading states
        showLoading(true);
        
        // Fetch all produce
        const response = await APIService.getProduce(null, token);
        
        if (response.success) {
            const produce = response.produce || [];
            console.log(`✅ Loaded ${produce.length} stock items`);
            
            // Process and display data
            processStockData(produce);
        } else {
            console.log('❌ Failed to load stock:', response.message);
            showError('Failed to load stock data');
        }
    } catch (error) {
        console.log('❌ Error loading stock:', error);
        showError('Error loading stock data');
    } finally {
        showLoading(false);
    }
}

// ========================================
// PROCESS AND DISPLAY STOCK DATA
// ========================================
function processStockData(produce) {
    // Separate by branch
    const maganjoStock = produce.filter(item => item.branch === 'MAGANJO');
    const matuggaStock = produce.filter(item => item.branch === 'MATUGGA');
    
    // Calculate totals
    const totalKg = produce.reduce((sum, item) => sum + (item.tonnage || 0), 0);
    const maganjoKg = maganjoStock.reduce((sum, item) => sum + (item.tonnage || 0), 0);
    const matuggaKg = matuggaStock.reduce((sum, item) => sum + (item.tonnage || 0), 0);
    
    // Calculate counts
    const inStock = produce.filter(item => item.tonnage > 0).length;
    const lowStock = produce.filter(item => item.tonnage > 0 && item.tonnage < 1000).length;
    const outOfStock = produce.filter(item => item.tonnage <= 0).length;
    
    // Update summary cards
    document.getElementById('totalStockKg').textContent = totalKg.toLocaleString() + ' kg';
    document.getElementById('lowStockCount').textContent = lowStock;
    document.getElementById('inStockCount').textContent = inStock;
    document.getElementById('outOfStockCount').textContent = outOfStock;
    
    // Update branch totals
    document.getElementById('maganjoTotalKg').textContent = 'Total: ' + maganjoKg.toLocaleString() + ' kg';
    document.getElementById('matuggaTotalKg').textContent = 'Total: ' + matuggaKg.toLocaleString() + ' kg';
    
    // Display tables
    displayMaganjoStock(maganjoStock);
    displayMatuggaStock(matuggaStock);
    
    // Show low stock alert if needed
    if (lowStock > 0 || outOfStock > 0) {
        showLowStockAlert(lowStock, outOfStock);
    }
}

// ========================================
// DISPLAY MAGANJO STOCK TABLE
// ========================================
function displayMaganjoStock(stock) {
    const tbody = document.getElementById('maganjoStockBody');
    
    if (!tbody) return;
    
    if (stock.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px;">
                    <i class="fas fa-box-open" style="font-size: 30px; color: #ccc;"></i>
                    <p style="margin-top: 10px;">No stock in MAGANJO branch</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    stock.forEach(item => {
        const status = getStockStatus(item.tonnage);
        html += `
            <tr>
                <td>${item.name}</td>
                <td>${item.type || item.name}</td>
                <td>${item.tonnage.toLocaleString()}</td>
                <td>UGX ${item.sellingPrice?.toLocaleString() || '0'}</td>
                <td><span class="status-badge ${status.class}">${status.text}</span></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ========================================
// DISPLAY MATUGGA STOCK TABLE
// ========================================
function displayMatuggaStock(stock) {
    const tbody = document.getElementById('matuggaStockBody');
    
    if (!tbody) return;
    
    if (stock.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px;">
                    <i class="fas fa-box-open" style="font-size: 30px; color: #ccc;"></i>
                    <p style="margin-top: 10px;">No stock in MATUGGA branch</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    stock.forEach(item => {
        const status = getStockStatus(item.tonnage);
        html += `
            <tr>
                <td>${item.name}</td>
                <td>${item.type || item.name}</td>
                <td>${item.tonnage.toLocaleString()}</td>
                <td>UGX ${item.sellingPrice?.toLocaleString() || '0'}</td>
                <td><span class="status-badge ${status.class}">${status.text}</span></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ========================================
// HELPER: Get stock status based on tonnage
// ========================================
function getStockStatus(tonnage) {
    if (tonnage <= 0) {
        return { class: 'out-stock', text: 'Out of Stock' };
    } else if (tonnage < 1000) {
        return { class: 'low-stock', text: 'Low Stock' };
    } else {
        return { class: 'in-stock', text: 'In Stock' };
    }
}

// ========================================
// SHOW LOW STOCK ALERT
// ========================================
function showLowStockAlert(lowStock, outOfStock) {
    const alertDiv = document.getElementById('lowStockAlert');
    const messageSpan = document.getElementById('lowStockMessage');
    
    if (alertDiv && messageSpan) {
        let message = '';
        if (outOfStock > 0) {
            message += `${outOfStock} item(s) out of stock. `;
        }
        if (lowStock > 0) {
            message += `${lowStock} item(s) low on stock (<1000kg).`;
        }
        messageSpan.textContent = message;
        alertDiv.style.display = 'flex';
    }
}

// ========================================
// SHOW LOADING STATE
// ========================================
function showLoading(show) {
    const maganjoBody = document.getElementById('maganjoStockBody');
    const matuggaBody = document.getElementById('matuggaStockBody');
    
    if (show) {
        if (maganjoBody) {
            maganjoBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 30px; color: var(--gold-primary);"></i>
                        <p style="margin-top: 10px;">Loading stock...</p>
                    </td>
                </tr>
            `;
        }
        if (matuggaBody) {
            matuggaBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 30px; color: var(--gold-primary);"></i>
                        <p style="margin-top: 10px;">Loading stock...</p>
                    </td>
                </tr>
            `;
        }
    }
}

// ========================================
// SHOW ERROR MESSAGE
// ========================================
function showError(message) {
    const maganjoBody = document.getElementById('maganjoStockBody');
    const matuggaBody = document.getElementById('matuggaStockBody');
    
    const errorHtml = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle" style="font-size: 40px; color: var(--danger);"></i>
                <p style="margin-top: 10px; color: var(--danger);">${message}</p>
            </td>
        </tr>
    `;
    
    if (maganjoBody) maganjoBody.innerHTML = errorHtml;
    if (matuggaBody) matuggaBody.innerHTML = errorHtml;
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
// AUTO-REFRESH EVERY 30 SECONDS
// ========================================
setInterval(async () => {
    console.log('🔄 Auto-refreshing stock data...');
    await loadStockData();
}, 30000);