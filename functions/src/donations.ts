
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const getDonations = functions.https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = context.auth.uid;
    const donationsSnapshot = await db.collection('donations')
        .where('memberId', '==', uid)
        .orderBy('date', 'desc')
        .get();

    return donationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert timestamp to ISO string for frontend
        date: (doc.data().date as admin.firestore.Timestamp).toDate().toISOString()
    }));
});

export const createDonation = functions.https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Check if user is admin
    const callerDoc = await db.collection('members').doc(context.auth.uid).get();
    const callerRole = callerDoc.data()?.system?.role;

    if (callerRole !== 'admin') {
         throw new functions.https.HttpsError('permission-denied', 'Only admins can create donation records.');
    }

    const {
        memberId,
        donorName,
        amount,
        category,
        payment, // { method, accountLast5 }
        receipt, // { isRequired, deliveryMethod }
        date // ISO string
    } = data;

    if (!memberId || !amount || !category || !date) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    const donationData = {
        memberId,
        donorName: donorName || '',
        amount: Number(amount),
        category,
        date: admin.firestore.Timestamp.fromDate(new Date(date)),
        payment: {
            method: payment?.method || 'cash',
            accountLast5: payment?.accountLast5 || ''
        },
        audit: {
            status: 'pending',
            auditor: ''
        },
        receipt: {
            isRequired: receipt?.isRequired || false,
            status: 'pending',
            deliveryMethod: receipt?.deliveryMethod || ''
        }
    };

    const docRef = await db.collection('donations').add(donationData);

    // Update member stats
    await db.runTransaction(async (transaction) => {
        const memberRef = db.collection('members').doc(memberId);
        const memberDoc = await transaction.get(memberRef);
        
        if (!memberDoc.exists) {
             throw new functions.https.HttpsError('not-found', 'Member not found.');
        }

        const currentStats = memberDoc.data()?.stats || { totalDonation: 0, donationCount: 0 };
        const newTotal = (currentStats.totalDonation || 0) + Number(amount);
        const newCount = (currentStats.donationCount || 0) + 1;

        transaction.update(memberRef, {
            'stats.totalDonation': newTotal,
            'stats.donationCount': newCount,
            'stats.lastDonationDate': donationData.date
        });
    });

    return { id: docRef.id };
});
