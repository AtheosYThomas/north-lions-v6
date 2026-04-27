import * as admin from 'firebase-admin';
import * as https from 'https';
import * as line from '@line/bot-sdk';
import { replyMessage } from '../line';
import { resolveMemberProfileByLineUserId } from './memberProfile';

type LogDetailedError = (context: string, error: unknown, extra?: Record<string, unknown>) => void;

type HandleImageReceiptEventInput = {
  db: admin.firestore.Firestore;
  event: line.MessageEvent;
  fetchEventsByIds: (db: admin.firestore.Firestore, eventIds: string[]) => Promise<Map<string, any>>;
  logDetailedError: LogDetailedError;
};

type HandleBindReceiptPostbackInput = {
  db: admin.firestore.Firestore;
  event: line.PostbackEvent;
  logDetailedError: LogDetailedError;
};

export async function handleImageReceiptEvent(input: HandleImageReceiptEventInput): Promise<boolean> {
  const { db, event, fetchEventsByIds } = input;
  if (event.message.type !== 'image') return false;
  if (event.source.type !== 'user') return false;

  const lineUserId = event.source.userId;
  const messageId = event.message.id;
  const replyToken = event.replyToken;
  if (!lineUserId) return true;

  const memberProfile = await resolveMemberProfileByLineUserId(db, lineUserId);
  if (!memberProfile.found) {
    if (replyToken) await replyMessage(replyToken, [{ type: 'text', text: '您尚未綁定會員，無法使用截圖上傳功能。' }]);
    return true;
  }

  const memberId = memberProfile.memberId;
  const memberName = memberProfile.memberName;

  const paidEventsSnap = await db.collection('events').where('details.isPaidEvent', '==', true).get();
  const paidEventIds = new Set(paidEventsSnap.docs.map((d) => d.id));
  const regsSnap = await db.collection('registrations')
    .where('info.memberId', '==', memberId)
    .where('status.paymentStatus', '==', '未繳費')
    .get();
  const unpaidRegs = regsSnap.docs.filter((d) => paidEventIds.has(d.data().info.eventId));

  const billsSnap = await db.collection('billing_records').where('memberId', '==', memberId).get();
  const pendingBills = billsSnap.docs.filter((d) => d.data().status?.status !== 'approved');

  // Edge case: ordinary photos (not receipts) should not enter receipt-binding flow.
  if (unpaidRegs.length === 0 && pendingBills.length === 0) {
    if (replyToken) {
      await replyMessage(replyToken, [{
        type: 'text',
        text: `${memberName} 您好！目前查無待繳費訂單，這張照片先不會進入繳費綁定流程。\n若您是上傳一般照片，可忽略此訊息；若要上傳繳費憑證，請先確認有未繳費活動或帳單。`
      }]);
    }
    return true;
  }

  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  try {
    const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
      const req2 = https.get({
        hostname: 'api-data.line.me',
        path: `/v2/bot/message/${messageId}/content`,
        headers: { Authorization: `Bearer ${accessToken}` }
      }, (imgRes) => {
        const chunks: Buffer[] = [];
        imgRes.on('data', (c: Buffer) => chunks.push(c));
        imgRes.on('end', () => resolve(Buffer.concat(chunks)));
        imgRes.on('error', reject);
      });
      req2.on('error', reject);
    });
    const tempPath = `temp_receipts/${lineUserId}/${messageId}.jpg`;
    await admin.storage().bucket().file(tempPath).save(imageBuffer, {
      metadata: { contentType: 'image/jpeg' }
    });
  } catch {
    if (replyToken) await replyMessage(replyToken, [{ type: 'text', text: '圖片儲存失敗，請稍後再試。' }]);
    return true;
  }

  const flexBubbles: any[] = [];
  if (pendingBills.length > 0) {
    const V7_URL = process.env.VITE_LIFF_URL
      ? process.env.VITE_LIFF_URL.trim().replace(/\/login\/?$/, '')
      : 'https://north-lions-v6-a7757.web.app';
    flexBubbles.push({
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '⭐ 偵測到專屬會費帳單', weight: 'bold', size: 'md', color: '#ff4444', wrap: true },
          { type: 'text', text: '您有尚未結清的年度/職務帳單。\n為確保金流核算，大型會費必須至私人面板專屬上傳。', size: 'sm', color: '#555555', margin: 'md', wrap: true }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'button',
          style: 'primary',
          color: '#B91C1C',
          action: { type: 'uri', label: '前往私人帳單面板上傳', uri: `${V7_URL}/billing` }
        }]
      }
    });
  }

  const unpaidEventIds = unpaidRegs.map((regDoc) => String((regDoc.data() as any)?.info?.eventId || ''));
  const unpaidEventsMap = await fetchEventsByIds(db, unpaidEventIds);
  const regBubbles = await Promise.all(unpaidRegs.map(async (regDoc) => {
    const rData = regDoc.data() as any;
    const evData = unpaidEventsMap.get(rData.info.eventId) as any;
    const total = (evData?.details?.cost || 0) * (rData?.details?.adultCount || 1);
    return {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: evData?.name || '活動', weight: 'bold', size: 'md', wrap: true },
          { type: 'text', text: `費用：NT$ ${total.toLocaleString()}`, size: 'sm', color: '#555555', margin: 'md' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'button',
          style: 'primary',
          color: '#4F46E5',
          action: {
            type: 'postback',
            label: '綁定此訂單',
            data: `action=bind_receipt&regId=${regDoc.id}&msgId=${messageId}&uid=${lineUserId}`
          }
        }]
      }
    };
  }));
  flexBubbles.push(...regBubbles);

  if (replyToken) {
    await replyMessage(replyToken, [
      { type: 'text', text: `${memberName} 您好！收到繳費截圖 📷\n請選擇要綁定的訂單：` },
      { type: 'flex', altText: '請選擇要綁定的活動訂單', contents: { type: 'carousel', contents: flexBubbles } } as any
    ]);
  }
  return true;
}

