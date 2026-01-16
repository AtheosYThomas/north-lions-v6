
import axios from 'axios';
import * as dotenv from 'dotenv';

if (process.env.FUNCTIONS_EMULATOR === 'true') {
  dotenv.config({ path: '.env.dev' });
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

export const pushMessage = async (to: string, messages: LineMessage[]) => {
  const token = getLineChannelAccessToken();
  if (!token) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping push message.');
    return;
  }
  try {
    await createClient(token).post('/message/push', {
      to,
      messages
    });
  } catch (error: any) {
    console.error('Error pushing message:', error.response?.data || error.message);
    // Don't throw, just log, so we don't break the calling function logic
  }
};

export const multicastMessage = async (to: string[], messages: LineMessage[]) => {
  const token = getLineChannelAccessToken();
  if (!token) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping multicast message.');
    return;
  }
  try {
    await createClient(token).post('/message/multicast', {
      to,
      messages
    });
  } catch (error: any) {
    console.error('Error multicasting message:', error.response?.data || error.message);
  }
};

export const broadcastMessage = async (messages: LineMessage[]) => {
  const token = getLineChannelAccessToken();
  if (!token) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping broadcast.');
    return;
  }
  try {
    await createClient(token).post('/message/broadcast', {
      messages
    });
  } catch (error: any) {
    console.error('Error broadcasting message:', error.response?.data || error.message);
  }
};

export const replyMessage = async (replyToken: string, messages: LineMessage[]) => {
  const token = getLineChannelAccessToken();
  if (!token) {
        console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping reply.');
        return;
    }
    try {
    await createClient(token).post('/message/reply', {
            replyToken,
            messages
        });
    } catch (error: any) {
        console.error('Error replying message:', error.response?.data || error.message);
    }
};
