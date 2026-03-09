/**
 * KGL Groceries LTD - Reports Page
 * Director only - View aggregated sales
 * FIXED: Charts now load properly
 */

// ========================================
// GLOBAL VARIABLES
// ========================================
let branchChart, productChart;
let salesData = [];
let creditData = [];
let allSales = [];

// ========================================
// CHECK AUTHENTICATION
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Reports page loaded');
    
    // Check if logged in
    if (!localStorage.getItem('kgl_token') || !localStorage.getItem('kgl_user')) {
        window.location.href = '/frontend/pages/login.html';
        return;
    }
    
    // Check if director
    const user = JSON.parse(localStorage.getItem('kgl_user'));
    if (user.role !== 'Director') {
        alert('Access denied. Directors only.');
        window.location.href = '/frontend/pages/login.html';
        return;
    }
    
    // Set default dates (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput) startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    if (endDateInput) endDateInput.value = today.toISOString().split('T')[0];
    
    // Load real data from API
    await loadReportData();
    
    // Setup filters
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            filterReports();
        });
    }
    
    // Add export buttons
    addExportButtons();
});

// ========================================
// LOAD REPORT DATA FROM API
// ========================================
async function loadReportData() {
    try {
        const token = localStorage.getItem('kgl_token');
        
        if (!token) {
            console.log('❌ No token found');
            return;
        }
        
        console.log('🔍 Fetching sales data for reports...');
        
        // Show loading state
        showLoading(true);
        
        // Fetch sales data
        const salesResponse = await APIService.getSales(token);
        // Fetch credit sales data
        const creditResponse = await APIService.getCreditSales(token);
        
        if (salesResponse && salesResponse.success) {
            // Transform sales data
            salesData = (salesResponse.sales || []).map(sale => ({
                date: new Date(sale.dateTime).toISOString().split('T')[0],
                branch: sale.branch,
                product: sale.produceName,
                quantity: sale.quantity,
                amount: sale.amountPaid,
                type: 'Cash',
                status: 'Completed'
            }));
            
            console.log(`✅ Loaded ${salesData.length} cash sales`);
        } else {
            console.log('❌ Failed to load sales:', salesResponse?.message);
            salesData = [];
        }
        
        if (creditResponse && creditResponse.success) {
            // Transform credit sales data
            creditData = (creditResponse.creditSales || []).map(credit => ({
                date: new Date(credit.createdAt || credit.dateTime).toISOString().split('T')[0],
                branch: credit.branch,
                product: credit.produceName,
                quantity: credit.quantity,
                amount: credit.amountDue,
                type: 'Credit',
                status: credit.status
            }));
            
            console.log(`✅ Loaded ${creditData.length} credit sales`);
        } else {
            console.log('❌ Failed to load credit sales:', creditResponse?.message);
            creditData = [];
        }
        
        // Combine all sales
        allSales = [...salesData, ...creditData];
        console.log(`✅ Total ${allSales.length} transactions loaded`);
        
        // Hide loading and update reports
        showLoading(false);
        filterReports();
        
    } catch (error) {
        console.log('❌ Error loading report data:', error);
        salesData = [];
        creditData = [];
        allSales = [];
        showLoading(false);
    }
}

// ========================================
// SHOW/HIDE LOADING
// ========================================
function showLoading(show) {
    const branchChartCanvas = document.getElementById('branchChart');
    const productChartCanvas = document.getElementById('productChart');
    const recentTransactions = document.getElementById('recentTransactions');
    
    if (show) {
        // Hide canvases and show loading
        if (branchChartCanvas) branchChartCanvas.style.display = 'none';
        if (productChartCanvas) productChartCanvas.style.display = 'none';
        
        // Add loading indicators
        const branchContainer = branchChartCanvas?.parentElement;
        if (branchContainer && !document.getElementById('branchLoading')) {
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'branchLoading';
            loadingDiv.innerHTML = '<div style="text-align: center; padding: 50px;"><i class="fas fa-spinner fa-spin" style="font-size: 40px; color: var(--gold-primary);"></i><p style="margin-top: 10px;">Loading chart...</p></div>';
            branchContainer.appendChild(loadingDiv);
        }
        
        const productContainer = productChartCanvas?.parentElement;
        if (productContainer && !document.getElementById('productLoading')) {
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'productLoading';
            loadingDiv.innerHTML = '<div style="text-align: center; padding: 50px;"><i class="fas fa-spinner fa-spin" style="font-size: 40px; color: var(--gold-primary);"></i><p style="margin-top: 10px;">Loading chart...</p></div>';
            productContainer.appendChild(loadingDiv);
        }
        
        if (recentTransactions) {
            recentTransactions.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;"><i class="fas fa-spinner fa-spin" style="font-size: 30px; color: var(--gold-primary);"></i><p style="margin-top: 10px;">Loading transactions...</p></td></tr>';
        }
    } else {
        // Show canvases and remove loading
        if (branchChartCanvas) branchChartCanvas.style.display = 'block';
        if (productChartCanvas) productChartCanvas.style.display = 'block';
        
        const branchLoading = document.getElementById('branchLoading');
        if (branchLoading) branchLoading.remove();
        
        const productLoading = document.getElementById('productLoading');
        if (productLoading) productLoading.remove();
    }
}

