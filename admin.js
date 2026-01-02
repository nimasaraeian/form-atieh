// Admin Dashboard JavaScript
// Loads data from localStorage, normalizes it, calculates metrics, and renders charts

// Data storage
let patients = [];
let payments = [];
let treatments = [];

// Chart instances
let paymentTypesChart = null;
let treatmentProfitabilityChart = null;
let dailyRegistrationsChart = null;

// Initialize dashboard on page load
function initializeDashboard() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded! Retrying...');
        setTimeout(initializeDashboard, 500);
        return;
    }
    
    console.log('Chart.js loaded successfully');
    loadData();
    renderDashboard();
    setupExportButton();
}

// Wait for both DOM and Chart.js to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Give Chart.js a moment to load
    setTimeout(initializeDashboard, 100);
});

// Load data from localStorage
function loadData() {
    try {
        // Load patients (persons)
        const personsData = localStorage.getItem('persons');
        patients = personsData ? JSON.parse(personsData) : [];
        
        // Normalize patients data
        patients = patients.map(p => ({
            name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
            created_at: p.createdAt || p.created_at || new Date().toISOString()
        }));

        // Load payments (paymentTypes)
        const paymentsData = localStorage.getItem('paymentTypes');
        const rawPayments = paymentsData ? JSON.parse(paymentsData) : [];
        
        // Normalize payments data
        payments = rawPayments.map(p => ({
            type: p.type || '',
            score: parseInt(p.score) || 0,
            priority: p.priority || 0,
            created_at: p.createdAt || p.created_at || new Date().toISOString()
        }));

        // Load treatments
        const treatmentsData = localStorage.getItem('treatments');
        const rawTreatments = treatmentsData ? JSON.parse(treatmentsData) : [];
        
        // Normalize treatments data
        treatments = rawTreatments.map(t => ({
            name: t.name || '',
            profitability: t.profitability || 'medium',
            price: parseFloat(t.cost) || 0,
            created_at: t.createdAt || t.created_at || new Date().toISOString()
        }));

        console.log('Data loaded:', { patients, payments, treatments });
    } catch (error) {
        console.error('Error loading data:', error);
        patients = [];
        payments = [];
        treatments = [];
    }
}

// Calculate summary metrics
function calculateSummaryMetrics() {
    // Total registered users
    const totalUsers = patients.length;

    // Average payment score
    let avgPaymentScore = 0;
    if (payments.length > 0) {
        const totalScore = payments.reduce((sum, p) => sum + (p.score || 0), 0);
        avgPaymentScore = (totalScore / payments.length).toFixed(1);
    }

    // Top profitable treatment
    let topTreatment = '-';
    if (treatments.length > 0) {
        // Profitability order: very-high > high > medium > low > very-low
        const profitabilityOrder = {
            'very-high': 1,
            'high': 2,
            'medium': 3,
            'low': 4,
            'very-low': 5
        };
        
        // Group by treatment name and find most profitable
        const treatmentGroups = {};
        treatments.forEach(t => {
            if (!treatmentGroups[t.name]) {
                treatmentGroups[t.name] = {
                    name: t.name,
                    profitability: t.profitability,
                    order: profitabilityOrder[t.profitability] || 999
                };
            } else {
                // Keep the most profitable one
                const currentOrder = profitabilityOrder[t.profitability] || 999;
                if (currentOrder < treatmentGroups[t.name].order) {
                    treatmentGroups[t.name].profitability = t.profitability;
                    treatmentGroups[t.name].order = currentOrder;
                }
            }
        });

        // Find top treatment
        const sortedTreatments = Object.values(treatmentGroups)
            .sort((a, b) => a.order - b.order);
        
        if (sortedTreatments.length > 0) {
            topTreatment = sortedTreatments[0].name;
        }
    }

    return { totalUsers, avgPaymentScore, topTreatment };
}

// Count payment types
function countPaymentTypes() {
    const typeCounts = {};
    const typeScores = {};

    payments.forEach(p => {
        const type = p.type || 'نامشخص';
        if (!typeCounts[type]) {
            typeCounts[type] = 0;
            typeScores[type] = [];
        }
        typeCounts[type]++;
        if (p.score > 0) {
            typeScores[type].push(p.score);
        }
    });

    // Calculate averages
    const result = Object.keys(typeCounts).map(type => ({
        type,
        count: typeCounts[type],
        avgScore: typeScores[type].length > 0
            ? (typeScores[type].reduce((a, b) => a + b, 0) / typeScores[type].length).toFixed(1)
            : '0'
    }));

    return result.sort((a, b) => b.count - a.count);
}

