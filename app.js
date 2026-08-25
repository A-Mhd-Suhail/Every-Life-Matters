// ===== Firebase Configuration =====
const firebaseConfig = {
    apiKey: "AIzaSyBXdkeWIoIlMEa5DWIrE4yHuI_jHTeM1mo",
    authDomain: "every-life-matters-8aca8.firebaseapp.com",
    projectId: "every-life-matters-8aca8",
    storageBucket: "every-life-matters-8aca8.firebasestorage.app",
    messagingSenderId: "471031101690",
    appId: "1:471031101690:web:56f82fae6aa0287e787143",
    measurementId: "G-4K1CNF2MZ7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ===== Global State =====
let currentUser = null;
let authMode = 'signup';

function getStoredUsers() {
    try {
        return JSON.parse(localStorage.getItem('olmUsers') || '{}');
    } catch {
        return {};
    }
}

function saveStoredUsers(users) {
    localStorage.setItem('olmUsers', JSON.stringify(users));
}

function setAuthMode(mode) {
    authMode = mode === 'login' ? 'login' : 'signup';
    const modeInput = document.getElementById('authMode');
    const submitBtn = document.getElementById('authSubmitBtn');
    const helpText = document.getElementById('authHelpText');
    const signUpTab = document.getElementById('signUpTab');
    const signInTab = document.getElementById('signInTab');

    if (modeInput) modeInput.value = authMode;
    if (submitBtn) submitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
    if (helpText) {
        helpText.textContent = authMode === 'signup'
            ? 'Create an account first, then sign in anytime with the same email and password.'
            : 'Use your existing account details to sign in.';
    }
    if (signUpTab && signInTab) {
        signUpTab.classList.toggle('active', authMode === 'signup');
        signInTab.classList.toggle('active', authMode === 'login');
    }
}

// ===== LOGIN SYSTEM =====
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const mode = document.getElementById('authMode')?.value || authMode;

    const users = getStoredUsers();

    if (mode === 'signup') {
        if (users[email]) {
            showAlert('An account with that email already exists. Please sign in.', 'warning');
            setAuthMode('login');
            return;
        }

        users[email] = { email, password };
        saveStoredUsers(users);

        currentUser = { email, displayName: email.split('@')[0] };
        localStorage.setItem('currentUser', email);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('olmSession', JSON.stringify(currentUser));

        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'block';
        await loadDashboard();
        showAlert('Account created successfully. Welcome ' + email, 'success');
        return;
    }

    if (!users[email] || users[email].password !== password) {
        showAlert('Invalid email or password. Please sign up first or check your credentials.', 'danger');
        return;
    }

    currentUser = { email, displayName: email.split('@')[0] };
    localStorage.setItem('currentUser', email);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('olmSession', JSON.stringify(currentUser));

    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'block';

    await loadDashboard();
    showAlert("Login successful! Welcome " + email, 'success');
}

// ===== GOOGLE LOGIN =====
async function handleGoogleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        currentUser = user;

        localStorage.setItem('currentUser', user.email);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('olmSession', JSON.stringify({
            email: user.email,
            displayName: user.displayName || user.email
        }));

        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'block';

        await loadDashboard();
        showAlert("Login successful! Welcome " + (user.displayName || user.email), 'success');
    } catch (error) {
        console.error('Google login error:', error);

        const email = window.prompt('Google sign-in is not available right now. Enter your Google email to continue:');
        if (!email) return;

        currentUser = { email, displayName: email.split('@')[0] };
        localStorage.setItem('currentUser', email);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('olmSession', JSON.stringify(currentUser));

        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'block';
        await loadDashboard();
        showAlert("Continued with Google account " + email, 'success');
    }
}

function handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
        auth.signOut();
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('olmSession');
        
        document.getElementById('dashboardPage').style.display = 'none';
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('loginForm').reset();
        setAuthMode('signup');
        
        showAlert("Logged out successfully", 'success');
    }
}

