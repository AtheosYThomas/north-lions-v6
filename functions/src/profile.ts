
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const updateProfile = functions.https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = context.auth.uid;
    const { contact, emergency } = data;
    
    // Only allow updating specific fields
    const updates: any = {};
    
    if (contact) {
        if (contact.mobile !== undefined) updates['contact.mobile'] = contact.mobile;
        if (contact.email !== undefined) updates['contact.email'] = contact.email;
        // lineUserId should typically not be editable by user, as it's linked to login
    }
    
    if (emergency) {
        if (emergency.contactName !== undefined) updates['emergency.contactName'] = emergency.contactName;
        if (emergency.relationship !== undefined) updates['emergency.relationship'] = emergency.relationship;
        if (emergency.phone !== undefined) updates['emergency.phone'] = emergency.phone;
    }

    if (Object.keys(updates).length === 0) {
        return { message: 'No changes to update.' };
    }

    await db.collection('members').doc(uid).update(updates);
    
    return { success: true };
});
