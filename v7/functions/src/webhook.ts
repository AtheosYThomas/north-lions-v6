import { onRequest } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { getFunctions } from 'firebase-admin/functions';
import * as admin from 'firebase-admin';
import * as line from '@line/bot-sdk';
import { replyMessage, startLoadingIndicator } from './line';
import * as dotenv from 'dotenv';
import * as logger from 'firebase-functions/logger';
import { handleTextCommand } from './webhook/commands';
import { resolveMemberProfileByLineUserId } from './webhook/memberProfile';
import { generateAiResponse } from './webhook/aiResponder';
import { handleBindReceiptPostback, handleImageReceiptEvent } from './webhook/paymentReceiptHandler';
import { handleFollowEvent, handleGeneralPostbackEvent } from './webhook/eventHandlers';
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  dotenv.config({ path: '.env.local' });
}

// 每次呼叫時取得 db
const getDb = () => admin.firestore();

type ChatRole = 'user' | 'assistant';
type ChatCategory = 'bug' | 'suggestion' | 'general';
const EVENT_DEDUP_WINDOW_MS = 1000 * 60 * 60 * 24;

function logDetailedError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const err = error as Error;
  logger.error(context, {
    message: err?.message || String(error),
    stack: err?.stack || 'no-stack',
    ...(extra || {})
  });
}

function detectMessageCategory(text: string): ChatCategory {
  const normalized = String(text || '').toLowerCase();
  if (/(壞掉|錯誤|bug|沒反應|有問題)/i.test(normalized)) return 'bug';
  if (/(建議|希望|可以加|能不能)/i.test(normalized)) return 'suggestion';
  return 'general';
}

async function writeChatLog(
  db: admin.firestore.Firestore,
  payload: {
    lineUserId: string;
    memberId?: string;
    text: string;
    role: ChatRole;
    category: ChatCategory;
    memberName?: string;
  }
) {
  await db.collection('message_logs').add({
    lineUserId: payload.lineUserId,
    memberId: payload.memberId || '',
    text: payload.text,
    content: payload.text, // backward compatibility
    role: payload.role,
    category: payload.category,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    memberName: payload.memberName || '',
    status: 'logged'
  });
}

function buildMembersDirectoryFlex(total: number): line.FlexMessage {
  return {
    type: 'flex',
    altText: '北大獅子會 V7 會員名冊',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#4F46E5',
        paddingAll: 'lg',
        contents: [
          {
            type: 'text',
            text: '北大獅子會 V7 會員名冊',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'md',
            wrap: true
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: `目前符合查詢共 ${total} 人`,
            size: 'sm',
            color: '#374151',
            wrap: true
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
            color: '#4F46E5',
            action: {
              type: 'uri',
              label: '點此開啟名冊',
              uri: 'https://liff.line.me/2007739371-aKePV20l/members'
            }
          }
        ]
      }
    } as any
  };
}

function buildUnboundMemberFlex(registerUrl: string): line.FlexMessage {
  return {
    type: 'flex',
    altText: '需要綁定獅友身分',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#4F46E5',
        paddingAll: 'lg',
        contents: [
          {
            type: 'text',
            text: '需要綁定獅友身分',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'md',
            wrap: true
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '為了保護會員隱私與系統安全，請先完成身分綁定。',
            size: 'sm',
            color: '#374151',
            wrap: true
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#4F46E5',
            action: {
              type: 'uri',
              label: '立即綁定',
              uri: registerUrl
            }
          },
          {
            type: 'text',
            text: '綁定完成後，即可解鎖完整功能。',
            size: 'xs',
            color: '#6B7280',
            wrap: true,
            align: 'center'
          }
        ]
      }
    } as any
  };
}

function buildActionableErrorMessage(): line.TextMessage {
  return {
    type: 'text',
    text: '系統稍有延遲，請稍後再試。',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '重新嘗試',
            text: 'ping'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '聯絡幹部',
            text: '聯絡幹部'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '查看常見問題',
            text: '查看常見問題'
          }
        }
      ]
    }
  } as line.TextMessage;
}

