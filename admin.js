// Admin Dashboard JavaScript
// Loads data from localStorage, normalizes it, calculates metrics, and renders charts

// Data storage
let patients = [];
let payments = [];
let treatments = [];

// Chart instances
let paymentTypesChart = null;
let paymentScoreChart = null;
let treatmentProfitabilityChart = null;
let revenueChart = null;
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
    setupRefreshButton();
    setupDebugPanel();
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
        const rawPatients = personsData ? JSON.parse(personsData) : [];
        console.log('Raw patients from localStorage:', rawPatients);
        
        // Normalize patients data
        patients = rawPatients.map(p => ({
            name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
            created_at: p.createdAt || p.created_at || new Date().toISOString()
        }));
        console.log('Normalized patients:', patients);

        // Load payments (paymentTypes)
        const paymentsData = localStorage.getItem('paymentTypes');
        const rawPayments = paymentsData ? JSON.parse(paymentsData) : [];
        console.log('Raw payments from localStorage:', rawPayments);
        
        // Normalize payments data
        payments = rawPayments.map(p => ({
            type: p.type || '',
            score: parseInt(p.score) || 0,
            priority: p.priority || 0,
            created_at: p.createdAt || p.created_at || new Date().toISOString()
        }));
        console.log('Normalized payments:', payments);

        // Load treatments
        const treatmentsData = localStorage.getItem('treatments');
        const rawTreatments = treatmentsData ? JSON.parse(treatmentsData) : [];
        console.log('Raw treatments from localStorage:', rawTreatments);
        
        // Normalize treatments data
        treatments = rawTreatments.map(t => ({
            name: t.name || '',
            profitability: t.profitability || 'medium',
            price: parseFloat(t.cost) || 0,
            created_at: t.createdAt || t.created_at || new Date().toISOString()
        }));
        console.log('Normalized treatments:', treatments);

        console.log('✅ Data loaded successfully:', {
            patientsCount: patients.length,
            paymentsCount: payments.length,
            treatmentsCount: treatments.length
        });

        // Show warning if no data
        if (patients.length === 0 && payments.length === 0 && treatments.length === 0) {
            console.warn('⚠️ No data found in localStorage. Please add some data first.');
            showDataWarning();
        }
    } catch (error) {
        console.error('❌ Error loading data:', error);
        patients = [];
        payments = [];
        treatments = [];
        showDataError(error.message);
    }
}

// Show warning when no data is available
function showDataWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = 'background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;';
    warningDiv.innerHTML = `
        <h3 style="color: #856404; margin-bottom: 10px;">⚠️ داده‌ای یافت نشد</h3>
        <p style="color: #856404; margin-bottom: 15px;">برای نمایش نمودارها و گزارش‌ها، ابتدا باید در صفحه اصلی داده ثبت کنید.</p>
        <a href="index.html" style="display: inline-block; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">برو به صفحه اصلی</a>
    `;
    const main = document.querySelector('.admin-main');
    if (main) {
        main.insertBefore(warningDiv, main.firstChild);
    }
}

