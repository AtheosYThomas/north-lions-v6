
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Ensure Firebase Admin is initialized (if not already)
if (!admin.apps.length) {
  admin.initializeApp();
}

export const registerMember = functions.https.onCall(async (data: any, context: any) => {
  // 1. Verify Authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const uid = context.auth.uid;
  const { name, mobile, company, title } = data;

  // 2. Basic Validation
  if (!name || !mobile) {
     throw new functions.https.HttpsError('invalid-argument', 'Name and Mobile are required.');
  }

  try {
    const memberRef = admin.firestore().collection('members').doc(uid);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Member profile not found.');
    }

    // 3. Update Member Data
    // Only allow updating specific fields during registration
    await memberRef.update({
      name: name,
      'contact.mobile': mobile,
      'company.name': company || '',
      'organization.title': title || '',
      'status.activeStatus': 'active', // Activate the member
      'personal.joinDate': admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Registration Error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to register member.');
  }
});

export const getMembers = functions.https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
    }

    const db = admin.firestore();
    const callerDoc = await db.collection('members').doc(context.auth.uid).get();
    const callerRole = callerDoc.data()?.system?.role;

    if (callerRole !== 'admin') {
         throw new functions.https.HttpsError('permission-denied', 'Only admins can view member list.');
    }

    try {
        const snapshot = await db.collection('members').orderBy('name').get();
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { members };
    } catch (error) {
        throw new functions.https.HttpsError('internal', 'Unable to fetch members.', error);
    }
});
