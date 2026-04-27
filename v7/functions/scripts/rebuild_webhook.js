/**
 * 完整重建 webhook.ts（乾淨的 UTF-8 版本）
 * 執行: node v7/functions/scripts/rebuild_webhook.js
 */
const fs = require('fs');
const path = require('path');

const content = `import { onRequest } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { getFunctions } from 'firebase-admin/functions';
import * as admin from 'firebase-admin';
import * as line from '@line/bot-sdk';
import { replyMessage } from './line';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import * as logger from 'firebase-functions/logger';
import * as https from 'https';
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  dotenv.config({ path: '.env.local' });
}

// 每次呼叫時取得 db
const getDb = () => admin.firestore();

export const lineWebhook = onRequest({ invoker: 'public' }, async (req, res) => {
  const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
  const signature = req.headers['x-line-signature'] as string;
  
  if (!channelSecret || !signature) {
    console.error('Missing secret or signature');
    res.status(403).send('Forbidden: Missing configuration');
    return;
  }

  const rawBody = Buffer.isBuffer(req.rawBody)
    ? req.rawBody
    : Buffer.from(JSON.stringify(req.body ?? {}));

  try {
    if (!line.validateSignature(rawBody, channelSecret, signature)) {
      res.status(403).send('Invalid signature');
      return;
    }
  } catch (err) {
    console.error('Signature validation error:', err);
    res.status(403).send('Signature validation error');
    return;
  }

  const events: line.WebhookEvent[] = req.body?.events || [];

  if (events.length === 0) {
    res.status(200).send('OK');
    return;
  }

  // 派送 Cloud Tasks，立即回傳 200 給 LINE
  try {
    const queue = getFunctions().taskQueue('processLineEvent');
    await Promise.all(events.map(event => queue.enqueue({ event })));
  } catch (err) {
    logger.error('Enqueue error:', err);
  }
  res.status(200).send('OK');
});

// Cloud Task Worker，處理 LINE 事件
export const processLineEvent = onTaskDispatched({
  retryConfig: { maxAttempts: 3 },
  rateLimits: { maxConcurrentDispatches: 20 }
}, async (req) => {
  const db = getDb();
  const event = req.data.event as line.WebhookEvent;
  if (!event) return;
  await handleEvent(event, db);
});

async function handleEvent(event: line.WebhookEvent, db: admin.firestore.Firestore) {
  if (event.type === 'message' && event.message.type === 'text') {
    const lineUserId = event.source.userId;
    const replyToken = event.replyToken;
    const content = event.message.text.trim();
    
    if (!lineUserId) return;

    // 1. 識別會員
    let memberName = 'Unknown';
    let isMemberFound = false;
    
    const memberSnapshot = await db.collection('members')
      .where('contact.lineUserId', '==', lineUserId)
      .limit(1).get();

    if (!memberSnapshot.empty) {
      const doc = memberSnapshot.docs[0];
      memberName = doc.data().name;
      isMemberFound = true;
    }

    // 2. 記錄訊息
    await db.collection('message_logs').add({
      lineUserId,
      content,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      category: 'other',
      status: 'pending',
      memberName
    });

    // 3. 處理指令
    if (replyToken) {
      if (!isMemberFound) {
         const registerUrl = process.env.VITE_LIFF_URL || 'https://north-lions-v6-a7757.web.app';
         await replyMessage(replyToken, [{
           type: 'text',
           text: \`您好！感謝您傳訊給北大獅子會。\\n\\n為了提供您專屬的會員服務，請先完成會員綁定：\\n\${registerUrl}\\n\\n完成後即可使用完整功能。\`
         }]);
         return;
      }

      if (content === '測試') {
        await replyMessage(replyToken, [{
          type: 'text',
          text: \`V7 系統 Webhook 運作正常！userId 為 \${lineUserId}\`
        }]);
      } else if (content === '我的資料') {
        try {
          const doc = memberSnapshot.docs[0];
          const displayName = doc.data().name;
          const role = doc.data().organization?.role || '一般會員';
          await replyMessage(replyToken, [{
            type: 'text',
            text: \`👤 [個人資料]\\n姓名：\${displayName}\\n身份：\${role}\\n資料查詢完成✅\`
          }]);
        } catch (err) {
          console.error('Error fetching member stats:', err);
          await replyMessage(replyToken, [{ type: 'text', text: '資料查詢失敗，請稍後再試。' }]);
        }
      } else if (content === '最新活動查詢') {
        try {
          const eventsSnap = await db.collection('events')
            .orderBy('time.date', 'desc')
            .limit(3)
            .get();
            
          if (eventsSnap.empty) {
            await replyMessage(replyToken, [{ type: 'text', text: '目前沒有活動資訊。' }]);
          } else {
            let msg = '📋 [最新活動]\\n';
            eventsSnap.docs.forEach((doc, idx) => {
              const data = doc.data();
              msg += \`\${idx + 1}. \${data.name} (\${data.time?.date || '日期未定'})\\n\`;
            });
            await replyMessage(replyToken, [{ type: 'text', text: msg.trim() }]);
          }
        } catch (err) {
          console.error('Error fetching events:', err);
          await replyMessage(replyToken, [{ type: 'text', text: '活動查詢失敗，請稍後再試。' }]);
        }
      } else if (content === '最新公告') {
        try {
          const annSnap = await db.collection('announcements')
            .orderBy('date', 'desc')
            .limit(5)
            .get();
            
          if (annSnap.empty) {
            await replyMessage(replyToken, [{ type: 'text', text: '目前沒有最新公告。' }]);
          } else {
            let msg = '📢 [最新公告]\\n';
            let idx = 0;
            for (const doc of annSnap.docs) {
              const data = doc.data();
              if (data.status?.status !== 'published') continue;
              const dateStr = data.date?.toDate ? data.date.toDate().toLocaleDateString('zh-TW') : '日期';
              msg += \`\${idx + 1}. \${data.title} (\${dateStr})\\n\`;
              idx++;
              if (idx >= 3) break;
            }
            if (idx === 0) msg += '目前暫無已發布的公告。';
            await replyMessage(replyToken, [{ type: 'text', text: msg.trim() }]);
          }
        } catch (err) {
          console.error('Error fetching announcements:', err);
          await replyMessage(replyToken, [{ type: 'text', text: '公告查詢失敗，請稍後再試。' }]);
        }
      } else if (['help', '幫助', '指令'].includes(content.toLowerCase())) {
        await replyMessage(replyToken, [{
          type: 'text',
          text: '🦁 北大獅子會 V7 可用指令：\\n- 最新公告：查詢最新公告\\n- 最新活動查詢：查看近期活動\\n- 我的資料：查詢個人資料\\n- 我的報名：查詢活動報名狀態'
        }]);
      } else if (content.toLowerCase() === 'ping') {
        await replyMessage(replyToken, [{ type: 'text', text: 'pong from V7 Backend!' }]);
      } else if (content === '我的報名') {
        try {
          const memberId = memberSnapshot.docs[0].id;
          const regSnap = await db.collection('registrations')
            .where('info.memberId', '==', memberId)
            .where('status.status', '==', '已報名')
            .get();

          if (regSnap.empty) {
            await replyMessage(replyToken, [{ type: 'text', text: \`嗨 \${memberName}！\\n\\n目前沒有進行中的報名紀錄。\\n\\n如需報名活動，請點擊選單前往網頁端報名哦！\` }]);
          } else {
            let message = \`嗨 \${memberName}！\\n\\n您目前有 \${regSnap.size} 個進行中的報名：\\n\`;
            let index = 1;
            for (const doc of regSnap.docs) {
              const regData = doc.data();
              const eventId = regData.info.eventId;
              const eventDoc = await db.collection('events').doc(eventId).get();
              if (eventDoc.exists) {
                const evt = eventDoc.data() as any;
                message += \`\\n📌 \${index}. \${evt.name}\\n   📅 日期：\${evt.time?.date || '未定'}\\n   📍 地點：\${evt.details?.location || '未定'}\\n   👥 報名人數：\${regData.details?.adultCount} 大人 / \${regData.details?.childCount} 小孩\\n\`;
                index++;
              }
            }
            await replyMessage(replyToken, [{ type: 'text', text: message.trim() }]);
          }
        } catch (error) {
          console.error("Error fetching registrations: ", error);
          await replyMessage(replyToken, [{ type: 'text', text: '報名查詢失敗，請稍後再試。' }]);
        }
      } else if (event.source.type === 'user') {
        // 未命中指令，轉發給 Gemini AI
        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
          await replyMessage(replyToken, [{ type: 'text', text: 'AI 助手目前無法使用，請稍後再試。' }]);
          return;
        }
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const V7_URL = process.env.VITE_LIFF_URL
            ? process.env.VITE_LIFF_URL.replace('/login', '')
            : 'https://north-lions-v6-a7757.web.app';
          const systemInstruction = \`你是新北市北大獅子會 V7 系統的專屬智慧助理。當會員詢問活動資訊時，請務必優先使用工具查詢資料庫，並直接在對話中列出重點資訊。請勿只叫會員自己去網站看。若資料太長，請提供摘要並附上 V7 系統連結：\${V7_URL} 供其查看詳情。回答請簡潔，不超過 200 字。\`;
          
          const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            systemInstruction,
            tools: [{
              functionDeclarations: [
                {
                  name: "get_recent_events",
                  description: "從 Firestore 查詢近期 30 天內的活動列表（按日期排序）"
                },
                {
                  name: "get_event_details",
                  description: "查詢特定活動的詳細資訊，包括地點、費用與描述",
                  parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                      event_name: {
                        type: SchemaType.STRING,
                        description: "模糊查詢的活動名稱，例如 '捐助兒童眼鏡'"
                      }
                    },
                    required: ["event_name"]
                  }
                },
                {
                  name: "check_registration_status",
                  description: "查詢當前 LINE 使用者的最新報名/繳費審核狀態"
                }
              ]
            }]
          });
          
          const chat = model.startChat();
          let result = await chat.sendMessage(content);
          let response = result.response;

          // 處理 Function Calling
          const functionCalls = typeof response.functionCalls === 'function' ? response.functionCalls() : response.functionCalls;
          if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            let functionResponse: any = null;

            try {
              if (call.name === 'get_recent_events') {
                functionResponse = await getRecentEvents(db);
              } else if (call.name === 'get_event_details') {
                const eventName = (call.args as any).event_name || '';
                functionResponse = await getEventDetails(db, eventName);
              } else if (call.name === 'check_registration_status') {
                functionResponse = await checkRegistrationStatus(db, lineUserId);
              }

              if (functionResponse) {
                result = await chat.sendMessage([{
                  functionResponse: {
                    name: call.name,
                    response: functionResponse
                  }
                }]);
                response = result.response;
              }
            } catch (err: any) {
               logger.error('Function execution error:', err);
               result = await chat.sendMessage([{
                 functionResponse: {
                   name: call.name,
                   response: { error: '工具執行失敗' }
                 }
               }]);
               response = result.response;
            }
          }

          const aiText = response.text() || '抱歉，無法取得回應，請稍後再試。';
          await replyMessage(replyToken, [{ type: 'text', text: aiText }]);
        } catch (err: any) {
          console.error('Gemini API Error:', err instanceof Error ? err.message : String(err));
          await replyMessage(replyToken, [{ type: 'text', text: '抱歉，AI 助手暫時無法回應，請稍後再試。' }]);
        }
      }
    }
  } else if (event.type === 'message' && event.message.type === 'image') {
    const lineUserId = event.source.userId;
    const messageId = event.message.id;
    const replyToken = event.replyToken;
    if (!lineUserId) return;

    const memberSnap = await db.collection('members').where('contact.lineUserId', '==', lineUserId).limit(1).get();
    if (memberSnap.empty) {
      if (replyToken) await replyMessage(replyToken, [{ type: 'text', text: '您尚未綁定會員，無法使用截圖上傳功能。' }]);
      return;
    }
    const memberId = memberSnap.docs[0].id;
    const memberName = memberSnap.docs[0].data().name as string;

    // 使用 node https 下載 LINE 圖片
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    try {
      const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
        const req2 = https.get({
          hostname: 'api-data.line.me',
          path: \`/v2/bot/message/\${messageId}/content\`,
          headers: { Authorization: \`Bearer \${accessToken}\` }
        }, (imgRes) => {
          const chunks: Buffer[] = [];
          imgRes.on('data', (c: Buffer) => chunks.push(c));
          imgRes.on('end', () => resolve(Buffer.concat(chunks)));
          imgRes.on('error', reject);
        });
        req2.on('error', reject);
      });
      const tempPath = \`temp_receipts/\${lineUserId}/\${messageId}.jpg\`;
      await admin.storage().bucket().file(tempPath).save(imageBuffer, {
        metadata: { contentType: 'image/jpeg' }
      });
    } catch (err) {
      logger.error('Failed to save temp image:', err);
      if (replyToken) await replyMessage(replyToken, [{ type: 'text', text: '圖片儲存失敗，請稍後再試。' }]);
      return;
    }

    // 查詢待繳費活動
    const paidEventsSnap = await db.collection('events').where('details.isPaidEvent', '==', true).get();
    const paidEventIds = new Set(paidEventsSnap.docs.map(d => d.id));
    const regsSnap = await db.collection('registrations')
      .where('info.memberId', '==', memberId)
      .where('status.paymentStatus', '==', '未繳費')
      .get();
    const unpaidRegs = regsSnap.docs.filter(d => paidEventIds.has(d.data().info.eventId));

    if (unpaidRegs.length === 0) {
      if (replyToken) await replyMessage(replyToken, [{ type: 'text', text: \`\${memberName} 您好！目前無待繳費的活動。\` }]);
      return;
    }

    const flexBubbles: any[] = await Promise.all(unpaidRegs.map(async (regDoc) => {
      const rData = regDoc.data();
      const evDoc = await db.collection('events').doc(rData.info.eventId).get();
      const evData = evDoc.data() as any;
      const total = (evData?.details?.cost || 0) * (rData?.details?.adultCount || 1);
      return {
        type: 'bubble',
        body: { type: 'box', layout: 'vertical', contents: [
          { type: 'text', text: evData?.name || '活動', weight: 'bold', size: 'md', wrap: true },
          { type: 'text', text: \`費用：NT$ \${total.toLocaleString()}\`, size: 'sm', color: '#555555', margin: 'md' }
        ]},
        footer: { type: 'box', layout: 'vertical', contents: [{
          type: 'button', style: 'primary', color: '#4F46E5',
          action: { type: 'postback', label: '綁定此訂單',
            data: \`action=bind_receipt&regId=\${regDoc.id}&msgId=\${messageId}&uid=\${lineUserId}\` }
        }]}
      };
    }));

    if (replyToken) {
      await replyMessage(replyToken, [
        { type: 'text', text: \`\${memberName} 您好！收到繳費截圖 📷\\n請選擇要綁定的訂單：\` },
        { type: 'flex', altText: '請選擇要綁定的活動訂單', contents: { type: 'carousel', contents: flexBubbles } } as any
      ]);
    }

  } else if (event.type === 'postback') {
    const data = event.postback.data;
    const params = new URLSearchParams(data);
    const action = params.get('action');
    logger.log(\`[LINE Postback] userId: \${event.source.userId}, data: \${data}\`);

    if (action === 'bind_receipt') {
      const regId = params.get('regId') || '';
      const msgId = params.get('msgId') || '';
      const uid   = params.get('uid') || event.source.userId || '';
      const replyToken = event.replyToken;
      if (!regId || !msgId || !uid) return;

      try {
        const bucket = admin.storage().bucket();
        const tempPath = \`temp_receipts/\${uid}/\${msgId}.jpg\`;

        // 冪等保護
        const [tempExists] = await bucket.file(tempPath).exists();
        if (!tempExists) {
          if (replyToken) await replyMessage(replyToken, [{ type: 'text', text: '此截圖已經處理過，請勿重複點擊。' }]);
          return;
        }

        const [imageBuffer] = await bucket.file(tempPath).download();
        const permPath = \`receipts/\${Date.now()}_\${regId.substring(0, 8)}.jpg\`;
        await bucket.file(permPath).save(imageBuffer, {
          metadata: { contentType: 'image/jpeg', metadata: { regId, lineUserId: uid } }
        });
        const screenshotUrl =
          \`https://firebasestorage.googleapis.com/v0/b/\${admin.storage().bucket().name}/o/\${encodeURIComponent(permPath)}?alt=media\`;

        await db.collection('registrations').doc(regId).update({
          'status.status': '已上傳憑證',
          'status.paymentStatus': '審核中',
          'payment.reportMethod': 'line_image',
          'payment.screenshotUrl': screenshotUrl,
          'payment.aiConfidence': 'pending'
        });

        await bucket.file(tempPath).delete().catch(() => {});

        if (replyToken) {
          await replyMessage(replyToken, [{
            type: 'text',
            text: '👍 截圖已成功綁定！\\nAI 正在辨識中，結果將在數秒內推播給您。'
          }]);
        }
      } catch (err: any) {
        logger.error('bind_receipt error:', err);
        if (replyToken) {
          await replyMessage(replyToken, [{ type: 'text', text: '❌ 處理失敗，請稍後再試或聯繫財務人員。' }]);
        }
      }
    } else {
      switch (action || data) {
        case 'menu1': case 'action=menu1': logger.log('menu1'); break;
        case 'menu2': case 'action=menu2': logger.log('menu2'); break;
        default: logger.log('Unhandled postback:', data);
      }
    }

  } else if (event.type === 'follow') {
    const replyToken = event.replyToken;
    if (replyToken) {
      const registerUrl = process.env.VITE_LIFF_URL || 'https://north-lions-v6-a7757.web.app';
      await replyMessage(replyToken, [{
        type: 'text',
        text: \`歡迎加入北大獅子會官方帳號！🦁\\n\\n為了提供您專屬的會員服務與活動報名功能，請點擊下方連結完成「會員綁定與註冊」：\\n\${registerUrl}\\n\\n完成後，您就可以隨時點擊選單或輸入「指令」來呼叫小幫手囉！\`
      }]);
    }
  }
}

async function getRecentEvents(db: admin.firestore.Firestore): Promise<any> {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const snapshot = await db.collection('events')
      .where('time.date', '>=', todayStr)
      .orderBy('time.date', 'asc')
      .limit(5)
      .get();
    if (snapshot.empty) return { message: "未來 30 天內沒有查詢到任何活動" };
    return {
      events: snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          name: data.name,
          date: data.time?.date || "未提供",
          location: data.details?.location || "未提供",
          isPaidEvent: data.details?.isPaidEvent || false
        };
      })
    };
  } catch (error: any) {
    logger.error('Error in getRecentEvents:', error);
    return { error: '查無活動或發生系統錯誤' };
  }
}

async function getEventDetails(db: admin.firestore.Firestore, eventName: string): Promise<any> {
  try {
    const snapshot = await db.collection('events').orderBy('time.date', 'desc').limit(50).get();
    if (snapshot.empty) return { message: '目前資料庫中沒有任何活動' };

    // 多層次模糊比對: L1:直接包含(+3) L2:bigram/trigram(+1/個) L3:單字(+0.5)
    const normalize = (s: string) => s
      .toLowerCase()
      .replace(/[\\uff01-\\uff5e]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/\\s+/g, '');
    const needle = normalize(eventName);
    const buildNgrams = (s: string, n: number) => {
      const r: string[] = [];
      for (let i = 0; i <= s.length - n; i++) r.push(s.slice(i, i + n));
      return r;
    };
    const bigrams  = buildNgrams(needle, 2);
    const trigrams = buildNgrams(needle, 3);
    const chars    = needle.split('');
    let bestScore = 0;
    let bestDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    snapshot.docs.forEach(docSnap => {
      const h = normalize(docSnap.data().name || '');
      let score = 0;
      if (h.includes(needle) || needle.includes(h)) score += 3;
      bigrams.forEach(g  => { if (h.includes(g)) score += 1; });
      trigrams.forEach(g => { if (h.includes(g)) score += 1; });
      chars.forEach(c    => { if (h.includes(c)) score += 0.5; });
      if (score > bestScore) { bestScore = score; bestDoc = docSnap; }
    });
    if (!bestDoc || bestScore < 0.5) {
      const names = snapshot.docs.map(d => d.data().name).join('\\u3001');
      return { message: \`找不到符合「\${eventName}」的活動。目前已登錄的活動包括：\${names}，請確認後再查詢。\` };
    }
    const d = (bestDoc as FirebaseFirestore.QueryDocumentSnapshot).data() as any;
    return {
      name:        d.name,
      date:        d.time?.date        || '未提供',
      location:    d.details?.location || '未提供',
      isPaidEvent: d.details?.isPaidEvent || false,
      cost:        d.details?.cost     || 0,
      description: d.content           || '無詳細內容介紹',
      matchScore:  bestScore,
    };
  } catch (error: any) {
    logger.error('Error in getEventDetails:', error);
    return { error: '查詢詳細資料時發生錯誤' };
  }
}

async function checkRegistrationStatus(db: admin.firestore.Firestore, lineUserId: string | undefined): Promise<any> {
  if (!lineUserId) return { message: "未能取得 LINE 帳號，無法為您查詢。" };
  try {
    const memSnap = await db.collection('members').where('contact.lineUserId', '==', lineUserId).limit(1).get();
    if (memSnap.empty) return { message: "查詢不到綁定此 LINE 帳號的獅友資料，請先前往網頁端綁定 LINE。" };
    const memberId = memSnap.docs[0].id;
    const regSnap = await db.collection('registrations')
      .where('info.memberId', '==', memberId)
      .orderBy('info.timestamp', 'desc')
      .limit(1)
      .get();
    if (regSnap.empty) return { message: "目前找不到您近期的任何報名紀錄。" };
    const regData = regSnap.docs[0].data();
    const eventSnap = await db.collection('events').doc(regData.info.eventId).get();
    const eventName = eventSnap.exists ? eventSnap.data()?.name : "未知活動";
    return {
      eventName,
      status: regData.status?.status,
      paymentStatus: regData.status?.paymentStatus,
      aiConfidence: regData.payment?.aiConfidence || "無",
      message: "此為最新一筆活動的審核進度"
    };
  } catch (e: any) {
    logger.error('Error in checkRegistrationStatus:', e);
    return { error: '系統查詢資料時發生錯誤' };
  }
}
`;

const filePath = path.resolve(__dirname, '../src/webhook.ts');
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ webhook.ts completely rebuilt in clean UTF-8');
console.log('Lines:', content.split('\n').length);