// Show error message
function showDataError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;';
    errorDiv.innerHTML = `
        <h3 style="color: #721c24; margin-bottom: 10px;">❌ خطا در بارگذاری داده‌ها</h3>
        <p style="color: #721c24;">${message}</p>
    `;
    const main = document.querySelector('.admin-main');
    if (main) {
        main.insertBefore(errorDiv, main.firstChild);
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

    // Sort by average score from high to low (not by count)
    return result.sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
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
    console.log('Payment counts for chart:', paymentCounts);
    
    if (paymentCounts.length === 0) {
        console.warn('No payment data to display in chart');
        ctx.parentElement.innerHTML = '<div class="no-data"><p>داده‌ای برای نمایش وجود ندارد</p><p style="font-size: 0.9rem; margin-top: 10px; color: #6c757d;">لطفاً در صفحه اصلی انواع پرداخت ثبت کنید.</p></div>';
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

    // Professional gradient colors
    const gradientColors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(240, 147, 251, 0.8)',
        'rgba(245, 87, 108, 0.8)',
        'rgba(79, 172, 254, 0.8)',
        'rgba(0, 242, 254, 0.8)',
        'rgba(67, 233, 123, 0.8)',
        'rgba(56, 249, 215, 0.8)'
    ];
    
    try {
        paymentTypesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: gradientColors.slice(0, data.length),
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 15,
                    titleFont: { size: 15, weight: 'bold' },
                    bodyFont: { size: 14 },
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} مورد (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 2000
            }
        }
    });
    } catch (error) {
        console.error('Error rendering payment types chart:', error);
        ctx.parentElement.innerHTML = '<p class="no-data">خطا در نمایش نمودار: ' + error.message + '</p>';
    }
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
    console.log('Treatment data for chart:', treatmentData);
    
    if (treatmentData.length === 0) {
        console.warn('No treatment data to display in chart');
        ctx.parentElement.innerHTML = '<div class="no-data"><p>داده‌ای برای نمایش وجود ندارد</p><p style="font-size: 0.9rem; margin-top: 10px; color: #6c757d;">لطفاً در صفحه اصلی درمان‌ها را ثبت کنید.</p></div>';
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
                backgroundColor: (ctx) => {
                    const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                    const colorIndex = ctx.dataIndex % colors.length;
                    const baseColor = colors[colorIndex];
                    gradient.addColorStop(0, baseColor);
                    gradient.addColorStop(1, darkenColor(baseColor, 0.3));
                    return gradient;
                },
                borderColor: colors.map(c => darkenColor(c, 0.2)),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
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
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 15,
                    titleFont: { size: 15, weight: 'bold' },
                    bodyFont: { size: 14 },
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y || 0;
                            return `میانگین قیمت: ${value.toLocaleString('fa-IR')} تومان`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000) {
                                return (value / 1000000).toFixed(1) + 'M';
                            } else if (value >= 1000) {
                                return (value / 1000).toFixed(1) + 'K';
                            }
                            return value.toLocaleString('fa-IR');
                        },
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: { size: 12 }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
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
    console.log('Daily registrations data:', dailyData);
    
    if (dailyData.labels.length === 0) {
        console.warn('No daily registration data to display');
        ctx.parentElement.innerHTML = '<div class="no-data"><p>داده‌ای برای نمایش وجود ندارد</p><p style="font-size: 0.9rem; margin-top: 10px; color: #6c757d;">لطفاً در صفحه اصلی اشخاص را ثبت کنید.</p></div>';
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
                borderColor: '#667eea',
                backgroundColor: (ctx) => {
                    const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
                    gradient.addColorStop(1, 'rgba(102, 126, 234, 0.05)');
                    return gradient;
                },
                borderWidth: 4,
                fill: true,
                tension: 0.5,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 3,
                pointHoverBackgroundColor: '#764ba2',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 3
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
                        padding: 20,
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 15,
                    titleFont: { size: 15, weight: 'bold' },
                    bodyFont: { size: 14 },
                    callbacks: {
                        label: function(context) {
                            return `تعداد ثبت‌نام: ${context.parsed.y} نفر`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: { size: 12 }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });
    } catch (error) {
        console.error('Error rendering daily registrations chart:', error);
        ctx.parentElement.innerHTML = '<p class="no-data">خطا در نمایش نمودار: ' + error.message + '</p>';
    }
}

// Calculate advanced metrics
function calculateAdvancedMetrics() {
    const totalPayments = payments.length;
    const totalTreatments = treatments.length;
    
    // Calculate total revenue
    let totalRevenue = 0;
    treatments.forEach(t => {
        totalRevenue += t.price || 0;
    });
    
    return {
        totalPayments,
        totalTreatments,
        totalRevenue
    };
}

// Render summary cards
function renderSummaryCards() {
    const metrics = calculateSummaryMetrics();
    const advanced = calculateAdvancedMetrics();
    
    // Update basic cards
    const totalUsersEl = document.getElementById('totalUsers');
    const avgPaymentScoreEl = document.getElementById('avgPaymentScore');
    const topTreatmentEl = document.getElementById('topTreatment');
    
    if (totalUsersEl) totalUsersEl.textContent = metrics.totalUsers;
    if (avgPaymentScoreEl) avgPaymentScoreEl.textContent = metrics.avgPaymentScore;
    if (topTreatmentEl) topTreatmentEl.textContent = metrics.topTreatment;
    
    // Update new cards
    const totalPaymentsEl = document.getElementById('totalPayments');
    const totalTreatmentsEl = document.getElementById('totalTreatments');
    const totalRevenueEl = document.getElementById('totalRevenue');
    
    if (totalPaymentsEl) totalPaymentsEl.textContent = advanced.totalPayments;
    if (totalTreatmentsEl) totalTreatmentsEl.textContent = advanced.totalTreatments;
    if (totalRevenueEl) {
        totalRevenueEl.textContent = advanced.totalRevenue > 0 
            ? (advanced.totalRevenue / 1000000).toFixed(1) + 'M'
            : '0';
    }
}