// ===== PAGE NAVIGATION =====
function showPage(pageName, evt) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    
    document.getElementById(pageName).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (evt && evt.target) evt.target.classList.add('active');
    
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
    try {
        const patientsSnap = await db.collection('patients').get();
        const emergenciesSnap = await db.collection('emergencies').get();
        const medicationsSnap = await db.collection('medications').get();
        
        document.getElementById('totalPatients').textContent = patientsSnap.size;
        document.getElementById('criticalCases').textContent = emergenciesSnap.size;
        document.getElementById('appointments').textContent = Math.floor(Math.random() * 5) + 2;
        document.getElementById('alerts').textContent = medicationsSnap.size;
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('totalPatients').textContent = '0';
        document.getElementById('criticalCases').textContent = '0';
        document.getElementById('appointments').textContent = '0';
        document.getElementById('alerts').textContent = '0';
    }
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
    
    try {
        await db.collection('patients').add({
            name,
            email,
            phone,
            age,
            condition,
            bp: '120/80',
            hr: 72,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert("Patient added successfully!", 'success');
        
        document.getElementById('patientName').value = '';
        document.getElementById('patientEmail').value = '';
        document.getElementById('patientPhone').value = '';
        document.getElementById('patientAge').value = '';
        document.getElementById('patientCondition').value = '';
        
        await loadPatients();
        await updateStats();
        await loadPatientSelect();
    } catch (error) {
        showAlert("Error adding patient: " + error.message, 'danger');
    }
}

async function loadPatients() {
    const list = document.getElementById('patientsList');
    list.innerHTML = '<p>Loading patients...</p>';
    
    try {
        const querySnapshot = await db.collection('patients').get();
        list.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const patient = doc.data();
            const div = document.createElement('div');
            div.className = 'patient-item';
            div.innerHTML = `
                <strong>${patient.name}</strong><br>
                Email: ${patient.email} | Phone: ${patient.phone}<br>
                Condition: ${patient.condition}
            `;
            list.appendChild(div);
        });
    } catch (error) {
        list.innerHTML = '<p>Error loading patients. Make sure Firestore is set up.</p>';
        console.error('Error loading patients:', error);
    }
}

