
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const initDatabase = functions.https.onRequest(async (req, res) => {
  try {
    // 1. Initialize Categories (System, Meeting, etc.)
    // This is just a placeholder example. In V6, categories are mostly Enum fields.
    // But we might want to create a 'system_settings' doc.
    
    await db.collection('system_settings').doc('config').set({
      maintenanceMode: false,
      initializedAt: admin.firestore.FieldValue.serverTimestamp(),
      version: '6.0.0'
    }, { merge: true });

    // 2. Ensure Collections exist (Firestore creates them implicitly, but we can create a placeholder doc and delete it)
    // Actually, not needed in Firestore.

    res.status(200).send({ message: 'Database initialized successfully.' });
  } catch (error) {
    console.error('Init DB Error:', error);
    res.status(500).send({ error: 'Initialization failed.' });
  }
});