// Render advanced statistics
function renderAdvancedStats() {
    const paymentCounts = countPaymentTypes();
    const paymentStatsEl = document.getElementById('paymentStats');
    
    if (paymentStatsEl && paymentCounts.length > 0) {
        const total = paymentCounts.reduce((sum, p) => sum + p.count, 0);
        const topPayment = paymentCounts[0];
        
        paymentStatsEl.innerHTML = `
            <div class="stat-item">
                <div class="stat-item-label">کل پرداخت‌ها</div>
                <div class="stat-item-value">${total}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item-label">محبوب‌ترین</div>
                <div class="stat-item-value">${topPayment.type}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item-label">میانگین امتیاز</div>
                <div class="stat-item-value">${topPayment.avgScore}</div>
            </div>
        `;
    }
    
    const treatmentData = calculateTreatmentProfitability();
    const treatmentStatsEl = document.getElementById('treatmentStats');
    
    if (treatmentStatsEl && treatmentData.length > 0) {
        const totalRevenue = treatmentData.reduce((sum, t) => sum + (t.avgPrice * t.count), 0);
        const topTreatment = treatmentData[0];
        
        treatmentStatsEl.innerHTML = `
            <div class="stat-item">
                <div class="stat-item-label">کل درآمد</div>
                <div class="stat-item-value">${(totalRevenue / 1000000).toFixed(1)}M</div>
            </div>
            <div class="stat-item">
                <div class="stat-item-label">پرسودترین</div>
                <div class="stat-item-value">${topTreatment.name}</div>
            </div>
            <div class="stat-item">
                <div class="stat-item-label">میانگین قیمت</div>
                <div class="stat-item-value">${(topTreatment.avgPrice / 1000000).toFixed(1)}M</div>
            </div>
        `;
    }
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

    const total = paymentCounts.reduce((sum, p) => sum + p.count, 0);
    const scoresByType = {};
    payments.forEach(p => {
        const type = p.type || 'نامشخص';
        if (!scoresByType[type]) {
            scoresByType[type] = [];
        }
        if (p.score > 0) {
            scoresByType[type].push(p.score);
        }
    });
    
    tbody.innerHTML = paymentCounts.map(p => {
        const scores = scoresByType[p.type] || [];
        const max = scores.length > 0 ? Math.max(...scores) : '-';
        const min = scores.length > 0 ? Math.min(...scores) : '-';
        const percentage = total > 0 ? ((p.count / total) * 100).toFixed(1) : '0';
        
        return `
        <tr>
            <td>${p.type}</td>
            <td>${p.count}</td>
            <td>${p.avgScore}</td>
            <td>${max}</td>
            <td>${min}</td>
            <td>${percentage}%</td>
        </tr>
    `;
    }).join('');
    
    // Update table count
    const countEl = document.getElementById('paymentTableCount');
    if (countEl) countEl.textContent = `${paymentCounts.length} مورد`;
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

    const pricesByTreatment = {};
    treatments.forEach(t => {
        const name = t.name || 'نامشخص';
        if (!pricesByTreatment[name]) {
            pricesByTreatment[name] = [];
        }
        if (t.price > 0) {
            pricesByTreatment[name].push(t.price);
        }
    });
    
    tbody.innerHTML = treatmentData.map(t => {
        const prices = pricesByTreatment[t.name] || [];
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const totalRevenue = t.avgPrice * t.count;
        
        return `
        <tr>
            <td>${t.name}</td>
            <td>${profitabilityLabels[t.profitability] || t.profitability}</td>
            <td>${t.avgPrice > 0 ? t.avgPrice.toLocaleString('fa-IR') : '-'}</td>
            <td>${maxPrice > 0 ? maxPrice.toLocaleString('fa-IR') : '-'}</td>
            <td>${minPrice > 0 ? minPrice.toLocaleString('fa-IR') : '-'}</td>
            <td>${t.count}</td>
            <td>${totalRevenue > 0 ? totalRevenue.toLocaleString('fa-IR') : '-'}</td>
        </tr>
    `;
    }).join('');
    
    // Update table count
    const countEl = document.getElementById('treatmentTableCount');
    if (countEl) countEl.textContent = `${treatmentData.length} مورد`;
}

