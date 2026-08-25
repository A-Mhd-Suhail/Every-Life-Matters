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
let db = null;
let auth = null;
let authReady = false;
let authStateInitialized = false;

if (window.firebase) {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
            console.warn('Firebase auth persistence could not be set:', error);
        });
    } catch (error) {
        console.warn('Firebase init failed, using local demo mode:', error);
    }
}

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

function setSession(user) {
    currentUser = user;
    localStorage.setItem('currentUser', user.email || '');
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('olmSession', JSON.stringify(user));
}

function clearSession() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('olmSession');
}

function getDisplayNameFromEmail(email) {
    return (email || '').split('@')[0] || 'User';
}

function normalizeAuthError(error) {
    const code = error?.code || '';
    switch (code) {
        case 'auth/email-already-in-use':
            return '<strong>User already exists.</strong> Please sign in instead.';
        case 'auth/invalid-email':
            return '<strong>Invalid email.</strong> Please enter a valid email address.';
        case 'auth/weak-password':
            return '<strong>Password too short.</strong> Firebase requires at least 6 characters.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/user-disabled':
        case 'auth/invalid-credential':
            return code === 'auth/user-not-found'
                ? '<strong>User does not exist.</strong> Please sign in first.'
                : '<strong>Password is incorrect.</strong> Please try again.';
        case 'auth/popup-closed-by-user':
            return '<strong>Google sign-in closed.</strong> Please try again.';
        case 'auth/cancelled-popup-request':
            return '<strong>Google sign-in already open.</strong> Please finish the current request first.';
        case 'auth/unauthorized-domain':
            return '<strong>Domain not authorized.</strong> Add your GitHub Pages domain in Firebase Auth settings.';
        case 'auth/network-request-failed':
            return '<strong>Network error.</strong> Please try again.';
        default:
            return error?.message || '<strong>Authentication failed.</strong> Please try again.';
    }
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'block';
}

function showLogin() {
    document.getElementById('dashboardPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
}

function setAuthMode(mode) {
    authMode = mode === 'login' ? 'login' : 'signup';
    const modeInput = document.getElementById('authMode');
    const submitBtn = document.getElementById('authSubmitBtn');
    const helpText = document.getElementById('authHelpText');
    const signUpTab = document.getElementById('signUpTab');
    const signInTab = document.getElementById('signInTab');

    if (modeInput) modeInput.value = authMode;
    if (submitBtn) submitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Login';
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

async function ensureAuthReady() {
    if (!auth || authStateInitialized) return;

    authStateInitialized = true;
    auth.onAuthStateChanged(async (user) => {
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
            await loadDashboard();
        } else {
            clearSession();
            showLogin();
        }
        authReady = true;
    });
}

function setAuthBusy(isBusy, label) {
    const submitBtn = document.getElementById('authSubmitBtn');
    const googleBtn = document.querySelector('.google-btn');
    const inputs = ['email', 'password'].map((id) => document.getElementById(id)).filter(Boolean);

    if (submitBtn) {
        submitBtn.disabled = isBusy;
        if (label) submitBtn.textContent = label;
    }
    if (googleBtn) googleBtn.disabled = isBusy;
    inputs.forEach((input) => {
        input.disabled = isBusy;
    });
}

// ===== LOGIN SYSTEM =====
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const mode = document.getElementById('authMode')?.value || authMode;

    // Validation
    if (!email || !password) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }

    setAuthBusy(true, mode === 'signup' ? 'Creating Account...' : 'Signing In...');

    try {
        if (auth) {
            if (mode === 'signup') {
                await auth.createUserWithEmailAndPassword(email, password);
                const user = auth.currentUser;
                if (user && !user.displayName) {
                    await user.updateProfile({ displayName: getDisplayNameFromEmail(email) });
                }
                document.getElementById('loginForm').reset();
                setAuthMode('signup');
                showAlert('Account created successfully. Welcome ' + email, 'success');
            } else {
                await auth.signInWithEmailAndPassword(email, password);
                document.getElementById('loginForm').reset();
                setAuthMode('signup');
                showAlert('Login successful! Welcome ' + email, 'success');
            }
            return;
        }

        const users = getStoredUsers();

        if (mode === 'signup') {
            if (users[email]) {
                showAlert('An account with that email already exists. Please sign in.', 'warning');
                setAuthMode('login');
                return;
            }

            users[email] = { email, password };
            saveStoredUsers(users);
            setSession({ email, displayName: getDisplayNameFromEmail(email) });
            document.getElementById('loginForm').reset();
            setAuthMode('signup');
            showDashboard();
            await loadDashboard();
            showAlert('Account created successfully. Welcome ' + email, 'success');
            return;
        }

        if (!users[email] || users[email].password !== password) {
            showAlert('<strong>Password is incorrect.</strong> Please try again.', 'danger');
            return;
        }

        setSession({ email, displayName: getDisplayNameFromEmail(email) });
        document.getElementById('loginForm').reset();
        setAuthMode('signup');
        showDashboard();
        await loadDashboard();
        showAlert("Login successful! Welcome " + email, 'success');
    } catch (error) {
        showAlert(normalizeAuthError(error), 'danger');
        if (error?.code === 'auth/email-already-in-use') {
            setAuthMode('login');
        }
    } finally {
        setAuthBusy(false, authMode === 'signup' ? 'Create Account' : 'Login');
    }
}

