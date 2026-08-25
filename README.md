# 🏥 One Life Matters - Healthcare Management Platform

A simple, hackathon-ready web application for managing patient health data, emergencies, and medical records.

## 📋 Project Structure

```
├── index.html          # Frontend UI (Login, Dashboard, All Pages)
├── app.js              # Frontend Logic (Client-side)
├── server.js           # Backend API (Node.js + Express)
├── package.json        # Dependencies
└── README.md           # This file
```

## 🚀 Quick Start

### Frontend Only (No Backend)
1. Open `index.html` in browser
2. Login with any email and password: `123456`
3. All features work with in-memory storage

### With Backend Server

```bash
# 1. Install dependencies
npm install express cors body-parser

# 2. Start backend server
node server.js

# 3. Open http://localhost:3000 in browser
```

## 🎯 Features Implemented

### Frontend
- ✅ **Login Page** - Authentication UI
- ✅ **Dashboard** - Overview with stats
- ✅ **Patient Management** - Add & view patients
- ✅ **Patient Details** - View patient health info
- ✅ **Medical Forms** - Submit patient assessments
- ✅ **Medication Schedule** - Track medicines
- ✅ **Notifications** - System alerts
- ✅ **Emergency Alerts** - Critical incident reporting
- ✅ **Health Graphs** - Blood pressure & heart rate charts

### Backend
- ✅ **Authentication** - Login API
- ✅ **Patient CRUD** - Create, read patient data
- ✅ **Vital Signs** - Record BP, HR, temperature
- ✅ **Medications** - Manage medication schedules
- ✅ **Emergency System** - Alert triggering
- ✅ **Appointments** - Schedule doctor visits
- ✅ **Health Records** - Complete patient history
- ✅ **Statistics** - Dashboard metrics

## 💻 Usage Examples

### Login
```
Email: doctor@hospital.com
Password: 123456
```

### Add Patient
1. Go to "Patients" section
2. Fill patient details (Name, Email, Phone, Age, Condition)
3. Click "Add Patient"

### Emergency Alert
1. Go to "Emergency Alerts"
2. Select patient and emergency type
3. Click 🚨 EMERGENCY ALERT button
4. Alert sent to all doctors

### View Medication Schedule
1. Go to "Medications"
2. Add medicine with dosage and time
3. System tracks when medicines are due

## 🔌 API Endpoints

```
POST   /api/login              - User authentication
GET    /api/patients           - List all patients
POST   /api/patients           - Add new patient
GET    /api/patients/:id       - Get patient details
GET    /api/medications        - List medications
POST   /api/medications        - Add medication
POST   /api/emergency          - Trigger emergency alert
GET    /api/emergency          - Get emergency log
GET    /api/appointments       - List appointments
POST   /api/appointments       - Schedule appointment
POST   /api/vitals             - Record vital signs
GET    /api/stats              - Get dashboard stats
```

## 📊 Data Structure

### Patient Object
```javascript
{
  id: 1,
  name: "John Doe",
  email: "john@email.com",
  phone: "9876543210",
  age: 45,
  condition: "Diabetes",
  bp: "120/80",
  hr: 72
}
```

### Medication Object
```javascript
{
  id: 1,
  patient: "John Doe",
  medicine: "Metformin",
  dosage: "500mg",
  time: "08:00",
  days: 30
}
```

### Emergency Alert Object
```javascript
{
  id: 1,
  patient: "John Doe",
  type: "Cardiac Arrest",
  details: "Patient collapsed in ward 3",
  timestamp: "2024-01-15 10:30:45",
  status: "ACTIVE"
}
```

## 🎨 Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** In-memory (can swap for MongoDB/MySQL)
- **Authentication:** Simple JWT-like mechanism

## 🔐 Security Notes

⚠️ This is a hackathon project for learning. For production:
- Use bcrypt for password hashing
- Implement proper JWT tokens
- Add database encryption
- Use HTTPS only
- Implement role-based access control (RBAC)

## 📱 Features by Page

### Dashboard
- Total patients count
- Critical cases overview
- Today's appointments
- Pending alerts

### Patients
- Add new patients
- View all patients
- Quick patient search

### Patient Details
- Select patient
- View vital signs (BP, HR)
- Complete medical history

### Medications
- Add medicine schedules
- Track dosage and timing
- Set duration of treatment

### Notifications
- System messages
- Patient alerts
- Status updates

### Emergency Alerts
- Trigger critical alerts
- Select emergency type
- Alert all doctors immediately

### Graphs
- Blood pressure trends
- Heart rate monitoring
- Visual health tracking

## 🛠️ Customization

### Add New Patient Field
Edit `addPatient()` in `app.js`:
```javascript
const newField = document.getElementById('newField').value;
patient.newField = newField; // Add this line
```

### Change Color Scheme
Edit CSS variables in `index.html`:
```css
/* Change #667eea to your color */
```

### Add Database
Replace in-memory storage with MongoDB/MySQL:
```javascript
// server.js - Import database library
const mongoose = require('mongoose');
```

## 📝 Example Use Cases

1. **Doctor Dashboard** - See all patients and critical cases
2. **Nurse Alert** - Receive medication reminders
3. **Emergency Response** - Trigger alerts for critical patients
4. **Patient Monitoring** - Track vital signs over time
5. **Appointment Scheduling** - Manage doctor visits

## 🐛 Known Limitations

- Data resets on browser refresh (frontend only)
- No user authentication (demo: any password works)
- Limited to in-memory storage
- Basic charts (canvas-based, not library)

## 🚀 Future Enhancements

- [ ] Real database integration (MongoDB)
- [ ] SMS/Email alert system
- [ ] Real-time patient monitoring
- [ ] Role-based access control
- [ ] Appointment reminders
- [ ] Prescription generation
- [ ] Medical history export
- [ ] Mobile app

## 👨‍💻 Code Explanation

### Login Flow
1. User enters email & password
2. `handleLogin()` validates credentials
3. Store session in localStorage
4. Show dashboard, hide login page

### Adding Patient
1. User fills form
2. `addPatient()` collects data
3. Create patient object
4. Push to `database.patients` array
5. Refresh UI with `loadPatients()`

### Emergency Alert
1. User triggers alert
2. `triggerEmergency()` creates alert object
3. Add to `emergencyAlerts` array
4. Create notification
5. Display alert to all users

## 📞 Support

For hackathon:
- Code is intentionally simple for easy explanation
- Each function does one thing
- Comments explain the logic
- No complex libraries - pure vanilla JS

---

**Made for Hackathon** 🎯  
Simple. Clean. Explainable. ✨