function buildEventDedupKey(event: line.WebhookEvent): string {
  const anyEvent = event as any;
  const webhookEventId = String(anyEvent?.webhookEventId || '').trim();
  if (webhookEventId) return `line:${webhookEventId}`;
  const sourceUserId = String(anyEvent?.source?.userId || '');
  const replyToken = String(anyEvent?.replyToken || '');
  const messageId = String(anyEvent?.message?.id || '');
  const timestamp = String(anyEvent?.timestamp || '');
  const eventType = String(anyEvent?.type || '');
  return `line:fallback:${eventType}:${sourceUserId}:${replyToken}:${messageId}:${timestamp}`;
}

async function acquireEventDedupLock(
  db: admin.firestore.Firestore,
  event: line.WebhookEvent
): Promise<boolean> {
  const dedupKey = buildEventDedupKey(event);
  const lockRef = db.collection('webhook_event_locks').doc(dedupKey);
  const now = Date.now();
  const expiresAt = now + EVENT_DEDUP_WINDOW_MS;

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(lockRef);
      if (snap.exists) {
        const expiresMs = Number(snap.get('expiresAt') || 0);
        if (expiresMs > now) {
          throw new Error('duplicate-event');
        }
      }

      tx.set(lockRef, {
        dedupKey,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt
      }, { merge: false });
    });
    return true;
  } catch (err: any) {
    if (String(err?.message || '') === 'duplicate-event') {
      return false;
    }
    throw err;
  }
}

async function fetchEventsByIds(
  db: admin.firestore.Firestore,
  eventIds: string[]
): Promise<Map<string, any>> {
  const result = new Map<string, any>();
  const uniqueIds = Array.from(new Set(eventIds.filter(Boolean)));
  if (uniqueIds.length === 0) return result;

  // Firestore documentId in-query supports max 10 ids per batch.
  const chunkSize = 10;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const snap = await db.collection('events')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    snap.docs.forEach((doc) => result.set(doc.id, doc.data()));
  }
  return result;
}

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
    res.status(200).send('OK');
  } catch (err) {
    logger.error('Enqueue error:', err);
    // 回 500 讓 LINE webhook 觸發重送，避免事件遺失
    res.status(500).send('Queue unavailable');
  }
});

// Cloud Task Worker，處理 LINE 事件
export const processLineEvent = onTaskDispatched({
  retryConfig: { maxAttempts: 3 },
  rateLimits: { maxConcurrentDispatches: 20 }
}, async (req) => {
  const db = getDb();
  const event = req.data.event as line.WebhookEvent;
  if (!event) return;
  const accepted = await acquireEventDedupLock(db, event);
  if (!accepted) {
    logger.info('Duplicate LINE event skipped', { dedupKey: buildEventDedupKey(event) });
    return;
  }
  await handleEvent(event, db);
});

async function handleEvent(event: line.WebhookEvent, db: admin.firestore.Firestore) {
  try {
    const eventKey = getEventDispatchKey(event);
    const handlers: Record<string, () => Promise<void>> = {
      'message:text': async () => handleTextMessageEvent(
        event as line.MessageEvent & { message: line.TextEventMessage },
        db
      ),
      'message:image': async () => handleImageMessageEvent(event as line.MessageEvent, db),
      'postback': async () => handlePostbackEvent(event as line.PostbackEvent, db),
      'follow': async () => handleFollowEventEntry(event as line.FollowEvent, db)
    };

    const handler = handlers[eventKey];
    if (!handler) {
      handleUnknownEvent(event);
      return;
    }

    await handler();
  } catch (error) {
    const replyToken = (event as any)?.replyToken as string | undefined;
    logDetailedError('Unhandled webhook event error', error, {
      eventType: (event as any)?.type,
      sourceType: (event as any)?.source?.type,
      userId: (event as any)?.source?.userId
    });
    if (replyToken) {
      await replyMessage(replyToken, [buildActionableErrorMessage()]);
    }
  }
}

