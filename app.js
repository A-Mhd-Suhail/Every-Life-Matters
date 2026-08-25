// ===== Global State =====
let API_BASE = 'http://localhost:3000/api';
let socket = null;

// Fallback in-memory database (for demo if backend fails)
let database = {
    patients: [],
    medications: [],
    emergencyAlerts: [],
    notifications: [],
    forms: []
};

// ===== Initialize Demo Data (fallback) =====
function initializeDatabase() {
    database.patients = [
        { id: 1, name: "John Doe", email: "john@email.com", phone: "9876543210", age: 45, condition: "Diabetes", bp: "120/80", hr: 72 },
        { id: 2, name: "Jane Smith", email: "jane@email.com", phone: "9876543211", age: 38, condition: "Hypertension", bp: "140/90", hr: 85 }
    ];
    
    database.medications = [
        { id: 1, patient: "John Doe", medicine: "Metformin", dosage: "500mg", time: "08:00", days: 30 },
        { id: 2, patient: "Jane Smith", medicine: "Lisinopril", dosage: "10mg", time: "09:00", days: 60 }
    ];

    database.notifications = [
        { id: 1, type: "info", message: "System online", time: new Date().toLocaleTimeString() },
        { id: 2, type: "warning", message: "Patient John Doe: Blood pressure high", time: new Date().toLocaleTimeString() }
    ];
}

// ===== API Helper Functions =====
async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        if (!response.ok) throw new Error('API request failed');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

// ===== LOGIN SYSTEM =====
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Try backend login first
    const data = await apiRequest('/login', 'POST', { email, password });
    
    if (data && data.success) {
        localStorage.setItem('currentUser', email);
        localStorage.setItem('isLoggedIn', 'true');
        
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'block';
        
        await loadDashboardData();
        showAlert("Login successful! Welcome " + email, 'success');
        connectWebSocket();
        return;
    }
    
    // Fallback to demo mode (only if password is "123456")
    if (password === "123456") {
        localStorage.setItem('currentUser', email);
        localStorage.setItem('isLoggedIn', 'true');
        
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'block';
        
        initializeDatabase();
        loadDashboard();
        updateStats();
        
        showAlert("Login successful (Demo Mode - Firebase not reachable)", 'warning');
        return;
    }
    
    showAlert("Invalid credentials. Try password: 123456", 'danger');
}

function handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('token');
        
        document.getElementById('dashboardPage').style.display = 'none';
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('loginForm').reset();
        
        showAlert("Logged out successfully", 'success');
    }
}

// ===== PAGE NAVIGATION =====
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    
    document.getElementById(pageName).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load page-specific data
    if (pageName === 'dashboard') loadDashboard();
    if (pageName === 'patients') loadPatients();
    if (pageName === 'patientDetails') loadPatientSelect();
    if (pageName === 'medications') loadMedications();
    if (pageName === 'notifications') loadNotifications();
    if (pageName === 'emergency') loadEmergencyLog();
    if (pageName === 'graphs') drawGraphs();
}

// ===== DASHBOARD =====
async function loadDashboard() {
    document.getElementById('dashboard').classList.remove('hidden');
    await updateStats();
    document.getElementById('lastSync').textContent = new Date().toLocaleTimeString();
}

async function updateStats() {
    // Try backend stats
    const stats = await apiRequest('/stats');
    if (stats && stats.success) {
        document.getElementById('totalPatients').textContent = stats.stats.totalPatients;
        document.getElementById('criticalCases').textContent = stats.stats.activeEmergencies;
        document.getElementById('appointments').textContent = Math.floor(Math.random() * 5) + 2; // demo
        document.getElementById('alerts').textContent = stats.stats.totalMedications; // use medication count as alerts
        return;
    }
    
    // Fallback to local
    document.getElementById('totalPatients').textContent = database.patients.length;
    document.getElementById('criticalCases').textContent = database.emergencyAlerts.filter(e => e.status === 'ACTIVE').length;
    document.getElementById('appointments').textContent = Math.floor(Math.random() * 5) + 2;
    document.getElementById('alerts').textContent = database.notifications.length;
}