// ========================================
// FILTER REPORTS BY DATE
// ========================================
function filterReports() {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    console.log('🔍 Filtering reports from', startDate, 'to', endDate);
    
    // Filter by date
    let filtered = allSales;
    if (startDate && endDate) {
        filtered = allSales.filter(s => s.date >= startDate && s.date <= endDate);
    }
    
    console.log(`📊 Found ${filtered.length} transactions in date range`);
    
    // Calculate branch totals
    const maganjoTotal = filtered
        .filter(s => s.branch === 'MAGANJO')
        .reduce((sum, s) => sum + s.amount, 0);
    
    const matuggaTotal = filtered
        .filter(s => s.branch === 'MATUGGA')
        .reduce((sum, s) => sum + s.amount, 0);
    
    const combinedTotal = maganjoTotal + matuggaTotal;
    
    // Calculate credit totals
    const creditTotal = filtered
        .filter(s => s.type === 'Credit')
        .reduce((sum, s) => sum + s.amount, 0);
    
    const outstanding = filtered
        .filter(s => s.type === 'Credit' && s.status === 'Pending')
        .reduce((sum, s) => sum + s.amount, 0);
    
    const maganjoCredit = filtered
        .filter(s => s.branch === 'MAGANJO' && s.type === 'Credit')
        .reduce((sum, s) => sum + s.amount, 0);
    
    const matuggaCredit = filtered
        .filter(s => s.branch === 'MATUGGA' && s.type === 'Credit')
        .reduce((sum, s) => sum + s.amount, 0);
    
    // Update UI
    const maganjoTotalEl = document.getElementById('maganjoTotal');
    const matuggaTotalEl = document.getElementById('matuggaTotal');
    const combinedTotalEl = document.getElementById('combinedTotal');
    const totalCreditEl = document.getElementById('totalCredit');
    const outstandingEl = document.getElementById('outstanding');
    const maganjoCreditEl = document.getElementById('maganjoCredit');
    const matuggaCreditEl = document.getElementById('matuggaCredit');
    
    if (maganjoTotalEl) maganjoTotalEl.textContent = 'UGX ' + maganjoTotal.toLocaleString();
    if (matuggaTotalEl) matuggaTotalEl.textContent = 'UGX ' + matuggaTotal.toLocaleString();
    if (combinedTotalEl) combinedTotalEl.textContent = 'UGX ' + combinedTotal.toLocaleString();
    if (totalCreditEl) totalCreditEl.textContent = 'UGX ' + creditTotal.toLocaleString();
    if (outstandingEl) outstandingEl.textContent = 'UGX ' + outstanding.toLocaleString();
    if (maganjoCreditEl) maganjoCreditEl.textContent = 'UGX ' + maganjoCredit.toLocaleString();
    if (matuggaCreditEl) matuggaCreditEl.textContent = 'UGX ' + matuggaCredit.toLocaleString();
    
    // Update charts
    updateBranchChart(maganjoTotal, matuggaTotal);
    updateProductChart(filtered);
    
    // Update transactions table
    updateTransactionsTable(filtered);
}

