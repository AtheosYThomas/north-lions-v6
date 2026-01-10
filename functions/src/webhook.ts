
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const lineWebhook = functions.https.onRequest(async (req, res) => {
  // 1. Signature Validation (Simplified for now)
  // In production, verify X-Line-Signature header with Channel Secret
  
  const events = req.body.events;
  if (!events || !Array.isArray(events)) {
    res.status(200).send('OK');
    return;
  }

  try {
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const lineUserId = event.source.userId;
        const content = event.message.text;
        // const replyToken = event.replyToken; // Unused for now

        // 2. Find Member
        let memberName = 'Unknown';
        const memberSnapshot = await db.collection('members')
          .where('contact.lineUserId', '==', lineUserId)
          .limit(1)
          .get();
        
        if (!memberSnapshot.empty) {
            memberName = memberSnapshot.docs[0].data().name;
        }

        // 3. Save to message_logs
        await db.collection('message_logs').add({
            lineUserId,
            content,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            category: 'other', // Default category
            status: 'pending',
            memberName
        });

        // 4. Auto-reply (Optional - maybe just acknowledgement)
        // await replyMessage(replyToken, [{ type: 'text', text: '收到您的訊息！' }]);
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
  }

  res.status(200).send('OK');
});
