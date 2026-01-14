import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as line from '@line/bot-sdk';

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// LINE Configuration
const config: line.ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.CHANNEL_SECRET || '',
};

export const lineWebhook = functions.https.onRequest(async (req, res) => {
  const signature = req.headers['x-line-signature'] as string;
  
  if (!config.channelSecret) {
     console.error('CHANNEL_SECRET is not set.');
     res.status(500).send('Server Error: CHANNEL_SECRET not configured');
     return;
  }

  // 1. Signature Validation
  // req.rawBody is a Buffer available in Firebase Cloud Functions
  if (!line.validateSignature(req.rawBody, config.channelSecret, signature)) {
    console.warn('Invalid signature:', signature);
    res.status(403).send('Invalid signature');
    return;
  }

  const events: line.WebhookEvent[] = req.body.events;

  try {
    const results = await Promise.all(events.map(async (event) => {
      return handleEvent(event);
    }));
    res.status(200).json(results);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).end();
  }
});

async function handleEvent(event: line.WebhookEvent) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const lineUserId = event.source.userId;
  if (!lineUserId) return Promise.resolve(null);

  const content = event.message.text;

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

  return Promise.resolve(null);
}
