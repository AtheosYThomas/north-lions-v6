/*
  debug_webhook.js
  用來檢查：
  1) 簽章驗證是否可通過（呼叫 webhook）
  2) LINE Channel Access Token 是否有效（呼叫 /v2/bot/info）
  3) Firestore 連線是否可用（選用，需 service account）

  Usage:
    node scripts/debug_webhook.js --url <WEBHOOK_URL> --secret <CHANNEL_SECRET> --token <ACCESS_TOKEN> [--service-account <PATH>] [--env-file <PATH>]

  或使用環境變數：
    WEBHOOK_URL
    LINE_CHANNEL_SECRET
    LINE_CHANNEL_ACCESS_TOKEN
    GOOGLE_APPLICATION_CREDENTIALS (或 SERVICE_ACCOUNT_PATH)
*/

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

function parseArgs() {
  const args = process.argv.slice(2);
  const map = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (!key.startsWith('--')) continue;
    const value = args[i + 1];
    map[key.replace(/^--/, '')] = value;
    i += 1;
  }
  return map;
}

function loadEnvFile(envPath) {
  const resolved = path.resolve(envPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`找不到 env 檔案：${resolved}`);
  }
  const content = fs.readFileSync(resolved, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function buildSignature(secret, body) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64');
}

async function postWebhook(url, body, signature) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Line-Signature': signature,
    },
    body,
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function checkLineToken(token) {
  if (!token) {
    return { ok: false, status: null, message: '缺少 LINE_CHANNEL_ACCESS_TOKEN' };
  }
  const res = await fetch('https://api.line.me/v2/bot/info', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, message: text };
}

async function checkFirestore(serviceAccountPath) {
  if (!serviceAccountPath) {
    return { ok: null, message: '未提供 service account，略過 Firestore 測試' };
  }

  const resolved = path.resolve(serviceAccountPath);
  if (!fs.existsSync(resolved)) {
    return { ok: false, message: `找不到 service account 檔案：${resolved}` };
  }

  let admin;
  try {
    admin = require('firebase-admin');
  } catch (error) {
    return { ok: false, message: '缺少 firebase-admin，無法測試 Firestore' };
  }

  try {
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    const db = admin.firestore();
    await db.collection('members').limit(1).get();
    return { ok: true, message: 'Firestore 讀取成功' };
  } catch (error) {
    return { ok: false, message: `Firestore 連線失敗：${error.message}` };
  }
}

async function main() {
  const args = parseArgs();

  if (args['env-file']) {
    loadEnvFile(args['env-file']);
  }

  const webhookUrl = args.url || process.env.WEBHOOK_URL;
  const channelSecret = args.secret || process.env.LINE_CHANNEL_SECRET;
  const channelAccessToken = args.token || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const serviceAccountPath =
    args['service-account'] ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.SERVICE_ACCOUNT_PATH;

  if (!webhookUrl) {
    console.error('缺少 WEBHOOK_URL');
    process.exitCode = 1;
    return;
  }

  if (!channelSecret) {
    console.error('缺少 LINE_CHANNEL_SECRET');
    process.exitCode = 1;
    return;
  }

  const payload = {
    destination: 'U00000000000000000000000000000000',
    events: [
      {
        type: 'message',
        replyToken: '00000000000000000000000000000000',
        source: { type: 'user', userId: 'U00000000000000000000000000000000' },
        timestamp: Date.now(),
        mode: 'active',
        message: { id: '1', type: 'text', text: 'ping' },
      },
    ],
  };

  const body = JSON.stringify(payload);
  const signature = buildSignature(channelSecret, body);

  console.log('== Webhook 測試 ==');
  const webhookResult = await postWebhook(webhookUrl, body, signature);
  console.log(`HTTP ${webhookResult.status}`);
  if (webhookResult.text) {
    console.log(webhookResult.text);
  }

  let signatureStatus = 'unknown';
  if (webhookResult.status === 403) signatureStatus = '簽章驗證失敗';
  if (webhookResult.status === 400 && /Missing signature/i.test(webhookResult.text)) {
    signatureStatus = '簽章 header 缺失';
  }
  if (webhookResult.status === 200) signatureStatus = '簽章驗證通過';
  if (webhookResult.status === 500 && /CHANNEL_SECRET not configured/i.test(webhookResult.text)) {
    signatureStatus = '伺服器未載入 Channel Secret';
  }

  console.log('\n== LINE Token 測試 ==');
  const tokenResult = await checkLineToken(channelAccessToken);
  console.log(`status: ${tokenResult.status ?? 'N/A'}`);
  console.log(tokenResult.ok ? 'Token 正常' : 'Token 可能無效');

  console.log('\n== Firestore 測試 ==');
  const dbResult = await checkFirestore(serviceAccountPath);
  console.log(dbResult.message);

  console.log('\n== 判斷結果 ==');
  console.log(`簽章驗證：${signatureStatus}`);
  console.log(`權杖有效性：${tokenResult.ok ? '正常' : '可能無效'}`);
  console.log(`資料庫連線：${dbResult.ok === null ? '未測試' : dbResult.ok ? '正常' : '失敗'}`);
}

main().catch((error) => {
  console.error('腳本執行失敗：', error);
  process.exitCode = 1;
});