// ===== PATIENT MANAGEMENT =====
async function addPatient() {
    const name = document.getElementById('patientName').value;
    const email = document.getElementById('patientEmail').value;
    const phone = document.getElementById('patientPhone').value;
    const age = document.getElementById('patientAge').value;
    const condition = document.getElementById('patientCondition').value;
    
    if (!name || !email || !phone) {
        showAlert("Please fill all fields", 'danger');
        return;
    }
    
    // Try backend
    const data = await apiRequest('/patients', 'POST', { name, email, phone, age, condition });
    if (data && data.success) {
        showAlert("Patient added to database!", 'success');
        document.getElementById('patientName').value = '';
        document.getElementById('patientEmail').value = '';
        document.getElementById('patientPhone').value = '';
        document.getElementById('patientAge').value = '';
        document.getElementById('patientCondition').value = '';
        
        await loadPatients();
        await updateStats();
        await loadPatientSelect();
        return;
    }
    
    // Fallback to local
    const patient = {
        id: database.patients.length + 1,
        name, email, phone, age, condition,
        bp: (Math.random() * 60 + 100).toFixed(0) + "/" + (Math.random() * 40 + 60).toFixed(0),
        hr: Math.floor(Math.random() * 40 + 60)
    };
    
    database.patients.push(patient);
    
    document.getElementById('patientName').value = '';
    document.getElementById('patientEmail').value = '';
    document.getElementById('patientPhone').value = '';
    document.getElementById('patientAge').value = '';
    document.getElementById('patientCondition').value = '';
    
    showAlert("Patient added successfully (Demo Mode)!", 'success');
    loadPatients();
    updateStats();
    loadPatientSelect();
}

async function loadPatients() {
    // Try backend
    const data = await apiRequest('/patients');
    const list = document.getElementById('patientsList');
    
    if (data && data.success) {
        list.innerHTML = '';
        data.patients.forEach(patient => {
            const div = document.createElement('div');
            div.className = 'patient-item';
            div.innerHTML = `
                <strong>${patient.name}</strong><br>
                Email: ${patient.email} | Phone: ${patient.phone}<br>
                Condition: ${patient.condition}
            `;
            list.appendChild(div);
        });
        return;
    }
    
    // Fallback
    list.innerHTML = '';
    database.patients.forEach(patient => {
        const div = document.createElement('div');
        div.className = 'patient-item';
        div.innerHTML = `
            <strong>${patient.name}</strong><br>
            Email: ${patient.email} | Phone: ${patient.phone}<br>
            Condition: ${patient.condition}
        `;
        list.appendChild(div);
    });
}

async function loadPatientSelect() {
    const select = document.getElementById('patientSelect');
    
    // Try backend
    const data = await apiRequest('/patients');
    if (data && data.success) {
        select.innerHTML = '<option>Choose patient...</option>';
        data.patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient._id || patient.id;
            option.textContent = patient.name;
            select.appendChild(option);
        });
        return;
    }
    
    // Fallback
    select.innerHTML = '<option>Choose patient...</option>';
    database.patients.forEach(patient => {
        const option = document.createElement('option');
        option.value = patient.id;
        option.textContent = patient.name;
        select.appendChild(option);
    });
}

async function loadPatientDetails() {
    const patientId = document.getElementById('patientSelect').value;
    if (!patientId) return;
    
    // Try backend
    const data = await apiRequest(`/patients/${patientId}`);
    if (data && data.success) {
        const patient = data.patient;
        document.getElementById('detailName').textContent = patient.name;
        document.getElementById('detailEmail').textContent = patient.email;
        document.getElementById('detailPhone').textContent = patient.phone;
        document.getElementById('detailAge').textContent = patient.age;
        document.getElementById('detailCondition').textContent = patient.condition;
        document.getElementById('detailBP').textContent = patient.bp;
        document.getElementById('detailHR').textContent = patient.hr + " bpm";
        document.getElementById('patientDetailsCard').classList.remove('hidden');
        return;
    }
    
    // Fallback
    const patient = database.patients.find(p => p.id == patientId);
    if (patient) {
        document.getElementById('detailName').textContent = patient.name;
        document.getElementById('detailEmail').textContent = patient.email;
        document.getElementById('detailPhone').textContent = patient.phone;
        document.getElementById('detailAge').textContent = patient.age;
        document.getElementById('detailCondition').textContent = patient.condition;
        document.getElementById('detailBP').textContent = patient.bp;
        document.getElementById('detailHR').textContent = patient.hr + " bpm";
        document.getElementById('patientDetailsCard').classList.remove('hidden');
    }
}

// ===== FORMS =====
function submitForm() {
    const name = document.getElementById('formName').value;
    const symptoms = document.getElementById('formSymptoms').value;
    const diagnosis = document.getElementById('formDiagnosis').value;
    const notes = document.getElementById('formNotes').value;
    
    if (!name || !symptoms || !diagnosis) {
        showAlert("Please fill all required fields", 'danger');
        return;
    }
    
    const formData = {
        id: Date.now(),
        patient: name,
        symptoms,
        diagnosis,
        notes,
        timestamp: new Date().toLocaleString()
    };
    
    if (!database.forms) database.forms = [];
    database.forms.push(formData);
    
    document.getElementById('formName').value = '';
    document.getElementById('formSymptoms').value = '';
    document.getElementById('formDiagnosis').value = '';
    document.getElementById('formNotes').value = '';
    
    showAlert("Form submitted successfully!", 'success');
}