// ===== GOOGLE LOGIN =====
async function handleGoogleLogin() {
    setAuthBusy(true, 'Continuing...');
    try {
        if (auth) {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithRedirect(provider);
            return;
        }

        const email = window.prompt('Enter your Google email to continue:');
        if (!email) return;

        setSession({ email, displayName: getDisplayNameFromEmail(email) });
        document.getElementById('loginForm').reset();
        setAuthMode('signup');
        showDashboard();
        await loadDashboard();
        showAlert("Continued with Google account " + email, 'success');
    } catch (error) {
        console.error('Google login error:', error);
        showAlert(normalizeAuthError(error), 'danger');
    } finally {
        setAuthBusy(false, authMode === 'signup' ? 'Create Account' : 'Login');
    }
}

async function handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
        if (auth && auth.signOut) await auth.signOut();
        clearSession();
        
        // Reset form and UI
        document.getElementById('loginForm').reset();
        setAuthMode('signup');
        
        showLogin();
        
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
        if (!db) {
            document.getElementById('totalPatients').textContent = '0';
            document.getElementById('criticalCases').textContent = '0';
            document.getElementById('appointments').textContent = '0';
            document.getElementById('alerts').textContent = '0';
            return;
        }
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
        if (!db) {
            showAlert('Database is unavailable in this session.', 'warning');
            return;
        }
        await db.collection('patients').add({
            name,
            email,
            phone,
            age: parseInt(age) || 0,
            condition,
            bp: '120/80',
            heartRate: '72',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert("Patient added successfully!", 'success');
        document.getElementById('patientName').value = '';
        document.getElementById('patientEmail').value = '';
        document.getElementById('patientPhone').value = '';
        document.getElementById('patientAge').value = '';
        document.getElementById('patientCondition').value = '';
        
        await loadPatients();
    } catch (error) {
        showAlert("Error adding patient: " + error.message, 'danger');
    }
}

