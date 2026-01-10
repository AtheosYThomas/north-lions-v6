
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const getMessageLogs = functions.https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
    }

    const db = admin.firestore();
    const callerDoc = await db.collection('members').doc(context.auth.uid).get();
    const callerRole = callerDoc.data()?.system?.role;

    if (callerRole !== 'admin') {
         throw new functions.https.HttpsError('permission-denied', 'Only admins can view message logs.');
    }

    try {
        const snapshot = await db.collection('message_logs')
            .orderBy('timestamp', 'desc')
            .limit(100) // Limit to last 100 for performance
            .get();
        
        const logs = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            // Serialize timestamp if needed, or let client handle { _seconds, ... }
        }));
        return { logs };
    } catch (error) {
        throw new functions.https.HttpsError('internal', 'Unable to fetch message logs.', error);
    }
});
