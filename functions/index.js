const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Automatically detect critical heart rate and create emergency
exports.checkVitals = functions.firestore
  .document('patients/{patientId}')
  .onWrite((change) => {
    const after = change.after.data();
    if (!after) return null;

    const hr = parseInt(after.heartRate, 10);
    if (hr > 120 || hr < 50) {
      return admin.firestore().collection('emergencies').add({
        patient: after.name,
        type: 'Abnormal Heart Rate',
        details: `Heart rate ${hr} bpm is outside normal range`,
        status: 'ACTIVE',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return null;
  });

// Send push notification when emergency is created
exports.sendEmergencyNotification = functions.firestore
  .document('emergencies/{emergencyId}')
  .onCreate((snap) => {
    const emergency = snap.data();

    return admin.firestore().collection('device_tokens').get()
      .then(snapshot => {
        const tokens = [];
        snapshot.forEach(doc => tokens.push(doc.data().token));
        if (tokens.length === 0) return null;

        const message = {
          notification: {
            title: '🚨 EMERGENCY ALERT',
            body: `${emergency.type} for patient ${emergency.patient}`,
            sound: 'default'
          },
          tokens: tokens
        };

        return admin.messaging().sendMulticast(message);
      })
      .catch(error => {
        console.error('Notification error:', error);
        return null;
      });
  });
