
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const getPayments = functions.https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = context.auth.uid;
    // We want to query payments where 'related.memberId' == uid
    const paymentsSnapshot = await db.collection('payments')
        .where('related.memberId', '==', uid)
        .orderBy('date', 'desc')
        .get();

    return paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as admin.firestore.Timestamp).toDate().toISOString()
    }));
});

export const createPayment = functions.https.onCall(async (data: any, context: any) => {
    if (!context.auth) {
         throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    
    // In a real scenario, this might be triggered by a callback from a payment gateway, 
    // or manually by an admin. For now, we allow admins to create payment records.
    
    const callerDoc = await db.collection('members').doc(context.auth.uid).get();
    const callerRole = callerDoc.data()?.system?.role;

    if (callerRole !== 'admin') {
         throw new functions.https.HttpsError('permission-denied', 'Only admins can create payment records manually.');
    }

    const {
        payerName,
        amount,
        method, // { type, accountLast5 }
        audit, // { isConfirmed, auditor }
        receipt, // { isRequired, title, taxId }
        related, // { eventId, registrationId, memberId }
        system, // { lineUid, eventCode, eventName }
        date
    } = data;

    if (!payerName || !amount || !date || !related?.memberId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    const paymentData = {
        payerName,
        date: admin.firestore.Timestamp.fromDate(new Date(date)),
        amount: Number(amount),
        method: {
            type: method?.type || 'cash',
            accountLast5: method?.accountLast5 || ''
        },
        audit: {
            isConfirmed: audit?.isConfirmed || false,
            auditor: audit?.auditor || ''
        },
        receipt: {
            isRequired: receipt?.isRequired || false,
            title: receipt?.title || '',
            taxId: receipt?.taxId || ''
        },
        related: {
            eventId: related?.eventId || '',
            registrationId: related?.registrationId || '',
            memberId: related.memberId
        },
        system: {
            lineUid: system?.lineUid || '',
            eventCode: system?.eventCode || '',
            eventName: system?.eventName || ''
        }
    };

    const docRef = await db.collection('payments').add(paymentData);

    // If related to a registration, update the registration payment status?
    // This logic depends on business rules. Assuming yes if registrationId is provided.
    if (related?.registrationId) {
        await db.collection('registrations').doc(related.registrationId).update({
            'status.paymentStatus': 'paid' // simplified
        });
    }

    return { id: docRef.id };
});