// ========================================
// UPDATE BRANCH CHART
// ========================================
function updateBranchChart(maganjo, matugga) {
    const ctx = document.getElementById('branchChart')?.getContext('2d');
    if (!ctx) {
        console.log('❌ Branch chart canvas not found');
        return;
    }
    
    // Destroy existing chart if it exists
    if (branchChart) {
        branchChart.destroy();
    }
    
    // Create new chart
    branchChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['MAGANJO', 'MATUGGA'],
            datasets: [{
                label: 'Sales (UGX)',
                data: [maganjo, matugga],
                backgroundColor: ['#D4AF37', '#0B1E33'],
                borderColor: ['#B49450', '#1A2F4A'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'UGX ' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Branch chart updated');
}

// ========================================
// UPDATE PRODUCT CHART
// ========================================
function updateProductChart(filtered) {
    const ctx = document.getElementById('productChart')?.getContext('2d');
    if (!ctx) {
        console.log('❌ Product chart canvas not found');
        return;
    }
    
    // Group by product
    const products = {};
    filtered.forEach(sale => {
        if (!products[sale.product]) {
            products[sale.product] = 0;
        }
        products[sale.product] += sale.amount;
    });
    
    // Destroy existing chart if it exists
    if (productChart) {
        productChart.destroy();
    }
    
    const hasData = Object.keys(products).length > 0;
    
    // Create new chart
    productChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: hasData ? Object.keys(products) : ['No Data'],
            datasets: [{
                data: hasData ? Object.values(products) : [1],
                backgroundColor: hasData ? 
                    ['#D4AF37', '#0B1E33', '#1A2F4A', '#2C3E5A', '#6B7280'] : 
                    ['#E5E7EB']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (!hasData) return 'No sales data';
                            let label = context.label || '';
                            let value = context.raw || 0;
                            return label + ': UGX ' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Product chart updated');
}

// ========================================
// UPDATE TRANSACTIONS TABLE
// ========================================
function updateTransactionsTable(filtered) {
    const tbody = document.getElementById('recentTransactions');
    if (!tbody) return;
    
    // Sort by date (newest first)
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-chart-line" style="font-size: 40px; color: #ccc; margin-bottom: 10px;"></i><p>No transactions found for this period.</p></td></tr>';
        return;
    }
    
    let html = '';
    sorted.slice(0, 20).forEach(sale => {
        const statusClass = sale.status === 'Pending' ? 'warning' : 'success';
        html += `
            <tr>
                <td>${sale.date}</td>
                <td>${sale.branch}</td>
                <td>${sale.product}</td>
                <td>${sale.quantity} kg</td>
                <td>UGX ${sale.amount.toLocaleString()}</td>
                <td>${sale.type}</td>
                <td><span class="status-badge ${statusClass}">${sale.status || 'Completed'}</span></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ========================================
// ADD EXPORT BUTTONS
// ========================================
function addExportButtons() {
    const filterSection = document.querySelector('.date-range');
    if (filterSection && !document.getElementById('exportButtons')) {
        const exportDiv = document.createElement('div');
        exportDiv.id = 'exportButtons';
        exportDiv.className = 'export-buttons';
        exportDiv.style.marginTop = '15px';
        exportDiv.style.display = 'flex';
        exportDiv.style.gap = '10px';
        exportDiv.innerHTML = `
            <button class="btn btn-primary" onclick="exportToPDF()">
                <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button class="btn btn-success" onclick="exportToExcel()">
                <i class="fas fa-file-excel"></i> Export Excel
            </button>
        `;
        filterSection.parentNode.insertBefore(exportDiv, filterSection.nextSibling);
    }
}

// ========================================
// EXPORT TO PDF
// ========================================
function exportToPDF() {
    try {
        const maganjoTotal = document.getElementById('maganjoTotal')?.textContent || 'UGX 0';
        const matuggaTotal = document.getElementById('matuggaTotal')?.textContent || 'UGX 0';
        const combinedTotal = document.getElementById('combinedTotal')?.textContent || 'UGX 0';
        const totalCredit = document.getElementById('totalCredit')?.textContent || 'UGX 0';
        const outstanding = document.getElementById('outstanding')?.textContent || 'UGX 0';
        
        const startDate = document.getElementById('startDate')?.value || 'N/A';
        const endDate = document.getElementById('endDate')?.value || 'N/A';
        
        const reportContent = `
KARIBU GROCERIES LTD - SALES REPORT
====================================
Generated: ${new Date().toLocaleString()}
Period: ${startDate} to ${endDate}

BRANCH SUMMARY
--------------
MAGANJO: ${maganjoTotal}
MATUGGA: ${matuggaTotal}
TOTAL: ${combinedTotal}

CREDIT SUMMARY
--------------
Total Credit: ${totalCredit}
Outstanding: ${outstanding}

Report generated by KGL Management System
        `;
        
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `KGL_Report_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        alert('✅ Report downloaded!');
    } catch (error) {
        console.error('Export error:', error);
        alert('❌ Error generating report');
    }
}

// ========================================
// EXPORT TO EXCEL
// ========================================
function exportToExcel() {
    try {
        const maganjoTotal = document.getElementById('maganjoTotal')?.textContent || 'UGX 0';
        const matuggaTotal = document.getElementById('matuggaTotal')?.textContent || 'UGX 0';
        const combinedTotal = document.getElementById('combinedTotal')?.textContent || 'UGX 0';
        
        const csv = [
            'KARIBU GROCERIES SALES REPORT',
            `Generated: ${new Date().toLocaleString()}`,
            '',
            'Branch,Total',
            `MAGANJO,${maganjoTotal.replace('UGX ', '')}`,
            `MATUGGA,${matuggaTotal.replace('UGX ', '')}`,
            `COMBINED,${combinedTotal.replace('UGX ', '')}`
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `KGL_Report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        alert('✅ Report downloaded!');
    } catch (error) {
        console.error('Export error:', error);
        alert('❌ Error generating report');
    }
}

// ========================================
// LOGOUT
// ========================================
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('kgl_user');
        localStorage.removeItem('kgl_token');
        window.location.href = '/frontend/pages/login.html';
    });
}

// ========================================
// AUTO-REFRESH EVERY 30 SECONDS
// ========================================
setInterval(async () => {
    console.log('🔄 Auto-refreshing reports...');
    await loadReportData();
}, 30000);