// Render entire dashboard
function renderDashboard() {
    try {
        console.log('🔄 Rendering dashboard...');
        console.log('Current data state:', {
            patients: patients.length,
            payments: payments.length,
            treatments: treatments.length
        });
        
        renderSummaryCards();
        console.log('✅ Summary cards rendered');
        
        renderPaymentTypesChart();
        console.log('✅ Payment types chart rendered');
        
        renderPaymentTypesTable();
        console.log('✅ Payment types table rendered');
        
        renderTreatmentProfitabilityChart();
        console.log('✅ Treatment profitability chart rendered');
        
        renderTreatmentsTable();
        console.log('✅ Treatments table rendered');
        
        renderDailyRegistrationsChart();
        console.log('✅ Daily registrations chart rendered');
        
        renderPaymentScoreChart();
        console.log('✅ Payment score chart rendered');
        
        renderRevenueChart();
        console.log('✅ Revenue chart rendered');
        
        renderAdvancedStats();
        console.log('✅ Advanced stats rendered');
        
        console.log('✅ Dashboard rendered successfully');
    } catch (error) {
        console.error('❌ Error rendering dashboard:', error);
        console.error('Error stack:', error.stack);
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = 'background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px; padding: 20px; margin: 20px; text-align: center;';
        errorMsg.innerHTML = `<h3 style="color: #721c24;">خطا در نمایش داشبورد</h3><p style="color: #721c24;">${error.message}</p>`;
        const main = document.querySelector('.admin-main');
        if (main) {
            main.prepend(errorMsg);
        }
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

// Setup refresh button
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Refreshing data...');
            loadData();
            renderDashboard();
            alert('داده‌ها به‌روزرسانی شدند!');
        });
    }
}

// Setup debug panel
function setupDebugPanel() {
    // Add debug button to header
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = '🔍 دیباگ';
        debugBtn.className = 'btn-debug';
        debugBtn.style.cssText = 'padding: 12px 24px; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; background: #6c757d; color: white;';
        debugBtn.addEventListener('click', showDebugInfo);
        headerActions.insertBefore(debugBtn, headerActions.firstChild);
    }
}

// Show debug information
function showDebugInfo() {
    const panel = document.getElementById('debugPanel');
    const content = document.getElementById('debugContent');
    
    if (!panel || !content) return;
    
    // Get all localStorage data
    const personsData = localStorage.getItem('persons');
    const paymentsData = localStorage.getItem('paymentTypes');
    const treatmentsData = localStorage.getItem('treatments');
    
    const debugInfo = {
        'localStorage Keys': Object.keys(localStorage),
        'Persons (raw)': personsData ? JSON.parse(personsData) : 'null',
        'Payments (raw)': paymentsData ? JSON.parse(paymentsData) : 'null',
        'Treatments (raw)': treatmentsData ? JSON.parse(treatmentsData) : 'null',
        'Processed Patients': patients,
        'Processed Payments': payments,
        'Processed Treatments': treatments,
        'Patients Count': patients.length,
        'Payments Count': payments.length,
        'Treatments Count': treatments.length
    };
    
    content.innerHTML = `
        <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow: auto; max-height: 400px; direction: ltr; text-align: left;">${JSON.stringify(debugInfo, null, 2)}</pre>
        <div style="margin-top: 15px;">
            <button onclick="clearLocalStorage()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">پاک کردن localStorage</button>
            <button onclick="addTestData()" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">اضافه کردن داده تست</button>
        </div>
    `;
    
    panel.style.display = 'block';
}

// Clear localStorage (for testing) - make it global
window.clearLocalStorage = function() {
    if (confirm('آیا مطمئن هستید که می‌خواهید تمام داده‌های localStorage را پاک کنید؟')) {
        localStorage.clear();
        alert('localStorage پاک شد. صفحه را رفرش کنید.');
        location.reload();
    }
};

// Add test data - make it global
window.addTestData = function() {
    const testPersons = [
        { id: 1, firstName: 'علی', lastName: 'احمدی', createdAt: new Date().toLocaleString('fa-IR') },
        { id: 2, firstName: 'مریم', lastName: 'رضایی', createdAt: new Date().toLocaleString('fa-IR') }
    ];
    
    const testPayments = [
        { id: 1, personId: 1, type: 'نقدی', score: 9, description: 'پرداخت نقدی', createdAt: new Date().toLocaleString('fa-IR') },
        { id: 2, personId: 1, type: 'کارت بانکی', score: 8, description: 'پرداخت با کارت', createdAt: new Date().toLocaleString('fa-IR') },
        { id: 3, personId: 2, type: 'بیمه', score: 7, description: 'پرداخت با بیمه', createdAt: new Date().toLocaleString('fa-IR') }
    ];
    
    const testTreatments = [
        { id: 1, personId: 1, name: 'ایمپلنت', profitability: 'very-high', cost: 5000000, description: 'ایمپلنت دندان', createdAt: new Date().toLocaleString('fa-IR') },
        { id: 2, personId: 1, name: 'جرمگیری', profitability: 'medium', cost: 500000, description: 'جرمگیری دندان', createdAt: new Date().toLocaleString('fa-IR') },
        { id: 3, personId: 2, name: 'لمینت', profitability: 'high', cost: 3000000, description: 'لمینت دندان', createdAt: new Date().toLocaleString('fa-IR') }
    ];
    
    localStorage.setItem('persons', JSON.stringify(testPersons));
    localStorage.setItem('paymentTypes', JSON.stringify(testPayments));
    localStorage.setItem('treatments', JSON.stringify(testTreatments));
    
    alert('داده‌های تست اضافه شدند! در حال به‌روزرسانی...');
    loadData();
    renderDashboard();
    const panel = document.getElementById('debugPanel');
    if (panel) panel.style.display = 'none';
};

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

