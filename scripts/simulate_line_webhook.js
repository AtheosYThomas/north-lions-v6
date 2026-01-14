const crypto = require('crypto');

// Configuration
// Usage: node scripts/simulate_line_webhook.js [TARGET_URL] [CHANNEL_SECRET] [EVENT_TYPE]
const TARGET_URL = process.argv[2] || process.env.TARGET_URL || 'http://127.0.0.1:5001/demo-project/us-central1/lineWebhook';
const CHANNEL_SECRET = process.argv[3] || process.env.CHANNEL_SECRET || 'test_secret';
const EVENT_TYPE = process.argv[4] || 'message'; // message | follow

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
            text: "指令" // Test the "help" command by default
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

(async () => {
  try {
    const response = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature
      },
      body: body
    });

    console.log(`\n📨 Response Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`📦 Response Body: ${text}`);

    if (response.ok) {
        console.log('\n✅ Test Passed (Request accepted)');
    } else {
        console.error('\n❌ Test Failed (Request rejected)');
    }
  } catch (error) {
    console.error('\n❌ Error sending request:', error.cause || error);
    console.log('Tip: Make sure the emulator is running and the URL is correct.');
  }
})();
