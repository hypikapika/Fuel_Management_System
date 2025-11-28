document.addEventListener('DOMContentLoaded', function () {
    // 1. Auth Check
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'fuel_login_page.html';
        return;
    }
    document.getElementById('userDisplay').textContent = currentUser;

    // 2. Navigation Logic
    const navLinks = document.querySelectorAll('.nav-link, .top-nav-link');
    const views = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('pageTitle');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const targetView = link.getAttribute('data-view');

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to all links pointing to this view (sync sidebar and topbar)
            document.querySelectorAll(`[data-view="${targetView}"]`).forEach(l => l.classList.add('active'));

            // Hide all views
            views.forEach(view => view.style.display = 'none');

            // Show target view
            const targetId = 'view-' + targetView;
            document.getElementById(targetId).style.display = 'block';

            // Update Title
            pageTitle.textContent = link.textContent.trim();

            // Refresh data if switching to dashboard or management
            if (targetView === 'dashboard') updateDashboard();
            if (targetView === 'management') updateTable();
        });
    });

    // 3. Date Display
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', dateOptions);

    // 4. Logout
    document.getElementById('logoutBtn').addEventListener('click', function () {
        localStorage.removeItem('currentUser');
        window.location.href = 'fuel_login_page.html';
    });

    // 5. Data Handling (LocalStorage)
    function getInspections() {
        return JSON.parse(localStorage.getItem('inspections')) || [];
    }

    function saveInspection(data) {
        const inspections = getInspections();
        inspections.push(data);
        localStorage.setItem('inspections', JSON.stringify(inspections));
    }

    // 6. Form Handling
    const form = document.getElementById('inspectionForm');
    const modal = document.getElementById('confirmationModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalIcon = document.getElementById('modalIcon');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    function showModal(type, title, message) {
        modal.style.display = 'flex';
        modalTitle.textContent = title;
        modalMessage.textContent = message;

        modalIcon.className = 'modal-icon';
        if (type === 'success') {
            modalIcon.innerHTML = '<i class="fa-solid fa-check-circle" style="color: #27ae60;"></i>';
            modalCloseBtn.className = 'btn btn-approve';
        } else {
            modalIcon.innerHTML = '<i class="fa-solid fa-times-circle" style="color: #c0392b;"></i>';
            modalCloseBtn.className = 'btn btn-reject';
        }
    }

    modalCloseBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (modalTitle.textContent.includes('Approved') || modalTitle.textContent.includes('Rejected')) {
            form.reset();
            // Go to dashboard or management? Let's stay on form but maybe show dashboard
            // For now, just reset
        }
    });

    // Reject Button
    document.getElementById('rejectBtn').addEventListener('click', function () {
        // Capture data even on reject
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.status = 'Rejected';
        data.date = new Date().toISOString();
        data.inspector = currentUser;

        saveInspection(data);
        showModal('error', 'Unit Rejected', 'This unit has been marked as REJECTED.');
    });

    // Approve Button (Form Submit)
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        let allChecked = true;
        checkboxes.forEach(cb => { if (!cb.checked) allChecked = false; });

        if (!allChecked) {
            alert('Warning: Not all safety checks passed.');
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.status = 'Approved';
        data.date = new Date().toISOString();
        data.inspector = currentUser;

        saveInspection(data);
        showModal('success', 'Unit Approved', 'Inspection passed successfully.');
    });

    // Submit & Add New Button
    document.getElementById('submitAddBtn').addEventListener('click', function () {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        let allChecked = true;
        checkboxes.forEach(cb => { if (!cb.checked) allChecked = false; });

        if (!allChecked) {
            alert('Warning: Not all safety checks passed.');
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.status = 'Approved';
        data.date = new Date().toISOString();
        data.inspector = currentUser;

        saveInspection(data);

        // Reset form and show toast/alert
        form.reset();
        alert('Unit Submitted Successfully! Ready for next entry.');
        // Scroll to top
        document.querySelector('.main-content-area').scrollTop = 0;
    });

    // 7. Dashboard Logic (Charts)
    let statusChartInstance = null;
    let dailyChartInstance = null;
    let hourlyChartInstance = null;

    function updateDashboard() {
        const inspections = getInspections();

        // Stats
        const total = inspections.length;
        const approved = inspections.filter(i => i.status === 'Approved').length;
        const rejected = inspections.filter(i => i.status === 'Rejected').length;

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statApproved').textContent = approved;
        document.getElementById('statRejected').textContent = rejected;

        // Charts
        const ctxStatus = document.getElementById('statusChart').getContext('2d');
        const ctxDaily = document.getElementById('dailyChart').getContext('2d');

        // Destroy old charts if exist
        if (statusChartInstance) statusChartInstance.destroy();
        if (dailyChartInstance) dailyChartInstance.destroy();
        if (hourlyChartInstance) hourlyChartInstance.destroy();

        // Status Chart
        statusChartInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Approved', 'Rejected'],
                datasets: [{
                    data: [approved, rejected],
                    backgroundColor: ['#27ae60', '#e74c3c']
                }]
            }
        });

        // Daily Chart (Mock logic for last 7 days)
        // Group by date
        const last7Days = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            last7Days[dateStr] = 0;
        }

        inspections.forEach(i => {
            const dateStr = i.date.split('T')[0];
            if (last7Days[dateStr] !== undefined) {
                last7Days[dateStr]++;
            }
        });

        dailyChartInstance = new Chart(ctxDaily, {
            type: 'bar',
            data: {
                labels: Object.keys(last7Days),
                datasets: [{
                    label: 'Inspections',
                    data: Object.values(last7Days),
                    backgroundColor: '#3498db'
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });


        // Hourly Chart (Last 24 Hours)
        const ctxHourly = document.getElementById('hourlyChart').getContext('2d');
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        // Filter inspections in last 24h
        const recentInspections = inspections.filter(i => new Date(i.date) >= twentyFourHoursAgo);

        // Group by hour
        const hourlyData = {};
        for (let i = 0; i < 24; i++) {
            const d = new Date(now.getTime() - (i * 60 * 60 * 1000));
            const hourLabel = d.getHours() + ':00';
            hourlyData[hourLabel] = 0;
        }

        // Fill data (reverse to show oldest to newest)
        const sortedHours = Object.keys(hourlyData).reverse();
        const chartData = new Array(24).fill(0);

        recentInspections.forEach(i => {
            const d = new Date(i.date);
            const hourLabel = d.getHours() + ':00';
            const index = sortedHours.indexOf(hourLabel);
            if (index !== -1) {
                chartData[index]++;
            }
        });

        hourlyChartInstance = new Chart(ctxHourly, {
            type: 'line',
            data: {
                labels: sortedHours,
                datasets: [{
                    label: 'Units Loaded',
                    data: chartData,
                    borderColor: '#8e44ad',
                    backgroundColor: 'rgba(142, 68, 173, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    // 8. Management Logic (Table & Export)
    function updateTable() {
        const tbody = document.querySelector('#inspectionTable tbody');
        tbody.innerHTML = '';
        const inspections = getInspections().reverse(); // Newest first

        inspections.forEach(i => {
            const row = document.createElement('tr');
            const date = new Date(i.date).toLocaleString();
            row.innerHTML = `
                <td>${date}</td>
                <td>${i.truckId}</td>
                <td>${i.driverName}</td>
                <td>${i.transporter}</td>
                <td>${i.destination || '-'}</td>
                <td>${i.note || '-'}</td>
                <td><span style="color: ${i.status === 'Approved' ? '#27ae60' : '#c0392b'}; font-weight: bold;">${i.status}</span></td>
                <td>${i.inspector}</td>
            `;
            tbody.appendChild(row);
        });
    }

    document.getElementById('exportBtn').addEventListener('click', function () {
        const inspections = getInspections();
        if (inspections.length === 0) {
            alert('No data to export');
            return;
        }

        // Prepare data for Excel
        const data = inspections.map(i => ({
            Date: new Date(i.date).toLocaleString(),
            TruckID: i.truckId,
            TrailerID: i.trailerId,
            Driver: i.driverName,
            Transporter: i.transporter,
            Destination: i.destination,
            Note: i.note,
            Capacity: i.capacity,
            LoadingPoint: i.loadingPoint,
            TimeIn: i.timeIn,
            TimeOut: i.timeOut,
            Status: i.status,
            Inspector: i.inspector,
            SealRemarks: i.sealRemarks,
            TeraRemarks: i.teraRemarks
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inspections");
        XLSX.writeFile(wb, "Inspection_Data.xlsx");
    });

    document.getElementById('clearDataBtn').addEventListener('click', function () {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            localStorage.removeItem('inspections');
            updateTable();
            updateDashboard(); // Update dashboard too if needed
            alert('Data cleared.');
        }
    });

    // Initial Load
    updateDashboard();
});