// ===== MEDICATIONS =====
async function addMedication() {
    const patient = document.getElementById('medPatient').value;
    const medicine = document.getElementById('medName').value;
    const dosage = document.getElementById('medDosage').value;
    const time = document.getElementById('medTime').value;
    const days = document.getElementById('medDays').value;
    
    if (!patient || !medicine || !dosage || !time) {
        showAlert("Please fill all fields", 'danger');
        return;
    }
    
    // Try backend
    const data = await apiRequest('/medications', 'POST', { patient, medicine, dosage, time, days });
    if (data && data.success) {
        showAlert("Medication schedule added!", 'success');
        document.getElementById('medPatient').value = '';
        document.getElementById('medName').value = '';
        document.getElementById('medDosage').value = '';
        document.getElementById('medTime').value = '';
        document.getElementById('medDays').value = '';
        
        await loadMedications();
        return;
    }
    
    // Fallback
    const medication = {
        id: database.medications.length + 1,
        patient, medicine, dosage, time, days
    };
    database.medications.push(medication);
    
    document.getElementById('medPatient').value = '';
    document.getElementById('medName').value = '';
    document.getElementById('medDosage').value = '';
    document.getElementById('medTime').value = '';
    document.getElementById('medDays').value = '';
    
    showAlert("Medication schedule added (Demo Mode)!", 'success');
    loadMedications();
}

async function loadMedications() {
    const list = document.getElementById('medicationsList');
    
    // Try backend
    const data = await apiRequest('/medications');
    if (data && data.success) {
        list.innerHTML = '<h3>Current Medications</h3>';
        if (data.medications.length === 0) {
            list.innerHTML += '<p>No medications scheduled</p>';
            return;
        }
        data.medications.forEach(med => {
            const div = document.createElement('div');
            div.className = 'patient-item';
            div.innerHTML = `
                <strong>${med.medicine}</strong> - ${med.dosage}<br>
                Patient: ${med.patient} | Time: ${med.time}<br>
                Duration: ${med.days} days
            `;
            list.appendChild(div);
        });
        return;
    }
    
    // Fallback
    list.innerHTML = '<h3>Current Medications</h3>';
    if (database.medications.length === 0) {
        list.innerHTML += '<p>No medications scheduled</p>';
        return;
    }
    database.medications.forEach(med => {
        const div = document.createElement('div');
        div.className = 'patient-item';
        div.innerHTML = `
            <strong>${med.medicine}</strong> - ${med.dosage}<br>
            Patient: ${med.patient} | Time: ${med.time}<br>
            Duration: ${med.days} days
        `;
        list.appendChild(div);
    });
}

// ===== NOTIFICATIONS =====
async function loadNotifications() {
    const list = document.getElementById('notificationsList');
    list.innerHTML = '';
    
    // Try backend
    const data = await apiRequest('/notifications');
    if (data && data.success) {
        data.notifications.forEach(notif => {
            const div = document.createElement('div');
            div.className = `alert ${notif.type} show`;
            div.innerHTML = `<strong>${new Date(notif.timestamp).toLocaleTimeString()}</strong> - ${notif.message}`;
            list.appendChild(div);
        });
        return;
    }
    
    // Fallback
    database.notifications.forEach(notif => {
        const div = document.createElement('div');
        div.className = `alert ${notif.type} show`;
        div.innerHTML = `<strong>${notif.time}</strong> - ${notif.message}`;
        list.appendChild(div);
    });
}

// ===== EMERGENCY ALERTS =====
async function triggerEmergency() {
    const patient = document.getElementById('emergencyPatient').value;
    const type = document.getElementById('emergencyType').value;
    const details = document.getElementById('emergencyDetails').value;
    
    if (!patient || type === "Select emergency type..." || !details) {
        showAlert("Please fill all emergency fields", 'danger');
        return;
    }
    
    // Try backend
    const data = await apiRequest('/emergency', 'POST', { patient, type, details });
    if (data && data.success) {
        document.getElementById('emergencyPatient').value = '';
        document.getElementById('emergencyType').value = '';
        document.getElementById('emergencyDetails').value = '';
        
        showAlert("🚨 EMERGENCY ALERT TRIGGERED AND SENT TO ALL DOCTORS!", 'danger');
        await loadEmergencyLog();
        return;
    }
    
    // Fallback
    const emergency = {
        id: Date.now(),
        patient,
        type,
        details,
        timestamp: new Date().toLocaleString(),
        status: "ACTIVE"
    };
    
    database.emergencyAlerts.push(emergency);
    database.notifications.unshift({
        id: Date.now(),
        type: 'danger',
        message: `🚨 EMERGENCY: ${type} for patient ${patient}`,
        time: new Date().toLocaleTimeString()
    });
    
    document.getElementById('emergencyPatient').value = '';
    document.getElementById('emergencyType').value = '';
    document.getElementById('emergencyDetails').value = '';
    
    showAlert("🚨 EMERGENCY ALERT TRIGGERED (Demo Mode)!", 'danger');
    loadEmergencyLog();
}

