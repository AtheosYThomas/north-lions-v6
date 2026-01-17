const crypto = require('crypto');

// Configuration
// Usage: node scripts/simulate_line_webhook.js [TARGET_URL] [CHANNEL_SECRET] [EVENT_TYPE] [MESSAGE_TEXT]
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.PROJECT_ID || 'north-lions-v6-a7757';
const FUNCTIONS_EMULATOR_PORT = process.env.FUNCTIONS_EMULATOR_PORT || '5002';
const TARGET_URL = process.argv[2] || process.env.TARGET_URL || `http://127.0.0.1:${FUNCTIONS_EMULATOR_PORT}/${PROJECT_ID}/us-central1/lineWebhook`;
const CHANNEL_SECRET = process.argv[3] || process.env.CHANNEL_SECRET || 'test_secret';
const EVENT_TYPE = process.argv[4] || 'message'; // message | follow
const MESSAGE_TEXT = process.argv[5] || process.env.MESSAGE_TEXT || '查詢活動';

let event = {};
const timestamp = Date.now();
const userId = "U4af4980629testuser";
const replyToken = "757913772c4646b784d4b7ce46d12671";

if (EVENT_TYPE === 'follow') {
    event = {
        type: "follow",
        mode: "active",
        timestamp,
        source: {
            type: "user",
            userId
        },
        replyToken
    };
} else {
    // Default to message
    event = {
      type: "message",
      message: {
        type: "text",
        id: "14353793211180",
        text: MESSAGE_TEXT
      },
        timestamp,
        source: {
            type: "user",
            userId
        },
        replyToken,
        mode: "active"
    };
}

const payload = {
  destination: "xxxxxxxxxx",
  events: [event]
};

const body = JSON.stringify(payload);
const signature = crypto
  .createHmac('SHA256', CHANNEL_SECRET)
  .update(body)
  .digest('base64');

console.log('🚀 Sending simulated LINE Webhook...');
console.log(`📍 Target URL: ${TARGET_URL}`);
console.log(`🔑 Channel Secret: ${CHANNEL_SECRET}`);
console.log(`📝 Event Type: ${EVENT_TYPE}`);
console.log(`✍️ Signature: ${signature}`);
console.log(`📝 Message Text: ${MESSAGE_TEXT}`);

async function sendRequest(sig) {
  const response = await fetch(TARGET_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Line-Signature': sig
    },
    body: body
  });

  const text = await response.text();
  return { status: response.status, statusText: response.statusText, body: text };
}

(async () => {
  try {
    console.log('\n== 測試 1: 正確簽章 (預期 200) ==');
    const okResult = await sendRequest(signature);
    console.log(`📨 Response Status: ${okResult.status} ${okResult.statusText}`);
    console.log(`📦 Response Body: ${okResult.body}`);
    console.log(okResult.status === 200 ? '✅ Test Passed (Request accepted)' : '❌ Test Failed (Request rejected)');

    console.log('\n== 測試 2: 非法簽章 (預期 401/403) ==');
    const badResult = await sendRequest('invalid-signature');
    console.log(`📨 Response Status: ${badResult.status} ${badResult.statusText}`);
    console.log(`📦 Response Body: ${badResult.body}`);
    console.log((badResult.status === 401 || badResult.status === 403) ? '✅ Test Passed (Request rejected)' : '❌ Test Failed (Unexpected status)');

    // Optional: Check message_logs write in Firestore emulator
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const { initializeApp } = require('firebase-admin/app');
      const { getFirestore } = require('firebase-admin/firestore');

      try {
        initializeApp({ projectId: PROJECT_ID });
      } catch (e) {
        // ignore duplicate app init
      }

      const db = getFirestore();
      const snap = await db.collection('message_logs')
        .where('content', '==', MESSAGE_TEXT)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (!snap.empty) {
        console.log('\n✅ message_logs 已寫入');
        console.log(JSON.stringify(snap.docs[0].data(), null, 2));
      } else {
        console.log('\n❌ message_logs 未找到對應紀錄');
      }
    } else {
      console.log('\n⚠️ 未設定 FIRESTORE_EMULATOR_HOST，略過 message_logs 驗證。');
    }
  } catch (error) {
    console.error('\n❌ Error sending request:', error.cause || error);
    console.log('Tip: Make sure the emulator is running and the URL is correct.');
  }
})();