async function loadPatients() {
    const list = document.getElementById('patientsList');
    list.innerHTML = '<p>Loading patients...</p>';
    
    try {
        if (!db) {
            list.innerHTML = '<p>No patients added yet.</p>';
            return;
        }
        const querySnapshot = await db.collection('patients').get();
        list.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const patient = doc.data();
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <h3>${patient.name}</h3>
                <p>Email: ${patient.email}</p>
                <p>Phone: ${patient.phone}</p>
                <p>Age: ${patient.age}</p>
                <p>Condition: ${patient.condition}</p>
                <button onclick="deletePatient('${doc.id}')" class="delete-btn">Delete</button>
            `;
            list.appendChild(div);
        });
    } catch (error) {
        list.innerHTML = '<p>No patients added yet.</p>';
        console.error('Error loading patients:', error);
    }
}

async function deletePatient(patientId) {
    if (confirm("Are you sure you want to delete this patient?")) {
        try {
            if (!db) return;
            await db.collection('patients').doc(patientId).delete();
            showAlert("Patient deleted successfully", 'success');
            await loadPatients();
        } catch (error) {
            showAlert("Error deleting patient: " + error.message, 'danger');
        }
    }
}

async function loadPatientSelect() {
    const select = document.getElementById('patientSelect');
    select.innerHTML = '<option>Choose patient...</option>';
    
    try {
        if (!db) return;
        const querySnapshot = await db.collection('patients').get();
        querySnapshot.forEach((doc) => {
            const patient = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = patient.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading patient select:', error);
    }
}

async function loadPatientDetails() {
    const select = document.getElementById('patientSelect');
    const detailsCard = document.getElementById('patientDetailsCard');
    
    if (select.value === '') {
        detailsCard.classList.add('hidden');
        return;
    }
    
    try {
        if (!db) {
            showAlert('Database unavailable', 'warning');
            return;
        }
        const doc = await db.collection('patients').doc(select.value).get();
        const patient = doc.data();
        
        document.getElementById('detailName').textContent = patient.name;
        document.getElementById('detailEmail').textContent = patient.email;
        document.getElementById('detailPhone').textContent = patient.phone;
        document.getElementById('detailAge').textContent = patient.age;
        document.getElementById('detailCondition').textContent = patient.condition;
        document.getElementById('detailBP').textContent = patient.bp || '120/80';
        document.getElementById('detailHR').textContent = patient.heartRate || '72';
        
        detailsCard.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading patient details:', error);
    }
}

// ===== MEDICATIONS =====
async function addMedication() {
    const patient = document.getElementById('medPatient').value;
    const name = document.getElementById('medName').value;
    const dosage = document.getElementById('medDosage').value;
    const time = document.getElementById('medTime').value;
    const days = document.getElementById('medDays').value;
    
    if (!patient || !name || !dosage || !time || !days) {
        showAlert("Please fill all medication fields", 'danger');
        return;
    }
    
    try {
        if (!db) {
            showAlert('Database is unavailable in this session.', 'warning');
            return;
        }
        await db.collection('medications').add({
            patient,
            name,
            dosage,
            time,
            days: parseInt(days),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert("Medication added successfully!", 'success');
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
    list.innerHTML = '<p>Loading medications...</p>';
    
    try {
        if (!db) {
            list.innerHTML = '<p>No medications yet.</p>';
            return;
        }
        const querySnapshot = await db.collection('medications').get();
        list.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const med = doc.data();
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <h3>${med.name}</h3>
                <p>Patient: ${med.patient}</p>
                <p>Dosage: ${med.dosage}</p>
                <p>Time: ${med.time}</p>
                <p>Duration: ${med.days} days</p>
                <button onclick="deleteMedication('${doc.id}')" class="delete-btn">Delete</button>
            `;
            list.appendChild(div);
        });
    } catch (error) {
        list.innerHTML = '<p>No medications</p>';
        console.error('Error loading medications:', error);
    }
}

async function deleteMedication(medId) {
    if (confirm("Are you sure?")) {
        try {
            if (!db) return;
            await db.collection('medications').doc(medId).delete();
            showAlert("Medication deleted", 'success');
            await loadMedications();
        } catch (error) {
            showAlert("Error: " + error.message, 'danger');
        }
    }
}

// ===== NOTIFICATIONS =====
async function loadNotifications() {
    const list = document.getElementById('notificationsList');
    list.innerHTML = '<p>Loading notifications...</p>';
    
    try {
        if (!db) {
            list.innerHTML = '<p>No notifications yet.</p>';
            return;
        }
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
        if (!db) {
            showAlert('Database is unavailable in this session.', 'warning');
            return;
        }
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
        if (!db) {
            log.innerHTML = '<h3>Emergency Log</h3><p>No emergency alerts yet.</p>';
            return;
        }
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
    
    if (!db) {
        showAlert('Database is unavailable in this session.', 'warning');
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
    alertDiv.innerHTML = message;
    alertDiv.className = `alert ${type} show`;
    alertDiv.style.fontWeight = '700';
    alertDiv.style.letterSpacing = '0.1px';
    alertDiv.style.lineHeight = '1.45';
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
    }, 3000);
}

// ===== INITIALIZATION =====
window.addEventListener('load', async () => {
    // Set up form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    setAuthMode('signup');
    await ensureAuthReady();

    if (auth) {
        try {
            const redirectResult = await auth.getRedirectResult();
            if (redirectResult?.user) {
                const user = redirectResult.user;
                currentUser = {
                    uid: user.uid,
                    email: user.email || '',
                    displayName: user.displayName || getDisplayNameFromEmail(user.email)
                };
                localStorage.setItem('currentUser', currentUser.email);
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('olmSession', JSON.stringify(currentUser));
                showDashboard();
                await loadDashboard();
                showAlert("Continued with Google account " + (currentUser.displayName || currentUser.email), 'success');
                return;
            }
        } catch (error) {
            console.error('Firebase redirect result error:', error);
            showAlert(normalizeAuthError(error), 'danger');
        }
    }

    if (!auth) {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const storedSession = localStorage.getItem('olmSession');

        if (isLoggedIn === 'true' && storedSession) {
            try {
                currentUser = JSON.parse(storedSession);
            } catch {
                currentUser = { email: localStorage.getItem('currentUser') };
            }
            showDashboard();
            await loadDashboard();
            return;
        }
    }

    showLogin();
});
