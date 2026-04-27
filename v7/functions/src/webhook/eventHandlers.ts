import * as admin from 'firebase-admin';
import * as line from '@line/bot-sdk';
import * as logger from 'firebase-functions/logger';
import { replyMessage } from '../line';

type LogDetailedError = (context: string, error: unknown, extra?: Record<string, unknown>) => void;

export async function handleFollowEvent(input: {
  db: admin.firestore.Firestore;
  event: line.FollowEvent;
  logDetailedError: LogDetailedError;
}): Promise<boolean> {
  const { db, event, logDetailedError } = input;
  const lineUserId = event.source.type === 'user' ? event.source.userId : '';
  const replyToken = event.replyToken;

  try {
    if (lineUserId) {
      const memberSnap = await db.collection('members')
        .where('contact.lineUserId', '==', lineUserId)
        .limit(1)
        .get();

      if (!memberSnap.empty) {
        const memberRef = memberSnap.docs[0].ref;
        // Upsert behavior for unblock -> follow scenario.
        await memberRef.set({
          status: {
            activeStatus: 'active'
          },
          system: {
            accountStatus: 'active'
          },
          contact: {
            lineUserId
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }
  } catch (err) {
    logDetailedError('follow upsert error', err, { lineUserId });
  }

  if (replyToken) {
    const registerUrl = process.env.VITE_LIFF_URL ? process.env.VITE_LIFF_URL.trim() : 'https://north-lions-v6-a7757.web.app';
    await replyMessage(replyToken, [{
      type: 'text',
      text: `歡迎加入北大獅子會官方帳號！🦁\n\n為了提供您專屬的會員服務與活動報名功能，請點擊下方連結完成「會員綁定與註冊」：\n${registerUrl}\n\n完成後，您就可以隨時點擊選單或輸入「指令」來呼叫小幫手囉！`
    }]);
  }
  return true;
}

export async function handleGeneralPostbackEvent(input: {
  event: line.PostbackEvent;
}): Promise<boolean> {
  const { event } = input;
  const data = event.postback.data || '';
  const params = new URLSearchParams(data);
  const action = params.get('action') || data;

  // Keep switch(action) for easy future extension.
  switch (action) {
    case 'menu1':
    case 'action=menu1':
      logger.log('menu1');
      return true;
    case 'menu2':
    case 'action=menu2':
      logger.log('menu2');
      return true;
    default:
      logger.log('Unhandled postback:', data);
      return false;
  }
}
