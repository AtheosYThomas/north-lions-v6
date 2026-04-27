/**
 * 🌪️ 系統後端極限負載驗收：LINE Webhook 併發壓力測試 (Stress Test)
 */
const axios = require('axios');
const crypto = require('crypto');

// Webhook URL: 使用 Firebase Local Emulator 的 Webhook URL 進行本地無痛壓測
// firebase.json 設定 functions emulator port = 5002
const WEBHOOK_URL = 'http://127.0.0.1:5002/north-lions-v6-a7757/us-central1/lineWebhook';

// 測試用密鑰：預設為 mock，建議以環境變數覆蓋
const CHANNEL_SECRET = process.env.TEST_LINE_CHANNEL_SECRET || 'MOCK_SECRET_TOKEN_FOR_TESTING';

/**
 * 產生符合 LINE 規格的 x-line-signature
 * 重要：必須對實際送出的 JSON 字串做 HMAC，不能對 JS 物件做
 */
function generateSignature(bodyStr, secret) {
  return crypto.createHmac('SHA256', secret)
    .update(Buffer.from(bodyStr))
    .digest('base64');
}

async function sendWebhookRequest() {
  const payload = {
    destination: "Uxxxxxxxxx",
    events: [
      {
        type: "message",
        message: {
          type: "text",
          id: "stress-test-" + Date.now() + Math.random(),
          text: "stress test message"
        },
        timestamp: Date.now(),
        source: {
          type: "user",
          userId: "Ustress1234567890"
        },
        replyToken: "replyToken1234",
        mode: "active"
      }
    ]
  };

  // 關鍵：先序列化成字串，再計算簽章；送出時也用相同的字串
  const bodyStr = JSON.stringify(payload);
  const signature = generateSignature(bodyStr, CHANNEL_SECRET);
  const startTime = Date.now();
  let success = false;
  let status = 0;

  try {
    const res = await axios.post(WEBHOOK_URL, bodyStr, {
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': signature
      },
      timeout: 5000 // webhook should response quickly
    });
    success = res.status === 200;
    status = res.status;
  } catch (err) {
    status = err.response ? err.response.status : err.code;
    console.error('Request failed:', status, err.response?.data || '');
  }

  return {
    latency: Date.now() - startTime,
    success,
    status
  };
}

// [情境 A：瞬間爆發 (Spike)]
async function runScenarioA() {
  console.log('🚀 開始情境 A：瞬間爆發 (Spike) - 1 秒內 100 個 Request');
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(sendWebhookRequest());
  }
  
  const results = await Promise.all(promises);
  analyzeResults(results, '情境 A');
}

// [情境 B：連續高負載 (Sustained Load)]
async function runScenarioB() {
  console.log('🚀 開始情境 B：連續高負載 (Sustained Load) - 10 秒內每秒 20 個 Request');
  const allResults = [];
  
  for (let i = 0; i < 10; i++) {
    const promises = [];
    for (let j = 0; j < 20; j++) {
      promises.push(sendWebhookRequest());
    }
    const secResults = await Promise.all(promises);
    allResults.push(...secResults);
    
    // 等待 1 秒後發送下一波
    await new Promise(r => setTimeout(r, 1000));
  }

  analyzeResults(allResults, '情境 B');
}

function analyzeResults(results, name) {
  const total = results.length;
  const successes = results.filter(r => r.success).length;
  const errors = total - successes;
  const latencies = results.map(r => r.latency);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);

  console.log(`\n📊 [${name}] 測試結果報告`);
  console.log(`- 總請求數: ${total}`);
  console.log(`- 成功: ${successes} (${(successes/total*100).toFixed(2)}%)`);
  console.log(`- 失敗: ${errors}`);
  console.log(`- 平均延遲 (Avg Latency): ${avgLatency.toFixed(2)} ms`);
  console.log(`- 最大延遲 (Max Latency): ${maxLatency} ms`);
  console.log(`- 最小延遲 (Min Latency): ${minLatency} ms`);
  
  if (errors > 0) {
    console.error('⚠️ 警告：發現失敗請求！詳細狀態碼:', Array.from(new Set(results.filter(r => !r.success).map(r => r.status))));
  } else {
    console.log('✅ 通過：0 錯誤率。');
  }

  if (maxLatency > 2000) {
    console.warn('⚠️ 警告：最大回應時間超過 2000ms，可能導致 LINE Timeout。');
  } else {
    console.log('✅ 通過：所有回應皆在安全時限內。');
  }
  console.log('--------------------------------------------------\n');
}

async function main() {
  console.log('=== 🌪️ Webhook 壓力測試啟動 🌪️ ===');
  await runScenarioA();
  // 稍作暫停
  await new Promise(r => setTimeout(r, 2000));
  await runScenarioB();
}

main().catch(console.error);
