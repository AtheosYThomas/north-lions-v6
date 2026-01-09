
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { Member } from 'shared/types';

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

export const verifyLineToken = functions.https.onCall(async (data: any, context) => {
  const { lineAccessToken } = data;

  if (!lineAccessToken) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing LINE access token.');
  }

  try {
    // 1. Verify Token with LINE API
    const response = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${lineAccessToken}` },
    });

    const lineProfile = response.data;
    const lineUserId = lineProfile.userId;
    const displayName = lineProfile.displayName;
    const pictureUrl = lineProfile.pictureUrl;
    const email = lineProfile.email; 

    // 2. Check if user exists in Firestore
    const membersRef = db.collection('members');
    const snapshot = await membersRef.where('contact.lineUserId', '==', lineUserId).limit(1).get();

    let uid: string;
    let isNewUser = false;

    if (snapshot.empty) {
      // Create new Firebase Auth User
      const userRecord = await auth.createUser({
        displayName: displayName,
        photoURL: pictureUrl,
        email: email, 
      });
      uid = userRecord.uid;
      isNewUser = true;

      // Create new Member document
      const newMember: Member = {
        id: uid,
        name: displayName,
        contact: {
          mobile: '',
          email: email || '',
          lineUserId: lineUserId,
        },
        organization: { role: 'member', title: '會員' },
        personal: { joinDate: admin.firestore.FieldValue.serverTimestamp() as any },
        company: { name: '', taxId: '' },
        emergency: { contactName: '', relationship: '', phone: '' },
        status: { activeStatus: 'active', membershipType: 'regular' },
        system: { role: 'member', pushConsent: false },
        stats: { totalDonation: 0, donationCount: 0 },
      };

      await membersRef.doc(uid).set(newMember);
    } else {
      const doc = snapshot.docs[0];
      uid = doc.id;
      // Update basic info
      await doc.ref.update({
        'stats.lastInteraction': admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 3. Create Custom Token
    const customToken = await auth.createCustomToken(uid);

    return { token: customToken, isNewUser };

  } catch (error) {
    console.error('LINE Login Error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to verify LINE token.');
  }
});
