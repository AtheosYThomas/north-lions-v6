import axios from 'axios';
import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';

// 確保本地測試環境有讀取 .env
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  dotenv.config({ path: '.env.local' });
}

const getLineChannelAccessToken = () =>
  process.env.LINE_CHANNEL_ACCESS_TOKEN ||
  process.env.CHANNEL_ACCESS_TOKEN ||
  '';

const createClient = (token: string) =>
  axios.create({
    baseURL: 'https://api.line.me/v2/bot',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

export interface LineMessage {
  type: string;
  text?: string;
  [key: string]: any;
}

export const replyMessage = async (replyToken: string, messages: LineMessage[]) => {
  const token = getLineChannelAccessToken();
  if (!token) return;
  try {
    await createClient(token).post('/message/reply', { replyToken, messages });
  } catch (error: any) {
    console.error('Error replying message:', error.response?.data || error.message);
  }
};

export const pushMessage = async (to: string, messages: LineMessage[]) => {
  const token = getLineChannelAccessToken();
  if (!token) return;
  try {
    await createClient(token).post('/message/push', { to, messages });
  } catch (error: any) {
    console.error('Error pushing message:', error.response?.data || error.message);
  }
};

export const startLoadingIndicator = async (chatId: string, loadingSeconds = 8) => {
  const token = getLineChannelAccessToken();
  if (!token || !chatId) return;
  try {
    await createClient(token).post('/chat/loading/start', {
      chatId,
      loadingSeconds
    });
  } catch (error: any) {
    console.error('Error starting loading indicator:', error.response?.data || error.message);
  }
};

export const broadcastMessage = async (messages: LineMessage[], filterPending: boolean = true) => {
  const token = getLineChannelAccessToken();
  if (!token) return;

  if (filterPending) {
    try {
      if (!admin.apps.length) admin.initializeApp();
      const db = admin.firestore();
      // Fetch members and filter out pending
      const membersSnap = await db.collection("members").get();

      const userIds = new Set<string>();
      membersSnap.forEach(doc => {
        const data = doc.data();
        if (data.status?.membershipType === '潛在') return;
        if (data.status?.activeStatus === 'inactive') return;
        if (data.contact && data.contact.lineUserId && data.system?.pushConsent !== false) {
          userIds.add(data.contact.lineUserId);
        }
      });

      const targets = Array.from(userIds);
      if (targets.length === 0) return;
      
      // Multicast max is 500 ids per request
      const chunks = [];
      for (let i = 0; i < targets.length; i += 500) {
        chunks.push(targets.slice(i, i + 500));
      }
      
      const client = createClient(token);
      await Promise.all(chunks.map(chunk => 
        client.post('/message/multicast', { to: chunk, messages })
      ));
    } catch (error: any) {
      console.error('Error in filtered broadcast (multicast):', error.response?.data || error.message);
    }
  } else {
    try {
      await createClient(token).post('/message/broadcast', { messages });
    } catch (error: any) {
      console.error('Error broadcasting message:', error.response?.data || error.message);
    }
  }
};
