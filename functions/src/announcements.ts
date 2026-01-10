
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Announcement } from 'shared/types';

// Helper to check admin role
async function isAdmin(uid: string): Promise<boolean> {
  const memberDoc = await admin.firestore().collection('members').doc(uid).get();
  return memberDoc.exists && memberDoc.data()?.system?.role === 'admin';
}

export const getAnnouncements = functions.https.onCall(async (data: any, context: any) => {
  try {
    const snapshot = await admin.firestore().collection('announcements')
      .where('status.status', '==', 'published')
      .orderBy('content.date', 'desc')
      .get();
      
    const announcements: Announcement[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
    return { announcements };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to fetch announcements', error);
  }
});

export const getAnnouncement = functions.https.onCall(async (data: any, context: any) => {
  const { id } = data;
  if (!id) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing announcement ID.');
  }

  try {
    const doc = await admin.firestore().collection('announcements').doc(id).get();
    if (!doc.exists) {
      throw new functions.https.HttpsError('not-found', 'Announcement not found');
    }
    return { announcement: { id: doc.id, ...doc.data() } as Announcement };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to fetch announcement', error);
  }
});

export const createAnnouncement = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const adminRole = await isAdmin(context.auth.uid);
  if (!adminRole) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can create announcements.');
  }

  const announcementData: Partial<Announcement> = data;

  try {
    // Basic validation could go here
    const newAnnouncement = {
      ...announcementData,
      publishing: {
        ...announcementData.publishing,
        publisherId: context.auth.uid,
        publishTime: admin.firestore.FieldValue.serverTimestamp(),
      },
      content: {
        ...announcementData.content,
        date: announcementData.content?.date ? new Date(announcementData.content.date) : admin.firestore.FieldValue.serverTimestamp(),
      }
    };

    const ref = await admin.firestore().collection('announcements').add(newAnnouncement);
    return { id: ref.id };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to create announcement', error);
  }
});

export const updateAnnouncement = functions.https.onCall(async (data: any, context: any) => {
   if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const adminRole = await isAdmin(context.auth.uid);
  if (!adminRole) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can update announcements.');
  }

  const { id, announcement } = data;
  if (!id || !announcement) {
     throw new functions.https.HttpsError('invalid-argument', 'Missing ID or data.');
  }

  try {
    await admin.firestore().collection('announcements').doc(id).update(announcement);
    return { success: true };
  } catch (error) {
     throw new functions.https.HttpsError('internal', 'Unable to update announcement', error);
  }
});
