import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as line from '@line/bot-sdk';
import { replyMessage } from './line';
import { Registration, Event } from 'shared/types';

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
  // Handle Message Event
  if (event.type === 'message' && event.message.type === 'text') {
    const lineUserId = event.source.userId;
    if (!lineUserId) return Promise.resolve(null);

    const content = event.message.text.trim();
    const replyToken = event.replyToken;

    // 2. Find Member
    let memberName = 'Unknown';
    let isMemberFound = false;
    let memberId = '';
    const memberSnapshot = await db.collection('members')
      .where('contact.lineUserId', '==', lineUserId)
      .limit(1)
      .get();

    if (!memberSnapshot.empty) {
        const doc = memberSnapshot.docs[0];
        memberName = doc.data().name;
        memberId = doc.id;
        isMemberFound = true;
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

    // 4. Auto-Reply Logic
    if (replyToken) {
      // 綁定引導邏輯：若未找到會員且不是特定指令，提示綁定
      if (!isMemberFound && content !== '指令' && content !== '幫助' && content.toLowerCase() !== 'help' && content.toLowerCase() !== 'ping') {
         const registerUrl = `https://liff.line.me/2006830768-D9X5j04x/register?lineId=${lineUserId}`;
         const flexMessage: line.FlexMessage = {
             type: 'flex',
             altText: '請先進行會員綁定',
             contents: {
                 type: 'bubble',
                 body: {
                     type: 'box',
                     layout: 'vertical',
                     contents: [
                         {
                             type: 'text',
                             text: '尚未綁定會員',
                             weight: 'bold',
                             size: 'xl'
                         },
                         {
                             type: 'text',
                             text: '我們找不到您的會員資料。請點選下方按鈕進行註冊或綁定。',
                             wrap: true,
                             margin: 'md'
                         }
                     ]
                 },
                 footer: {
                     type: 'box',
                     layout: 'vertical',
                     contents: [
                         {
                             type: 'button',
                             action: {
                                 type: 'uri',
                                 label: '立即註冊/綁定',
                                 uri: registerUrl
                             },
                             style: 'primary'
                         }
                     ]
                 }
             }
         };
         await replyMessage(replyToken, [flexMessage]);
         return Promise.resolve(null);
      }

      if (content.toLowerCase() === 'help' || content === '指令' || content === '幫助') {
        await replyMessage(replyToken, [{
          type: 'text',
          text: '您好！我是北大獅子會小幫手。目前支援的指令如下：\n\n- 「指令」：顯示此列表\n- 「我的報名」：查詢近期已報名的活動\n- 「報名」：查看近期活動 (開發中)'
        }]);
      } else if (content.toLowerCase() === 'ping') {
        await replyMessage(replyToken, [{ type: 'text', text: 'pong' }]);
      } else if (content === '我的報名' && isMemberFound) {
        // Query registrations
        const registrationsSnapshot = await db.collection('registrations')
            .where('info.memberId', '==', memberId)
            // Ideally we filter by event date, but registrations don't store event date directly usually, or we join.
            // Based on schema, registrations have info.timestamp (registration time).
            // To show "upcoming" events, we need to fetch event details.
            .orderBy('info.timestamp', 'desc')
            .limit(5)
            .get();

        if (registrationsSnapshot.empty) {
             const flexMessage: line.FlexMessage = {
                 type: 'flex',
                 altText: '尚無報名紀錄',
                 contents: {
                     type: 'bubble',
                     body: {
                         type: 'box',
                         layout: 'vertical',
                         contents: [
                             {
                                 type: 'text',
                                 text: '尚無報名紀錄',
                                 weight: 'bold',
                                 size: 'xl',
                                 color: '#666666'
                             },
                             {
                                 type: 'text',
                                 text: '您目前沒有即將參加的活動，快去『近期活動』看看吧！',
                                 wrap: true,
                                 margin: 'md',
                                 color: '#666666'
                             }
                         ]
                     },
                     footer: {
                         type: 'box',
                         layout: 'vertical',
                         contents: [
                             {
                                 type: 'button',
                                 style: 'primary',
                                 action: {
                                     type: 'uri',
                                     label: '查看近期活動',
                                     uri: 'https://liff.line.me/2006830768-D9X5j04x/'
                                 }
                             }
                         ]
                     }
                 }
             };
            await replyMessage(replyToken, [flexMessage]);
            return Promise.resolve(null);
        }

        const registrationList: any[] = [];
        for (const doc of registrationsSnapshot.docs) {
            const reg = doc.data() as Registration;
            // Fetch event details
            const eventDoc = await db.collection('events').doc(reg.info.eventId).get();
            if (eventDoc.exists) {
                const event = eventDoc.data() as Event;
                const eventDate = (event.time.date as any).toDate();
                if (eventDate >= new Date()) { // Only show future events? Or all? Let's show future + recent.
                     registrationList.push({
                         eventName: event.name,
                         date: eventDate.toLocaleDateString('zh-TW'),
                         status: reg.status.status
                     });
                }
            }
        }

        if (registrationList.length === 0) {
            await replyMessage(replyToken, [{ type: 'text', text: '您目前沒有即將到來的活動報名。' }]);
        } else {
            const flexContents: line.FlexComponent[] = registrationList.map(item => ({
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                contents: [
                    {
                        type: 'text',
                        text: item.eventName,
                        weight: 'bold',
                        size: 'md'
                    },
                    {
                        type: 'box',
                        layout: 'baseline',
                        contents: [
                            {
                                type: 'text',
                                text: item.date,
                                size: 'sm',
                                color: '#666666',
                                flex: 2
                            },
                            {
                                type: 'text',
                                text: item.status === 'registered' ? '已報名' : (item.status === 'waitlist' ? '候補中' : item.status),
                                size: 'sm',
                                color: item.status === 'registered' ? '#00B900' : '#FF0000',
                                align: 'end',
                                flex: 1
                            }
                        ]
                    }
                ]
            }));

            const flexMessage: line.FlexMessage = {
                type: 'flex',
                altText: '您的報名紀錄',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '📋 我的報名紀錄',
                                weight: 'bold',
                                color: '#1DB446',
                                size: 'lg'
                            }
                        ]
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: flexContents
                    }
                }
            };
            await replyMessage(replyToken, [flexMessage]);
        }
      }
    }

    return Promise.resolve(null);
  }

  // Handle Follow Event
  if (event.type === 'follow') {
    const replyToken = event.replyToken;
    if (replyToken) {
       await replyMessage(replyToken, [{
         type: 'text',
         text: '歡迎加入北大獅子會官方帳號！\n請輸入「指令」查看可用功能，或點選下方選單進行會員綁定。'
       }]);
    }
    return Promise.resolve(null);
  }

  return Promise.resolve(null);
}