async function loadEmergencyLog() {
    const log = document.getElementById('emergencyLog');
    
    // Try backend
    const data = await apiRequest('/emergency');
    if (data && data.success) {
        log.innerHTML = '<h3>Emergency Log</h3>';
        if (data.emergencyAlerts.length === 0) {
            log.innerHTML += '<p>No emergency alerts</p>';
            return;
        }
        data.emergencyAlerts.forEach(alert => {
            const div = document.createElement('div');
            div.className = 'alert danger show';
            div.innerHTML = `
                <strong>${new Date(alert.timestamp).toLocaleString()}</strong><br>
                Type: ${alert.type} | Patient: ${alert.patient}<br>
                Details: ${alert.details}
            `;
            log.appendChild(div);
        });
        return;
    }
    
    // Fallback
    log.innerHTML = '<h3>Emergency Log</h3>';
    if (database.emergencyAlerts.length === 0) {
        log.innerHTML += '<p>No emergency alerts</p>';
        return;
    }
    database.emergencyAlerts.forEach(alert => {
        const div = document.createElement('div');
        div.className = 'alert danger show';
        div.innerHTML = `
            <strong>${alert.timestamp}</strong><br>
            Type: ${alert.type} | Patient: ${alert.patient}<br>
            Details: ${alert.details}
        `;
        log.appendChild(div);
    });
}

// ===== GRAPHS =====
function drawGraphs() {
    drawBPChart();
    drawHRChart();
}

function drawBPChart() {
    const canvas = document.getElementById('bpChart');
    const ctx = canvas.getContext('2d');
    
    const data = [120, 125, 118, 130, 122, 128, 125];
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.strokeStyle = '#999';
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.lineTo(30, height - 30);
    ctx.lineTo(width - 10, height - 30);
    ctx.stroke();
    
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((value, index) => {
        const x = 50 + (index * (width - 80) / (data.length - 1));
        const y = height - 40 - (value - 110) * 1.5;
        
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    ctx.fillStyle = '#667eea';
    data.forEach((value, index) => {
        const x = 50 + (index * (width - 80) / (data.length - 1));
        const y = height - 40 - (value - 110) * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawHRChart() {
    const canvas = document.getElementById('hrChart');
    const ctx = canvas.getContext('2d');
    
    const data = [72, 75, 78, 76, 80, 75, 73];
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.strokeStyle = '#ff6b6b';
    ctx.beginPath();
    
    data.forEach((value, index) => {
        const x = 50 + (index * (width - 80) / (data.length - 1));
        const y = height - 40 - (value - 60) * 2;
        
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    ctx.fillStyle = '#ff6b6b';
    data.forEach((value, index) => {
        const x = 50 + (index * (width - 80) / (data.length - 1));
        const y = height - 40 - (value - 60) * 2;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

// ===== ALERT SYSTEM =====
function showAlert(message, type) {
    const alertDiv = document.getElementById('alert');
    alertDiv.textContent = message;
    alertDiv.className = `alert ${type} show`;
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
    }, 3000);
}

// ===== WEBSOCKET =====
function connectWebSocket() {
    if (socket) return; // already connected
    try {
        socket = io('http://localhost:3000');
        
        socket.on('emergency-alert', (data) => {
            showAlert(data.message, 'danger');
            // Add to notifications
            database.notifications.unshift({
                id: Date.now(),
                type: 'danger',
                message: data.message,
                time: data.time
            });
            loadNotifications();
        });
        
        socket.on('connect', () => {
            console.log('WebSocket connected');
        });
    } catch (error) {
        console.error('WebSocket not available:', error);
    }
}

// ===== INITIALIZATION =====
window.addEventListener('load', async () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'block';
        
        // Try to load from backend
        const patientsData = await apiRequest('/patients');
        if (patientsData && patientsData.success) {
            // Backend connected
            await loadDashboard();
            connectWebSocket();
        } else {
            // Fallback to demo
            initializeDatabase();
            loadDashboard();
            updateStats();
        }
    }
});