
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Registration, Event } from 'shared/types';

// Ensure Firebase Admin is initialized (if not already)
if (!admin.apps.length) {
  admin.initializeApp();
}

export const registerEvent = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const { eventId, details, needs } = data;
  const userId = context.auth.uid;

  if (!eventId) {
    throw new functions.https.HttpsError('invalid-argument', 'Event ID is required.');
  }

  const db = admin.firestore();

  try {
    return await db.runTransaction(async (transaction) => {
      // 1. Get Event Data
      const eventRef = db.collection('events').doc(eventId);
      const eventDoc = await transaction.get(eventRef);

      if (!eventDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Event not found.');
      }

      const event = eventDoc.data() as Event;

      // 2. Check Logic: Deadline
      const deadline = event.time.deadline instanceof admin.firestore.Timestamp 
        ? event.time.deadline.toDate() 
        : new Date(event.time.deadline as any);
        
      if (new Date() > deadline) {
        throw new functions.https.HttpsError('failed-precondition', 'Registration deadline has passed.');
      }

      // 3. Check Logic: Quota
      // Note: This assumes 'registeredCount' is maintained accurately.
      // Better approach: Count actual registrations in transaction or trust the counter.
      if (event.details.quota > 0 && event.stats.registeredCount >= event.details.quota) {
         throw new functions.https.HttpsError('resource-exhausted', 'Event is full.');
      }

      // 4. Check Duplicate Registration
      const regRef = db.collection('registrations')
        .where('info.eventId', '==', eventId)
        .where('info.memberId', '==', userId);
      const regSnapshot = await transaction.get(regRef);
      
      if (!regSnapshot.empty) {
         // Check if cancelled, maybe allow re-register? For now, block.
         const existing = regSnapshot.docs[0].data() as Registration;
         if (existing.status.status !== 'cancelled') {
            throw new functions.https.HttpsError('already-exists', 'Already registered.');
         }
      }

      // 5. Create Registration
      const newRegistration: Registration = {
        info: {
          memberId: userId,
          eventId: eventId,
          timestamp: admin.firestore.FieldValue.serverTimestamp() as any
        },
        details: {
          adultCount: details?.adultCount || 1,
          childCount: details?.childCount || 0,
          familyNames: details?.familyNames || []
        },
        needs: {
          shuttle: needs?.shuttle || false,
          accommodation: needs?.accommodation || false,
          remark: needs?.remark || ''
        },
        status: {
          status: 'registered',
          paymentStatus: event.details.isPaidEvent ? 'unpaid' : 'paid' // Simplified logic
        },
        notification: { isSent: false }
      };

      const newRegRef = db.collection('registrations').doc();
      transaction.set(newRegRef, newRegistration);

      // 6. Update Event Stats
      transaction.update(eventRef, {
        'stats.registeredCount': admin.firestore.FieldValue.increment(1)
      });

      return { registrationId: newRegRef.id };
    });

  } catch (error) {
    console.error('Registration Error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Registration failed.', error);
  }
});

export const cancelRegistration = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
     throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const { registrationId } = data;
  const userId = context.auth.uid;

  const db = admin.firestore();

  try {
    return await db.runTransaction(async (transaction) => {
      const regRef = db.collection('registrations').doc(registrationId);
      const regDoc = await transaction.get(regRef);

      if (!regDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Registration not found.');
      }

      const registration = regDoc.data() as Registration;

      // Check permissions: Owner or Admin
      if (registration.info.memberId !== userId) {
         // Check if admin
         const callerDoc = await db.collection('members').doc(userId).get();
         const isCallerAdmin = callerDoc.exists && callerDoc.data()?.system?.role === 'admin';
         
         if (!isCallerAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'You can only cancel your own registration or must be an admin.');
         }
      }

      if (registration.status.status === 'cancelled') {
        throw new functions.https.HttpsError('failed-precondition', 'Already cancelled.');
      }

      // Update status
      transaction.update(regRef, {
        'status.status': 'cancelled'
      });

      // Update Event Stats
      const eventRef = db.collection('events').doc(registration.info.eventId);
      transaction.update(eventRef, {
        'stats.registeredCount': admin.firestore.FieldValue.increment(-1)
      });

      return { success: true };
    });
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Cancellation failed.', error);
  }
});

export const getMyRegistrations = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }
  const userId = context.auth.uid;
  
  try {
    const snapshot = await admin.firestore().collection('registrations')
      .where('info.memberId', '==', userId)
      .orderBy('info.timestamp', 'desc')
      .get();
    
    const registrations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { registrations };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to fetch registrations.', error);
  }
});

// Admin: Get all registrations for an event
export const getEventRegistrations = functions.https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
    }

    const db = admin.firestore();
    const callerDoc = await db.collection('members').doc(context.auth.uid).get();
    const callerRole = callerDoc.data()?.system?.role;

    if (callerRole !== 'admin') {
         throw new functions.https.HttpsError('permission-denied', 'Only admins can view event registrations.');
    }

    const { eventId } = data;
    if (!eventId) {
        throw new functions.https.HttpsError('invalid-argument', 'Event ID is required.');
    }

    try {
        const snapshot = await db.collection('registrations')
            .where('info.eventId', '==', eventId)
            .get();
        
        // Enrich data with member names
        const registrations = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data() as Registration;
            const memberDoc = await db.collection('members').doc(data.info.memberId).get();
            const memberName = memberDoc.exists ? memberDoc.data()?.name : 'Unknown';
            return { 
                id: doc.id, 
                ...data,
                memberName // Add helper field for frontend
            };
        }));
        
        return { registrations };
    } catch (error) {
        throw new functions.https.HttpsError('internal', 'Unable to fetch event registrations.', error);
    }
});