// Calculate treatment profitability ranking
function calculateTreatmentProfitability() {
    const treatmentGroups = {};

    treatments.forEach(t => {
        const name = t.name || 'نامشخص';
        if (!treatmentGroups[name]) {
            treatmentGroups[name] = {
                name,
                profitability: t.profitability || 'medium',
                prices: [],
                count: 0
            };
        }
        treatmentGroups[name].count++;
        if (t.price > 0) {
            treatmentGroups[name].prices.push(t.price);
        }
    });

    // Calculate average price for each treatment
    const result = Object.values(treatmentGroups).map(t => ({
        name: t.name,
        profitability: t.profitability,
        avgPrice: t.prices.length > 0
            ? Math.round(t.prices.reduce((a, b) => a + b, 0) / t.prices.length)
            : 0,
        count: t.count
    }));

    // Sort by profitability order
    const profitabilityOrder = {
        'very-high': 1,
        'high': 2,
        'medium': 3,
        'low': 4,
        'very-low': 5
    };

    return result.sort((a, b) => {
        const orderA = profitabilityOrder[a.profitability] || 999;
        const orderB = profitabilityOrder[b.profitability] || 999;
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return b.avgPrice - a.avgPrice;
    });
}

// Calculate daily registrations
function calculateDailyRegistrations() {
    const dailyCounts = {};

    patients.forEach(p => {
        try {
            const date = new Date(p.created_at);
            const dateStr = date.toLocaleDateString('fa-IR');
            dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
        } catch (e) {
            // If date parsing fails, use today
            const today = new Date().toLocaleDateString('fa-IR');
            dailyCounts[today] = (dailyCounts[today] || 0) + 1;
        }
    });

    // Sort by date
    const sortedDates = Object.keys(dailyCounts).sort((a, b) => {
        try {
            return new Date(a) - new Date(b);
        } catch {
            return 0;
        }
    });

    return {
        labels: sortedDates,
        data: sortedDates.map(date => dailyCounts[date])
    };
}

// Render payment types pie chart
function renderPaymentTypesChart() {
    const ctx = document.getElementById('paymentTypesChart');
    if (!ctx) {
        console.error('Payment types chart canvas not found');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not available');
        ctx.parentElement.innerHTML = '<p class="no-data">خطا در بارگذاری کتابخانه نمودار</p>';
        return;
    }

    const paymentCounts = countPaymentTypes();
    
    if (paymentCounts.length === 0) {
        ctx.parentElement.innerHTML = '<p class="no-data">داده‌ای برای نمایش وجود ندارد</p>';
        return;
    }

    // Destroy existing chart if it exists
    if (paymentTypesChart) {
        paymentTypesChart.destroy();
    }

    const labels = paymentCounts.map(p => p.type);
    const data = paymentCounts.map(p => p.count);
    
    // Generate colors
    const colors = generateColors(data.length);

    try {
        paymentTypesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Render treatment profitability bar chart
function renderTreatmentProfitabilityChart() {
    const ctx = document.getElementById('treatmentProfitabilityChart');
    if (!ctx) {
        console.error('Treatment profitability chart canvas not found');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not available');
        ctx.parentElement.innerHTML = '<p class="no-data">خطا در بارگذاری کتابخانه نمودار</p>';
        return;
    }

    const treatmentData = calculateTreatmentProfitability();
    
    if (treatmentData.length === 0) {
        ctx.parentElement.innerHTML = '<p class="no-data">داده‌ای برای نمایش وجود ندارد</p>';
        return;
    }

    // Destroy existing chart if it exists
    if (treatmentProfitabilityChart) {
        treatmentProfitabilityChart.destroy();
    }

    const labels = treatmentData.map(t => t.name);
    const prices = treatmentData.map(t => t.avgPrice);
    
    // Color based on profitability
    const profitabilityColors = {
        'very-high': '#28a745',
        'high': '#17a2b8',
        'medium': '#ffc107',
        'low': '#fd7e14',
        'very-low': '#dc3545'
    };

    const colors = treatmentData.map(t => 
        profitabilityColors[t.profitability] || '#6c757d'
    );

    try {
        treatmentProfitabilityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'میانگین قیمت (تومان)',
                data: prices,
                backgroundColor: colors,
                borderColor: colors.map(c => darkenColor(c, 0.2)),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y || 0;
                            return `قیمت: ${value.toLocaleString('fa-IR')} تومان`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('fa-IR');
                        }
                    }
                }
            }
        }
    });
    } catch (error) {
        console.error('Error rendering treatment profitability chart:', error);
        ctx.parentElement.innerHTML = '<p class="no-data">خطا در نمایش نمودار: ' + error.message + '</p>';
    }
}