function getEventDispatchKey(event: line.WebhookEvent): string {
  if (event.type === 'message') {
    return `message:${event.message.type}`;
  }
  return event.type;
}

function handleUnknownEvent(event: line.WebhookEvent): void {
  logger.debug('Ignored unsupported LINE event', {
    eventType: event.type,
    sourceType: (event as any)?.source?.type,
    messageType: (event as any)?.message?.type
  });
}

async function handleTextMessageEvent(
  event: line.MessageEvent & { message: line.TextEventMessage },
  db: admin.firestore.Firestore
): Promise<void> {
    const lineUserId = event.source.userId;
    const replyToken = event.replyToken;
    const content = event.message.text.trim();
    
    if (!lineUserId) return;

    // 1. 識別會員
    const memberProfile = await resolveMemberProfileByLineUserId(db, lineUserId);
    const memberName = memberProfile.memberName;
    const isMemberFound = memberProfile.found;
    const userCategory = detectMessageCategory(content);

    // 2. 記錄訊息
    await writeChatLog(db, {
      lineUserId,
      memberId: memberProfile.memberId,
      text: content,
      role: 'user',
      category: userCategory,
      memberName
    });

    // 3. 處理指令
    if (replyToken) {
      if (!isMemberFound) {
         const registerUrl = process.env.VITE_LIFF_URL ? process.env.VITE_LIFF_URL.trim() : 'https://north-lions-v6-a7757.web.app';
         await replyMessage(replyToken, [buildUnboundMemberFlex(registerUrl)]);
         return;
      }

      const handledByCommand = await handleTextCommand({
        db,
        event: event as line.MessageEvent,
        content,
        lineUserId,
        replyToken,
        memberProfile,
        fetchEventsByIds,
        logDetailedError
      });
      if (handledByCommand) return;

      if (event.source.type === 'user') {
        await startLoadingIndicator(lineUserId, 8);
        const aiResult = await generateAiResponse({
          db,
          userText: content,
          lineUserId,
          memberProfile,
          logDetailedError,
          maxTurns: 5
        });

        if (aiResult.usedMembersDirectoryTool && memberProfile.isAdmin) {
          await replyMessage(replyToken, [
            { type: 'text', text: aiResult.aiText },
            buildMembersDirectoryFlex(aiResult.membersDirectoryTotal)
          ]);
          await writeChatLog(db, {
            lineUserId,
            memberId: memberProfile.memberId,
            text: `${aiResult.aiText}[Flex Message]`,
            role: 'assistant',
            category: userCategory,
            memberName
          });
          return;
        }

        await replyMessage(replyToken, [{ type: 'text', text: aiResult.aiText }]);
        await writeChatLog(db, {
          lineUserId,
          memberId: memberProfile.memberId,
          text: aiResult.aiText,
          role: 'assistant',
          category: userCategory,
          memberName
        });
      }
    }
}

async function handleImageMessageEvent(event: line.MessageEvent, db: admin.firestore.Firestore): Promise<void> {
  await handleImageReceiptEvent({
    db,
    event,
    fetchEventsByIds,
    logDetailedError
  });
}

async function handlePostbackEvent(event: line.PostbackEvent, db: admin.firestore.Firestore): Promise<void> {
  const data = event.postback.data;
  const params = new URLSearchParams(data);
  const action = params.get('action');
  logger.log(`[LINE Postback] userId: ${event.source.userId}, data: ${data}`);

  if (action === 'bind_receipt') {
    await handleBindReceiptPostback({
      db,
      event,
      logDetailedError
    });
    return;
  }

  await handleGeneralPostbackEvent({ event });
}

async function handleFollowEventEntry(event: line.FollowEvent, db: admin.firestore.Firestore): Promise<void> {
  await handleFollowEvent({
    db,
    event,
    logDetailedError
  });
}

