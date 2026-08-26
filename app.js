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
let db, auth, messaging;
let currentUser = null;
let unsubscribeListeners = {};

if (window.firebase) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    messaging = firebase.messaging();
}

// ===== UTILITIES =====
function showAlert(message, type = 'success') {
    const alertDiv = document.getElementById('alert');
    if (!alertDiv) return;
    alertDiv.innerHTML = message;
    alertDiv.className = `alert ${type} show`;
    setTimeout(() => alertDiv.classList.remove('show'), 3000);
}

function getDisplayNameFromEmail(email) {
    return (email || '').split('@')[0] || 'User';
}

function normalizeAuthError(error) {
    const code = error?.code || '';
    switch (code) {
        case 'auth/email-already-in-use': return '<strong>User exists.</strong> Please sign in instead.';
        case 'auth/invalid-email': return '<strong>Invalid email.</strong>';
        case 'auth/weak-password': return '<strong>Password too short.</strong> Min 6 characters.';
        case 'auth/user-not-found': return '<strong>User not found.</strong> Please sign up first.';
        case 'auth/wrong-password': return '<strong>Wrong password.</strong>';
        case 'auth/unauthorized-domain': return '<strong>Domain not authorized.</strong> Add your GitHub Pages domain in Firebase.';
        case 'auth/popup-closed-by-user': return '<strong>Google sign-in closed.</strong>';
        default: return error?.message || 'Authentication failed.';
    }
}

// ===== AUTH =====
function setAuthMode(mode) {
    authMode = mode === 'login' ? 'login' : 'signup';
    const submitBtn = document.getElementById('authSubmitBtn');
    const signUpTab = document.getElementById('signUpTab');
    const signInTab = document.getElementById('signInTab');
    if (submitBtn) submitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Login';
    if (signUpTab) signUpTab.style.background = authMode === 'signup' ? '#fff' : 'transparent';
    if (signInTab) signInTab.style.background = authMode === 'login' ? '#fff' : 'transparent';
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const mode = document.getElementById('authMode').value;

    if (!email || !password) {
        showAlert('Please fill all fields', 'danger');
        return;
    }

    try {
        if (mode === 'signup') {
            await auth.createUserWithEmailAndPassword(email, password);
            const user = auth.currentUser;
            if (user && !user.displayName) {
                await user.updateProfile({ displayName: getDisplayNameFromEmail(email) });
            }
            showAlert('Account created successfully!', 'success');
        } else {
            await auth.signInWithEmailAndPassword(email, password);
            showAlert('Login successful!', 'success');
        }
        document.getElementById('loginForm').reset();
        setAuthMode('signup');
    } catch (error) {
        showAlert(normalizeAuthError(error), 'danger');
        if (error.code === 'auth/email-already-in-use') setAuthMode('login');
    }
}

async function handleGoogleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithRedirect(provider);
    } catch (error) {
        showAlert(normalizeAuthError(error), 'danger');
    }
}

async function handleLogout() {
    if (confirm("Logout?")) {
        await auth.signOut();
        clearSession();
        showLogin();
        showAlert("Logged out", 'success');
    }
}

function clearSession() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('olmSession');
}