// Generate professional gradient colors
function generateGradientColors(count, baseColor) {
    const gradients = [
        ['#667eea', '#764ba2'],
        ['#f093fb', '#f5576c'],
        ['#4facfe', '#00f2fe'],
        ['#43e97b', '#38f9d7'],
        ['#fa709a', '#fee140'],
        ['#30cfd0', '#330867'],
        ['#a8edea', '#fed6e3'],
        ['#ff9a9e', '#fecfef']
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(gradients[i % gradients.length]);
    }
    return result;
}

// Calculate payment score distribution
function calculatePaymentScoreDistribution() {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    
    payments.forEach(p => {
        const score = Math.round(p.score);
        if (score >= 1 && score <= 10) {
            distribution[score]++;
        }
    });
    
    return {
        labels: Object.keys(distribution).map(k => `${k}⭐`),
        data: Object.values(distribution)
    };
}

// Render payment score distribution chart
function renderPaymentScoreChart() {
    const ctx = document.getElementById('paymentScoreChart');
    if (!ctx) return;
    
    if (typeof Chart === 'undefined') return;
    
    const distData = calculatePaymentScoreDistribution();
    
    if (distData.data.every(v => v === 0)) {
        ctx.parentElement.innerHTML = '<div class="no-data"><p>داده‌ای برای نمایش وجود ندارد</p></div>';
        return;
    }
    
    if (paymentScoreChart) {
        paymentScoreChart.destroy();
    }
    
    try {
        paymentScoreChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: distData.labels,
                datasets: [{
                    label: 'تعداد پرداخت‌ها',
                    data: distData.data,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
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
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 12 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        // Render stats
        const statsEl = document.getElementById('scoreStats');
        if (statsEl) {
            const scores = payments.map(p => p.score).filter(s => s > 0);
            const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
            const max = scores.length > 0 ? Math.max(...scores) : 0;
            const min = scores.length > 0 ? Math.min(...scores) : 0;
            
            statsEl.innerHTML = `
                <div class="stat-item">
                    <div class="stat-item-label">میانگین</div>
                    <div class="stat-item-value">${avg}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item-label">حداکثر</div>
                    <div class="stat-item-value">${max}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item-label">حداقل</div>
                    <div class="stat-item-value">${min}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error rendering payment score chart:', error);
    }
}

// Calculate revenue by treatment
function calculateRevenueByTreatment() {
    const revenueByTreatment = {};
    
    treatments.forEach(t => {
        const name = t.name || 'نامشخص';
        if (!revenueByTreatment[name]) {
            revenueByTreatment[name] = 0;
        }
        revenueByTreatment[name] += t.price || 0;
    });
    
    const sorted = Object.entries(revenueByTreatment)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue);
    
    return {
        labels: sorted.map(t => t.name),
        data: sorted.map(t => t.revenue)
    };
}

// Render revenue chart
function renderRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    if (typeof Chart === 'undefined') return;
    
    const revenueData = calculateRevenueByTreatment();
    
    if (revenueData.data.length === 0 || revenueData.data.every(v => v === 0)) {
        ctx.parentElement.innerHTML = '<div class="no-data"><p>داده‌ای برای نمایش وجود ندارد</p></div>';
        return;
    }
    
    if (revenueChart) {
        revenueChart.destroy();
    }
    
    try {
        revenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: revenueData.labels,
                datasets: [{
                    label: 'درآمد (تومان)',
                    data: revenueData.data,
                    backgroundColor: (ctx) => {
                        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
                        gradient.addColorStop(1, 'rgba(118, 75, 162, 0.8)');
                        return gradient;
                    },
                    borderColor: '#667eea',
                    borderWidth: 2,
                    borderRadius: 8
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
                                return `درآمد: ${value.toLocaleString('fa-IR')} تومان`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) {
                                    return (value / 1000000).toFixed(1) + 'M';
                                } else if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K';
                                }
                                return value.toLocaleString('fa-IR');
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering revenue chart:', error);
    }
}