async function loadPatientSelect() {
    const select = document.getElementById('patientSelect');
    select.innerHTML = '<option>Choose patient...</option>';
    
    try {
        const querySnapshot = await db.collection('patients').get();
        
        querySnapshot.forEach((doc) => {
            const patient = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = patient.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading patients for select:', error);
    }
}

async function loadPatientDetails() {
    const patientId = document.getElementById('patientSelect').value;
    if (!patientId) return;
    
    try {
        const docRef = db.collection('patients').doc(patientId);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const patient = doc.data();
            document.getElementById('detailName').textContent = patient.name;
            document.getElementById('detailEmail').textContent = patient.email;
            document.getElementById('detailPhone').textContent = patient.phone;
            document.getElementById('detailAge').textContent = patient.age;
            document.getElementById('detailCondition').textContent = patient.condition;
            document.getElementById('detailBP').textContent = patient.bp;
            document.getElementById('detailHR').textContent = patient.hr + " bpm";
            
            document.getElementById('patientDetailsCard').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading patient details:', error);
    }
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
    
    try {
        await db.collection('medications').add({
            patient,
            medicine,
            dosage,
            time,
            days,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert("Medication schedule added!", 'success');
        
        document.getElementById('medPatient').value = '';
        document.getElementById('medName').value = '';
        document.getElementById('medDosage').value = '';
        document.getElementById('medTime').value = '';
        document.getElementById('medDays').value = '';
        
        await loadMedications();
    } catch (error) {
        showAlert("Error adding medication: " + error.message, 'danger');
    }
}

async function loadMedications() {
    const list = document.getElementById('medicationsList');
    list.innerHTML = '<h3>Current Medications</h3><p>Loading...</p>';
    
    try {
        const querySnapshot = await db.collection('medications').get();
        list.innerHTML = '<h3>Current Medications</h3>';
        
        querySnapshot.forEach((doc) => {
            const med = doc.data();
            const div = document.createElement('div');
            div.className = 'patient-item';
            div.innerHTML = `
                <strong>${med.medicine}</strong> - ${med.dosage}<br>
                Patient: ${med.patient} | Time: ${med.time}<br>
                Duration: ${med.days} days
            `;
            list.appendChild(div);
        });
    } catch (error) {
        list.innerHTML = '<h3>Current Medications</h3><p>No medications found</p>';
        console.error('Error loading medications:', error);
    }
}

// ===== NOTIFICATIONS =====
async function loadNotifications() {
    const list = document.getElementById('notificationsList');
    list.innerHTML = '<p>Loading notifications...</p>';
    
    try {
        const querySnapshot = await db.collection('notifications').orderBy('createdAt', 'desc').get();
        list.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const notif = doc.data();
            const div = document.createElement('div');
            div.className = `alert ${notif.type || 'info'} show`;
            div.innerHTML = `<strong>${notif.timestamp ? new Date(notif.timestamp.seconds * 1000).toLocaleTimeString() : ''}</strong> - ${notif.message}`;
            list.appendChild(div);
        });
    } catch (error) {
        list.innerHTML = '<p>No notifications</p>';
        console.error('Error loading notifications:', error);
    }
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
    
    try {
        await db.collection('emergencies').add({
            patient,
            type,
            details,
            status: 'ACTIVE',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Add notification
        await db.collection('notifications').add({
            message: `🚨 EMERGENCY: ${type} for patient ${patient}`,
            type: 'danger',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('emergencyPatient').value = '';
        document.getElementById('emergencyType').value = '';
        document.getElementById('emergencyDetails').value = '';
        
        showAlert("🚨 EMERGENCY ALERT TRIGGERED!", 'danger');
        await loadEmergencyLog();
    } catch (error) {
        showAlert("Error triggering emergency: " + error.message, 'danger');
    }
}

async function loadEmergencyLog() {
    const log = document.getElementById('emergencyLog');
    log.innerHTML = '<h3>Emergency Log</h3><p>Loading...</p>';
    
    try {
        const querySnapshot = await db.collection('emergencies').orderBy('timestamp', 'desc').get();
        log.innerHTML = '<h3>Emergency Log</h3>';
        
        querySnapshot.forEach((doc) => {
            const alert = doc.data();
            const div = document.createElement('div');
            div.className = 'alert danger show';
            div.innerHTML = `
                <strong>${alert.timestamp ? new Date(alert.timestamp.seconds * 1000).toLocaleString() : ''}</strong><br>
                Type: ${alert.type} | Patient: ${alert.patient}<br>
                Details: ${alert.details}
            `;
            log.appendChild(div);
        });
    } catch (error) {
        log.innerHTML = '<h3>Emergency Log</h3><p>No emergency alerts</p>';
        console.error('Error loading emergencies:', error);
    }
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
    
    db.collection('forms').add({
        patient: name,
        symptoms,
        diagnosis,
        notes,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showAlert("Form submitted successfully!", 'success');
        
        document.getElementById('formName').value = '';
        document.getElementById('formSymptoms').value = '';
        document.getElementById('formDiagnosis').value = '';
        document.getElementById('formNotes').value = '';
    }).catch((error) => {
        showAlert("Error submitting form: " + error.message, 'danger');
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

// ===== INITIALIZATION =====
window.addEventListener('load', async () => {
    setAuthMode('signup');

    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const storedSession = localStorage.getItem('olmSession');

    if (isLoggedIn === 'true' && storedSession) {
        try {
            currentUser = JSON.parse(storedSession);
        } catch {
            currentUser = { email: localStorage.getItem('currentUser') };
        }
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'block';
        await loadDashboard();
        return;
    }

    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboardPage').style.display = 'none';
});