// ===== NAVIGATION =====
function showLogin() {
    document.getElementById('dashboardPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'block';
}

function showPage(pageName, evt) {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.getElementById(pageName).classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if (evt) evt.target.classList.add('active');

    if (pageName === 'dashboard') updateDashboardStats();
    if (pageName === 'patients') listenToPatients();
    if (pageName === 'medications') listenToMedications();
    if (pageName === 'notifications') listenToNotifications();
    if (pageName === 'emergency') listenToEmergencies();
    if (pageName === 'graphs') drawGraphs();
}

// ===== REAL-TIME LISTENERS =====
function listenToPatients() {
    if (!db || !currentUser) return;
    if (unsubscribeListeners['patients']) unsubscribeListeners['patients']();
    unsubscribeListeners['patients'] = db.collection('patients').onSnapshot(snap => {
        renderPatients(snap);
        updateDashboardStats();
    }, err => console.error('Patient listener error:', err));
}

function listenToMedications() {
    if (!db || !currentUser) return;
    if (unsubscribeListeners['medications']) unsubscribeListeners['medications']();
    unsubscribeListeners['medications'] = db.collection('medications').onSnapshot(snap => {
        renderMedications(snap);
        updateDashboardStats();
    }, err => console.error('Medication listener error:', err));
}

function listenToNotifications() {
    if (!db || !currentUser) return;
    if (unsubscribeListeners['notifications']) unsubscribeListeners['notifications']();
    unsubscribeListeners['notifications'] = db.collection('notifications').orderBy('createdAt', 'desc').limit(50).onSnapshot(snap => {
        renderNotifications(snap);
    }, err => console.error('Notification listener error:', err));
}

function listenToEmergencies() {
    if (!db || !currentUser) return;
    if (unsubscribeListeners['emergencies']) unsubscribeListeners['emergencies']();
    unsubscribeListeners['emergencies'] = db.collection('emergencies').orderBy('timestamp', 'desc').limit(50).onSnapshot(snap => {
        renderEmergencyLog(snap);
        updateDashboardStats();
        checkCriticalAlerts(snap);
    }, err => console.error('Emergency listener error:', err));
}

function startAllListeners() {
    listenToPatients();
    listenToMedications();
    listenToNotifications();
    listenToEmergencies();
}

function stopAllListeners() {
    Object.keys(unsubscribeListeners).forEach(key => {
        if (unsubscribeListeners[key]) unsubscribeListeners[key]();
        delete unsubscribeListeners[key];
    });
}

// ===== RENDER FUNCTIONS =====
function renderPatients(snapshot) {
    const list = document.getElementById('patientsList');
    if (!list) return;
    list.innerHTML = '';
    if (snapshot.empty) {
        list.innerHTML = '<p style="text-align:center; color:#666;">No patients yet.</p>';
        return;
    }
    snapshot.forEach(doc => {
        const p = doc.data();
        const div = document.createElement('div');
        div.className = 'patient-item';
        div.innerHTML = `
            <strong>${p.name}</strong>
            <p>${p.email}</p>
            <p>Phone: ${p.phone}</p>
            <p>Age: ${p.age}</p>
            <p>Condition: ${p.condition || 'Not specified'}</p>
            <button onclick="deletePatient('${doc.id}')" style="background:#ff6b6b; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Delete</button>
        `;
        list.appendChild(div);
    });
    // Update patient select
    const select = document.getElementById('patientSelect');
    if (select) {
        const current = select.value;
        select.innerHTML = '<option value="">Choose patient...</option>';
        snapshot.forEach(doc => {
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = doc.data().name;
            if (doc.id === current) opt.selected = true;
            select.appendChild(opt);
        });
    }
}

function renderMedications(snapshot) {
    const list = document.getElementById('medicationsList');
    if (!list) return;
    list.innerHTML = '';
    if (snapshot.empty) {
        list.innerHTML = '<p style="text-align:center; color:#666;">No medications scheduled.</p>';
        return;
    }
    snapshot.forEach(doc => {
        const m = doc.data();
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <h3>${m.name}</h3>
            <p>Patient: ${m.patient}</p>
            <p>Dosage: ${m.dosage}</p>
            <p>Time: ${m.time}</p>
            <p>Duration: ${m.days} days</p>
            <button onclick="deleteMedication('${doc.id}')" style="background:#ff6b6b; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Delete</button>
        `;
        list.appendChild(div);
    });
}

function renderNotifications(snapshot) {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    list.innerHTML = '';
    if (snapshot.empty) {
        list.innerHTML = '<p style="text-align:center; color:#666;">No notifications.</p>';
        return;
    }
    snapshot.forEach(doc => {
        const n = doc.data();
        const time = n.timestamp ? new Date(n.timestamp.seconds * 1000).toLocaleString() : 'Unknown';
        const div = document.createElement('div');
        div.className = `alert ${n.type || 'info'} show`;
        div.innerHTML = `<strong>${time}</strong><br>${n.message}`;
        list.appendChild(div);
    });
}

function renderEmergencyLog(snapshot) {
    const log = document.getElementById('emergencyLog');
    if (!log) return;
    log.innerHTML = '<h3>Emergency Log</h3>';
    if (snapshot.empty) {
        log.innerHTML += '<p style="text-align:center; color:#666;">No alerts.</p>';
        return;
    }
    snapshot.forEach(doc => {
        const e = doc.data();
        const time = e.timestamp ? new Date(e.timestamp.seconds * 1000).toLocaleString() : 'Unknown';
        const div = document.createElement('div');
        div.className = 'alert danger show';
        div.innerHTML = `<strong>${time}</strong><br>Type: ${e.type} | Patient: ${e.patient}<br>Details: ${e.details}`;
        log.appendChild(div);
    });
}

// ===== DASHBOARD STATS =====
function updateDashboardStats() {
    if (!db || !currentUser) return;
    Promise.all([
        db.collection('patients').get(),
        db.collection('medications').get(),
        db.collection('emergencies').where('status', '==', 'ACTIVE').get(),
        db.collection('notifications').where('read', '==', false).get()
    ]).then(([patients, meds, emer, notif]) => {
        document.getElementById('totalPatients').textContent = patients.size;
        document.getElementById('appointments').textContent = meds.size;
        document.getElementById('criticalCases').textContent = emer.size;
        document.getElementById('alerts').textContent = notif.size;
        document.getElementById('lastSync').textContent = new Date().toLocaleTimeString();
    }).catch(console.error);
}

// ===== CRUD OPERATIONS =====
async function addPatient() {
    const name = document.getElementById('patientName').value.trim();
    const email = document.getElementById('patientEmail').value.trim();
    const phone = document.getElementById('patientPhone').value.trim();
    const age = document.getElementById('patientAge').value;
    const condition = document.getElementById('patientCondition').value.trim();
    if (!name || !email || !phone) {
        showAlert('Please fill all required fields', 'danger');
        return;
    }
    try {
        await db.collection('patients').add({
            name, email, phone,
            age: parseInt(age) || 0,
            condition,
            bp: '120/80',
            heartRate: '72',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.email
        });
        showAlert('Patient added successfully!', 'success');
        document.getElementById('patientName').value = '';
        document.getElementById('patientEmail').value = '';
        document.getElementById('patientPhone').value = '';
        document.getElementById('patientAge').value = '';
        document.getElementById('patientCondition').value = '';
        // Add notification
        await db.collection('notifications').add({
            message: `📋 New patient added: ${name}`,
            type: 'info',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

async function deletePatient(id) {
    if (confirm('Delete this patient?')) {
        try {
            const doc = await db.collection('patients').doc(id).get();
            const name = doc.data().name;
            await db.collection('patients').doc(id).delete();
            showAlert('Patient deleted', 'success');
            await db.collection('notifications').add({
                message: `🗑️ Patient deleted: ${name}`,
                type: 'warning',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            showAlert('Error: ' + error.message, 'danger');
        }
    }
}

async function loadPatientDetails() {
    const select = document.getElementById('patientSelect');
    const card = document.getElementById('patientDetailsCard');
    if (!select.value) { card.classList.add('hidden'); return; }
    try {
        const doc = await db.collection('patients').doc(select.value).get();
        if (doc.exists) {
            const p = doc.data();
            document.getElementById('detailName').textContent = p.name;
            document.getElementById('detailEmail').textContent = p.email;
            document.getElementById('detailPhone').textContent = p.phone;
            document.getElementById('detailAge').textContent = p.age;
            document.getElementById('detailCondition').textContent = p.condition || 'Not specified';
            document.getElementById('detailBP').textContent = p.bp || 'Not recorded';
            document.getElementById('detailHR').textContent = p.heartRate || 'Not recorded';
            card.classList.remove('hidden');
        }
    } catch (error) {
        showAlert('Error loading details', 'danger');
    }
}

async function addMedication() {
    const patient = document.getElementById('medPatient').value.trim();
    const name = document.getElementById('medName').value.trim();
    const dosage = document.getElementById('medDosage').value.trim();
    const time = document.getElementById('medTime').value;
    const days = document.getElementById('medDays').value;
    if (!patient || !name || !dosage || !time || !days) {
        showAlert('Fill all fields', 'danger');
        return;
    }
    try {
        await db.collection('medications').add({
            patient, name, dosage, time,
            days: parseInt(days),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.email
        });
        showAlert('Medication added!', 'success');
        document.getElementById('medPatient').value = '';
        document.getElementById('medName').value = '';
        document.getElementById('medDosage').value = '';
        document.getElementById('medTime').value = '';
        document.getElementById('medDays').value = '';
        await db.collection('notifications').add({
            message: `💊 Medication scheduled: ${name} for ${patient}`,
            type: 'info',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

async function deleteMedication(id) {
    if (confirm('Delete this medication?')) {
        try {
            await db.collection('medications').doc(id).delete();
            showAlert('Medication deleted', 'success');
        } catch (error) {
            showAlert('Error: ' + error.message, 'danger');
        }
    }
}

async function triggerEmergency() {
    const patient = document.getElementById('emergencyPatient').value.trim();
    const type = document.getElementById('emergencyType').value;
    const details = document.getElementById('emergencyDetails').value.trim();
    if (!patient || type === 'Select emergency type...' || !details) {
        showAlert('Fill all fields', 'danger');
        return;
    }
    try {
        await db.collection('emergencies').add({
            patient, type, details,
            status: 'ACTIVE',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.email
        });
        await db.collection('notifications').add({
            message: `🚨 EMERGENCY: ${type} for ${patient} - ${details}`,
            type: 'danger',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAlert('🚨 Emergency triggered!', 'danger');
        document.getElementById('emergencyPatient').value = '';
        document.getElementById('emergencyType').value = '';
        document.getElementById('emergencyDetails').value = '';
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

// ===== FORMS =====
async function submitForm() {
    const name = document.getElementById('formName').value.trim();
    const symptoms = document.getElementById('formSymptoms').value.trim();
    const diagnosis = document.getElementById('formDiagnosis').value.trim();
    const notes = document.getElementById('formNotes').value.trim();
    if (!name || !symptoms || !diagnosis) {
        showAlert('Fill required fields', 'danger');
        return;
    }
    try {
        await db.collection('forms').add({
            patient: name, symptoms, diagnosis, notes,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.email
        });
        showAlert('Form submitted!', 'success');
        document.getElementById('formName').value = '';
        document.getElementById('formSymptoms').value = '';
        document.getElementById('formDiagnosis').value = '';
        document.getElementById('formNotes').value = '';
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

// ===== GRAPHS =====
async function drawGraphs() {
    if (!db || !currentUser) return;
    try {
        const snap = await db.collection('patients').get();
        const patients = [];
        snap.forEach(doc => patients.push(doc.data()));

        const bpData = patients.map(p => parseInt(p.bp?.split('/')[0]) || 120);
        const hrData = patients.map(p => parseInt(p.heartRate) || 72);

        if (bpData.length === 0) bpData.push(120, 125, 118);
        if (hrData.length === 0) hrData.push(72, 75, 78);

        drawBPChart(bpData);
        drawHRChart(hrData);
    } catch (error) {
        console.error(error);
        drawBPChart([120, 125, 118]);
        drawHRChart([72, 75, 78]);
    }
}

function drawBPChart(data) {
    const canvas = document.getElementById('bpChart');
    const ctx = canvas.getContext('2d');
    const width = canvas.width, height = canvas.height;
    ctx.clearRect(0,0,width,height);
    ctx.strokeStyle = '#999';
    ctx.beginPath(); ctx.moveTo(30,10); ctx.lineTo(30,height-30); ctx.lineTo(width-10,height-30); ctx.stroke();
    ctx.strokeStyle = '#667eea'; ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((value, index) => {
        const x = 50 + index * (width-80)/(data.length-1);
        const y = height - 40 - (value - 100) * 1.5;
        if (index === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
    ctx.fillStyle = '#667eea';
    data.forEach((value, index) => {
        const x = 50 + index * (width-80)/(data.length-1);
        const y = height - 40 - (value - 100) * 1.5;
        ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    });
}

function drawHRChart(data) {
    const canvas = document.getElementById('hrChart');
    const ctx = canvas.getContext('2d');
    const width = canvas.width, height = canvas.height;
    ctx.clearRect(0,0,width,height);
    ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((value, index) => {
        const x = 50 + index * (width-80)/(data.length-1);
        const y = height - 40 - (value - 60) * 2;
        if (index === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    data.forEach((value, index) => {
        const x = 50 + index * (width-80)/(data.length-1);
        const y = height - 40 - (value - 60) * 2;
        ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    });
}

// ===== CRITICAL ALERTS & NOTIFICATIONS =====
function checkCriticalAlerts(snapshot) {
    snapshot.forEach(doc => {
        const e = doc.data();
        if (e.status === 'ACTIVE') {
            if (Notification.permission === 'granted') {
                new Notification('🚨 EMERGENCY', { body: `${e.type} for ${e.patient}` });
            }
            playAlertSound();
        }
    });
}

function playAlertSound() {
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
    audio.play().catch(() => {});
}

// ===== FCM TOKEN (for push notifications) =====
async function setupFCM() {
    if (!messaging) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await messaging.getToken({ vapidKey: 'BP5Me10dGfDqScN9RGG-AOC69s9fN7sRDFeaXi26qxCQH1dRgw65NL3GXDids-qM_to6684poMbh0xZBR26FOAI' });
            if (token) {
                // Save token to Firestore
                await db.collection('device_tokens').doc(currentUser.uid).set({
                    token,
                    email: currentUser.email,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('FCM token saved:', token);
            }
        }
    } catch (error) {
        console.error('FCM setup error:', error);
    }
}

// ===== AUTH STATE =====
function listenToAuth() {
    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUser = {
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || getDisplayNameFromEmail(user.email)
            };
            localStorage.setItem('currentUser', currentUser.email);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('olmSession', JSON.stringify(currentUser));
            showDashboard();
            startAllListeners();
            await setupFCM(); // setup push tokens
        } else {
            currentUser = null;
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('olmSession');
            stopAllListeners();
            showLogin();
        }
    });
}

// ===== INIT =====
window.addEventListener('load', async () => {
    setAuthMode('signup');
    if (!window.firebase || !db || !auth) {
        showAlert('Firebase failed to load. Check configuration.', 'danger');
        return;
    }
    listenToAuth();
});
