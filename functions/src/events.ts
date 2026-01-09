import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Event } from '../../shared/types';

// Helper to check admin role
// Note: This logic duplicates what's in firestore.rules but is good for backend validation
async function isAdmin(uid: string): Promise<boolean> {
  const memberDoc = await admin.firestore().collection('members').doc(uid).get();
  return memberDoc.exists && memberDoc.data()?.system?.role === 'admin';
}

export const getEvents = functions.https.onCall(async (data: any, context: any) => {
  // Publicly accessible, but we can check auth if needed.
  // For now, allow anyone to view events.
  
  try {
    const snapshot = await admin.firestore().collection('events').orderBy('time.date', 'desc').get();
    const events: Event[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
    return { events };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to fetch events', error);
  }
});

export const getEvent = functions.https.onCall(async (data: any, context: any) => {
  const { eventId } = data;
  if (!eventId) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "eventId".');
  }

  try {
    const doc = await admin.firestore().collection('events').doc(eventId).get();
    if (!doc.exists) {
      throw new functions.https.HttpsError('not-found', 'Event not found');
    }
    return { event: { id: doc.id, ...doc.data() } as Event };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to fetch event', error);
  }
});

export const createEvent = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // Check Admin
  const adminRole = await isAdmin(context.auth.uid);
  if (!adminRole) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can create events.');
  }

  const eventData: Partial<Event> = data.event;
  // Basic validation could go here

  try {
    // Add creation metadata
    const newEvent = {
      ...eventData,
      publishing: {
        ...eventData.publishing,
        publisherId: context.auth.uid,
      },
      // Ensure time dates are handled correctly if passed as ISO strings
    };

    const ref = await admin.firestore().collection('events').add(newEvent);
    return { id: ref.id };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to create event', error);
  }
});

export const updateEvent = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { eventId, event } = data;
  if (!eventId || !event) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing eventId or event data.');
  }

  // Check Admin
  const adminRole = await isAdmin(context.auth.uid);
  if (!adminRole) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can update events.');
  }

  try {
    await admin.firestore().collection('events').doc(eventId).update(event);
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to update event', error);
  }
});
