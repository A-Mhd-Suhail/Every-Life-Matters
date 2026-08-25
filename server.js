const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const { initializeApp } = require('firebase/app');
const { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    getDoc 
} = require('firebase/firestore');
const { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} = require('firebase/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// ===== FIREBASE CONFIG =====
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
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

console.log("🔥 Every Life Matters - Firebase initialized!");

// ===== AUTH ROUTES =====
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        res.json({ 
            success: true, 
            user: { 
                id: userCredential.user.uid, 
                email: userCredential.user.email 
            } 
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        res.json({ 
            success: true, 
            user: { 
                id: userCredential.user.uid, 
                email: userCredential.user.email 
            } 
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ===== PATIENT ROUTES =====
app.get('/api/patients', async (req, res) => {
    try {
        const patientsCollection = collection(db, 'patients');
        const patientsSnapshot = await getDocs(patientsCollection);
        const patients = [];
        
        patientsSnapshot.forEach((doc) => {
            patients.push({ id: doc.id, ...doc.data() });
        });
        
        res.json({ success: true, patients });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/patients', async (req, res) => {
    const { name, email, phone, age, condition } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email required' });
    }
    
    try {
        const patientsCollection = collection(db, 'patients');
        const docRef = await addDoc(patientsCollection, {
            name,
            email,
            phone,
            age,
            condition,
            bp: '120/80',
            hr: 72,
            createdAt: new Date()
        });
        
        res.json({ 
            success: true, 
            patient: { id: docRef.id, name, email, phone, age, condition } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/patients/:id', async (req, res) => {
    try {
        const docRef = doc(db, 'patients', req.params.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            res.json({ success: true, patient: { id: docSnap.id, ...docSnap.data() } });
        } else {
            res.status(404).json({ error: 'Patient not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== MEDICATION ROUTES =====
app.get('/api/medications', async (req, res) => {
    try {
        const medsCollection = collection(db, 'medications');
        const medsSnapshot = await getDocs(medsCollection);
        const medications = [];
        
        medsSnapshot.forEach((doc) => {
            medications.push({ id: doc.id, ...doc.data() });
        });
        
        res.json({ success: true, medications });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/medications', async (req, res) => {
    const { patient, medicine, dosage, time, days } = req.body;
    
    if (!patient || !medicine || !dosage || !time) {
        return res.status(400).json({ error: 'All fields required' });
    }
    
    try {
        const medsCollection = collection(db, 'medications');
        const docRef = await addDoc(medsCollection, {
            patient,
            medicine,
            dosage,
            time,
            days,
            createdAt: new Date()
        });
        
        res.json({ success: true, medication: { id: docRef.id, patient, medicine, dosage, time, days } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== EMERGENCY ROUTES =====
app.post('/api/emergency', async (req, res) => {
    const { patient, type, details } = req.body;
    
    if (!patient || !type || !details) {
        return res.status(400).json({ error: 'All fields required' });
    }
    
    try {
        const emergenciesCollection = collection(db, 'emergencies');
        const docRef = await addDoc(emergenciesCollection, {
            patient,
            type,
            details,
            status: 'ACTIVE',
            timestamp: new Date()
        });
        
        // Emit WebSocket alert
        io.emit('emergency-alert', {
            message: `🚨 EMERGENCY: ${patient} - ${type}`,
            details: details,
            time: new Date().toLocaleTimeString()
        });
        
        res.json({ success: true, emergency: { id: docRef.id, patient, type, details } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/emergency', async (req, res) => {
    try {
        const emergenciesCollection = collection(db, 'emergencies');
        const emergenciesSnapshot = await getDocs(emergenciesCollection);
        const emergencies = [];
        
        emergenciesSnapshot.forEach((doc) => {
            emergencies.push({ id: doc.id, ...doc.data() });
        });
        
        res.json({ success: true, emergencyAlerts: emergencies });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== NOTIFICATION ROUTES =====
app.get('/api/notifications', async (req, res) => {
    try {
        const notificationsCollection = collection(db, 'notifications');
        const notificationsSnapshot = await getDocs(notificationsCollection);
        const notifications = [];
        
        notificationsSnapshot.forEach((doc) => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        
        res.json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/notifications', async (req, res) => {
    const { message, type } = req.body;
    
    try {
        const notificationsCollection = collection(db, 'notifications');
        const docRef = await addDoc(notificationsCollection, {
            message,
            type,
            timestamp: new Date()
        });
        
        res.json({ success: true, notification: { id: docRef.id, message, type } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== STATS ROUTE =====
app.get('/api/stats', async (req, res) => {
    try {
        const patientsCollection = collection(db, 'patients');
        const emergenciesCollection = collection(db, 'emergencies');
        const medicationsCollection = collection(db, 'medications');
        
        const [patientsSnap, emergenciesSnap, medicationsSnap] = await Promise.all([
            getDocs(patientsCollection),
            getDocs(emergenciesCollection),
            getDocs(medicationsCollection)
        ]);
        
        res.json({ 
            success: true, 
            stats: {
                totalPatients: patientsSnap.size,
                activeEmergencies: emergenciesSnap.size,
                totalMedications: medicationsSnap.size
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== WebSocket Connection =====
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// ===== Seed Initial Data =====
async function seedData() {
    try {
        const patientsCollection = collection(db, 'patients');
        const patientsSnap = await getDocs(patientsCollection);
        
        if (patientsSnap.empty) {
            await addDoc(patientsCollection, {
                name: 'John Doe',
                email: 'john@email.com',
                phone: '9876543210',
                age: 45,
                condition: 'Diabetes',
                bp: '120/80',
                hr: 72
            });
            
            await addDoc(patientsCollection, {
                name: 'Jane Smith',
                email: 'jane@email.com',
                phone: '9876543211',
                age: 38,
                condition: 'Hypertension',
                bp: '140/90',
                hr: 85
            });
            
            console.log("✅ Demo patients added");
        }
    } catch (error) {
        console.error("Error seeding data:", error.message);
    }
}

// ===== Start Server =====
(async () => {
    console.log("🔥 Starting Every Life Matters server...");
    await seedData();
    
    server.listen(PORT, () => {
        console.log(`🏥 Every Life Matters running on http://localhost:${PORT}`);
        console.log("✅ Firebase connected!");
        console.log("📊 Using Firestore database");
    });
})();

// Handle errors
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception:', err);
});