export async function handleBindReceiptPostback(input: HandleBindReceiptPostbackInput): Promise<boolean> {
  const { db, event, logDetailedError } = input;
  const data = event.postback.data;
  const params = new URLSearchParams(data);
  const action = params.get('action');
  if (action !== 'bind_receipt') return false;

  const regId = params.get('regId') || '';
  const msgId = params.get('msgId') || '';
  const uid = params.get('uid') || event.source.userId || '';
  const replyToken = event.replyToken;
  if (!regId || !msgId || !uid) return true;

  try {
    const bucket = admin.storage().bucket();
    const tempPath = `temp_receipts/${uid}/${msgId}.jpg`;
    const [tempExists] = await bucket.file(tempPath).exists();
    if (!tempExists) {
      if (replyToken) await replyMessage(replyToken, [{ type: 'text', text: '此截圖已經處理過，請勿重複點擊。' }]);
      return true;
    }

    const [imageBuffer] = await bucket.file(tempPath).download();
    const permPath = `receipts/${Date.now()}_${regId.substring(0, 8)}.jpg`;
    await bucket.file(permPath).save(imageBuffer, {
      metadata: { contentType: 'image/jpeg', metadata: { regId, lineUserId: uid } }
    });
    const screenshotUrl =
      `https://firebasestorage.googleapis.com/v0/b/${admin.storage().bucket().name}/o/${encodeURIComponent(permPath)}?alt=media`;

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
        text: '👍 截圖已成功綁定！\nAI 正在辨識中，結果將在數秒內推播給您。'
      }]);
    }
  } catch (err: any) {
    logDetailedError('bind_receipt error', err, { userId: event.source.userId, regId });
    if (replyToken) {
      await replyMessage(replyToken, [{ type: 'text', text: '❌ 處理失敗，請稍後再試或聯繫財務人員。' }]);
    }
  }
  return true;
}
