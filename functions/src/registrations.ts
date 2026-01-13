
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as util from 'util';
import { Registration, Event } from 'shared/types';

// Ensure Firebase Admin is initialized (if not already)
if (!admin.apps.length) {
  admin.initializeApp();
}

function debugContext(context: any, label = 'context') {
  try {
    console.log(`DEBUG ${label} typeof/ctor`, { typeof: typeof context, constructor: context?.constructor?.name || null });
    try {
      console.log(`DEBUG ${label} util.inspect`, util.inspect(context, { showHidden: true, depth: 5 }));
    } catch (e) {
      console.log(`DEBUG ${label} util.inspect failed`, e);
    }

    try {
      const names = Object.getOwnPropertyNames(context || {});
      const keys = Object.keys(context || {});
      const symbols = Object.getOwnPropertySymbols(context || {});
      const descriptors = Object.getOwnPropertyDescriptors(context || {});
      const proto = Object.getPrototypeOf(context || {});
      console.log(`DEBUG ${label} props`, JSON.stringify({ names, keys, symbolCount: symbols.length }, null, 2));
      console.log(`DEBUG ${label} proto`, util.inspect(proto, { showHidden: true, depth: 2 }));
      try { console.log(`DEBUG ${label} descriptors`, util.inspect(descriptors, { showHidden: true, depth: 2 })); } catch (e) { /* ignore */ }
      if (symbols.length) {
        try {
          console.log(`DEBUG ${label} symbols`, symbols.map(s => s.toString()));
        } catch (e) {}
      }
      if ((context as any)?.auth) {
        try {
          console.log(`DEBUG ${label}.auth typeof/ctor`, { typeof: typeof (context as any).auth, constructor: (context as any).auth?.constructor?.name || null });
          console.log(`DEBUG ${label}.auth descriptors`, util.inspect(Object.getOwnPropertyDescriptors((context as any).auth), { showHidden: true, depth: 2 }));
        } catch (e) {
          console.log(`DEBUG ${label}.auth introspect failed`, e);
        }
      }
    } catch (e) {
      console.log(`DEBUG ${label} property-inspection failed`, e);
    }
  } catch (e) {
    console.log(`DEBUG ${label} top-level introspect failed`, e);
  }
}

export const registerEvent = functions.https.onCall(async (data: any, context: any) => {
  debugContext(context, 'registerEvent');
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
          timestamp: FieldValue.serverTimestamp() as any
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
        'stats.registeredCount': FieldValue.increment(1)
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
  console.log('DEBUG cancelRegistration entry', { data });
  debugContext(context, 'cancelRegistration');
  try {
      console.log('DEBUG cancelRegistration context summary', JSON.stringify({ auth: context?.auth || null }, null, 2));
      try {
        const rawReq = (context as any)?.rawRequest ?? (data as any)?.rawRequest;
        let headers: any = null;
        if (rawReq) {
          if (rawReq.headers) headers = rawReq.headers;
          else if (rawReq.rawHeaders && Array.isArray(rawReq.rawHeaders)) {
            headers = {};
            for (let i = 0; i < rawReq.rawHeaders.length; i += 2) {
              headers[rawReq.rawHeaders[i]] = rawReq.rawHeaders[i + 1];
            }
          }
        }
        // rawBody may be a Buffer on the incoming request
        let rawBodyStr: string | null = null;
        try {
          const rawBody = (rawReq as any)?.rawBody ?? (context as any)?.rawBody ?? (data as any)?.rawBody;
          if (rawBody && typeof (rawBody as any).toString === 'function') {
            // Buffer or similar
            rawBodyStr = (rawBody as any).toString('utf8');
          } else if (typeof rawBody === 'string') {
            rawBodyStr = rawBody;
          }
        } catch (e) {
          rawBodyStr = null;
        }
        const contextProps = Object.getOwnPropertyNames(context || {});
        const hasAuthProp = Object.prototype.hasOwnProperty.call(context || {}, 'auth');
        console.log('DEBUG cancelRegistration request-headers', JSON.stringify(headers || null, null, 2));
        console.log('DEBUG cancelRegistration rawBody', rawBodyStr);
        console.log('DEBUG cancelRegistration contextProps', JSON.stringify({ props: contextProps, hasAuthProp }, null, 2));
      } catch (e) {
        console.log('DEBUG cancelRegistration request-headers (unserializable)', e);
      }
  } catch (e) {
    console.log('DEBUG cancelRegistration context (unserializable)');
  }
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

      // Validate registration document shape
      const ownerId = registration?.info?.memberId;
      const eventId = registration?.info?.eventId;
      if (!ownerId || !eventId) {
        throw new functions.https.HttpsError('internal', 'Malformed registration document.');
      }

      // Check permissions: Owner or Admin
      if (ownerId !== userId) {
         const callerDoc = await db.collection('members').doc(userId).get();
         const isCallerAdmin = callerDoc.exists && callerDoc.data()?.system?.role === 'admin';
         if (!isCallerAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'You can only cancel your own registration or must be an admin.');
         }
      }

      const regStatus = registration?.status?.status || null;
      if (regStatus === 'cancelled') {
        throw new functions.https.HttpsError('failed-precondition', 'Already cancelled.');
      }

      // Update status
      transaction.update(regRef, {
        'status.status': 'cancelled'
      });

      // Update Event Stats
      const eventRef = db.collection('events').doc(eventId);
      transaction.update(eventRef, {
        'stats.registeredCount': FieldValue.increment(-1)
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Cancellation Error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Cancellation failed.', error);
  }
});

export const getMyRegistrations = functions.https.onCall(async (data: any, context: any) => {
  debugContext(context, 'getMyRegistrations');
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
  console.log('DEBUG getEventRegistrations entry', { data });
  debugContext(context, 'getEventRegistrations');
    try {
        console.log('DEBUG getEventRegistrations context summary', JSON.stringify({ auth: context?.auth || null }, null, 2));
        try {
          const rawReq = (context as any)?.rawRequest ?? (data as any)?.rawRequest;
          let headers: any = null;
          if (rawReq) {
            if (rawReq.headers) headers = rawReq.headers;
            else if (rawReq.rawHeaders && Array.isArray(rawReq.rawHeaders)) {
              headers = {};
              for (let i = 0; i < rawReq.rawHeaders.length; i += 2) {
                headers[rawReq.rawHeaders[i]] = rawReq.rawHeaders[i + 1];
              }
            }
          }
          let rawBodyStr: string | null = null;
          try {
            const rawBody = (rawReq as any)?.rawBody ?? (context as any)?.rawBody ?? (data as any)?.rawBody;
            if (rawBody && typeof (rawBody as any).toString === 'function') rawBodyStr = (rawBody as any).toString('utf8');
            else if (typeof rawBody === 'string') rawBodyStr = rawBody;
          } catch (e) {
            rawBodyStr = null;
          }
          const contextProps = Object.getOwnPropertyNames(context || {});
          const hasAuthProp = Object.prototype.hasOwnProperty.call(context || {}, 'auth');
          console.log('DEBUG getEventRegistrations request-headers', JSON.stringify(headers || null, null, 2));
          console.log('DEBUG getEventRegistrations rawBody', rawBodyStr);
          console.log('DEBUG getEventRegistrations contextProps', JSON.stringify({ props: contextProps, hasAuthProp }, null, 2));
        } catch (e) {
          console.log('DEBUG getEventRegistrations request-headers (unserializable)', e);
        }
    } catch (e) {
      console.log('DEBUG getEventRegistrations context (unserializable)');
    }
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