// Render daily registrations line chart
function renderDailyRegistrationsChart() {
    const ctx = document.getElementById('dailyRegistrationsChart');
    if (!ctx) {
        console.error('Daily registrations chart canvas not found');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not available');
        ctx.parentElement.innerHTML = '<p class="no-data">خطا در بارگذاری کتابخانه نمودار</p>';
        return;
    }

    const dailyData = calculateDailyRegistrations();
    
    if (dailyData.labels.length === 0) {
        ctx.parentElement.innerHTML = '<p class="no-data">داده‌ای برای نمایش وجود ندارد</p>';
        return;
    }

    // Destroy existing chart if it exists
    if (dailyRegistrationsChart) {
        dailyRegistrationsChart.destroy();
    }

    try {
        dailyRegistrationsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyData.labels,
            datasets: [{
                label: 'تعداد ثبت‌نام',
                data: dailyData.data,
                borderColor: '#8B1538',
                backgroundColor: 'rgba(139, 21, 56, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#8B1538',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `ثبت‌نام: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
    } catch (error) {
        console.error('Error rendering daily registrations chart:', error);
        ctx.parentElement.innerHTML = '<p class="no-data">خطا در نمایش نمودار: ' + error.message + '</p>';
    }
}

// Render summary cards
function renderSummaryCards() {
    const metrics = calculateSummaryMetrics();
    
    document.getElementById('totalUsers').textContent = metrics.totalUsers;
    document.getElementById('avgPaymentScore').textContent = metrics.avgPaymentScore;
    document.getElementById('topTreatment').textContent = metrics.topTreatment;
}

// Render payment types table
function renderPaymentTypesTable() {
    const tbody = document.getElementById('paymentTypesTableBody');
    if (!tbody) return;

    const paymentCounts = countPaymentTypes();

    if (paymentCounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="no-data-cell">داده‌ای وجود ندارد</td></tr>';
        return;
    }

    tbody.innerHTML = paymentCounts.map(p => `
        <tr>
            <td>${p.type}</td>
            <td>${p.count}</td>
            <td>${p.avgScore}</td>
        </tr>
    `).join('');
}

// Render treatments table
function renderTreatmentsTable() {
    const tbody = document.getElementById('treatmentsTableBody');
    if (!tbody) return;

    const treatmentData = calculateTreatmentProfitability();

    if (treatmentData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data-cell">داده‌ای وجود ندارد</td></tr>';
        return;
    }

    const profitabilityLabels = {
        'very-high': 'خیلی پرسود',
        'high': 'پرسود',
        'medium': 'متوسط',
        'low': 'کم‌سود',
        'very-low': 'خیلی کم‌سود'
    };

    tbody.innerHTML = treatmentData.map(t => `
        <tr>
            <td>${t.name}</td>
            <td>${profitabilityLabels[t.profitability] || t.profitability}</td>
            <td>${t.avgPrice > 0 ? t.avgPrice.toLocaleString('fa-IR') : '-'}</td>
            <td>${t.count}</td>
        </tr>
    `).join('');
}

// Render entire dashboard
function renderDashboard() {
    try {
        console.log('Rendering dashboard...');
        renderSummaryCards();
        console.log('Summary cards rendered');
        
        renderPaymentTypesChart();
        console.log('Payment types chart rendered');
        
        renderPaymentTypesTable();
        console.log('Payment types table rendered');
        
        renderTreatmentProfitabilityChart();
        console.log('Treatment profitability chart rendered');
        
        renderTreatmentsTable();
        console.log('Treatments table rendered');
        
        renderDailyRegistrationsChart();
        console.log('Daily registrations chart rendered');
        
        console.log('Dashboard rendered successfully');
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        alert('خطا در نمایش داشبورد: ' + error.message);
    }
}

// Export to CSV
function exportToCSV() {
    // Export payments
    const paymentCounts = countPaymentTypes();
    let csvContent = 'نوع پرداخت,تعداد,میانگین امتیاز\n';
    paymentCounts.forEach(p => {
        csvContent += `${p.type},${p.count},${p.avgScore}\n`;
    });

    // Add treatments
    const treatmentData = calculateTreatmentProfitability();
    csvContent += '\n\nنام درمان,سطح سودآوری,میانگین قیمت,تعداد\n';
    const profitabilityLabels = {
        'very-high': 'خیلی پرسود',
        'high': 'پرسود',
        'medium': 'متوسط',
        'low': 'کم‌سود',
        'very-low': 'خیلی کم‌سود'
    };
    treatmentData.forEach(t => {
        csvContent += `${t.name},${profitabilityLabels[t.profitability] || t.profitability},${t.avgPrice},${t.count}\n`;
    });

    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `admin-report-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// Setup export button
function setupExportButton() {
    const exportBtn = document.getElementById('exportCSVBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }
}

// Utility: Generate colors for charts
function generateColors(count) {
    const colors = [
        '#8B1538', '#17a2b8', '#28a745', '#ffc107', '#fd7e14',
        '#dc3545', '#6f42c1', '#20c997', '#e83e8c', '#6c757d'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(colors[i % colors.length]);
    }
    return result;
}

// Utility: Darken color
function darkenColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xFF) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0xFF) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0xFF) - Math.round(255 * amount));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

