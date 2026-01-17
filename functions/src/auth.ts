
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
  const { lineAccessToken, lineIdToken } = data;

  if (!lineAccessToken && !lineIdToken) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing LINE access token.');
  }

  try {
    // 1. Verify Token with LINE API
    let lineProfile: any;
    if (lineAccessToken) {
      const response = await axios.get('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${lineAccessToken}` },
      });
      lineProfile = response.data;
    } else {
      const channelId = process.env.LINE_LOGIN_CHANNEL_ID || process.env.LINE_CHANNEL_ID || '';
      if (!channelId) {
        throw new functions.https.HttpsError('failed-precondition', 'Missing LINE channel id for ID token verification.');
      }
      const response = await axios.get('https://api.line.me/oauth2/v2.1/verify', {
        params: { id_token: lineIdToken, client_id: channelId },
      });
      lineProfile = response.data;
    }

    const lineUserId = lineProfile.userId || lineProfile.sub;
    const displayName = lineProfile.displayName || lineProfile.name;
    const pictureUrl = lineProfile.pictureUrl || lineProfile.picture;
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

      // Create new Member document with pending status
      const newMember: Member = {
        id: uid,
        name: displayName, // Use LINE display name as initial placeholder
        contact: {
          mobile: '',
          email: email || '',
          lineUserId: lineUserId,
        },
        organization: { role: 'member', title: '' },
        personal: { joinDate: admin.firestore.FieldValue.serverTimestamp() as any },
        company: { name: '', taxId: '' },
        emergency: { contactName: '', relationship: '', phone: '' },
        status: { activeStatus: 'pending_registration', membershipType: 'regular' },
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
