import * as line from '@line/bot-sdk';
import * as admin from 'firebase-admin';
import { replyMessage } from '../line';
import { MemberAuthProfile } from './memberProfile';

type LogDetailedError = (context: string, error: unknown, extra?: Record<string, unknown>) => void;

type HandleTextCommandInput = {
  db: admin.firestore.Firestore;
  event: line.MessageEvent;
  content: string;
  lineUserId: string;
  replyToken: string;
  memberProfile: MemberAuthProfile;
  fetchEventsByIds: (db: admin.firestore.Firestore, eventIds: string[]) => Promise<Map<string, any>>;
  logDetailedError: LogDetailedError;
};

export async function handleTextCommand(input: HandleTextCommandInput): Promise<boolean> {
  const { db, event, content, lineUserId, replyToken, memberProfile, fetchEventsByIds, logDetailedError } = input;
  const memberName = memberProfile.memberName;
  const normalizedContent = content.trim().toLowerCase();

  // Fast-path health check command. We return immediately and never invoke AI.
  if (normalizedContent === 'ping') {
    const eventTimestamp = Number((event as any)?.timestamp || 0);
    const latencyMs = eventTimestamp > 0 ? Math.max(0, Date.now() - eventTimestamp) : null;
    const latencyText = latencyMs === null ? 'N/A' : `${latencyMs}ms`;
    await replyMessage(replyToken, [{
      type: 'text',
      text: `🟢 V7 系統運作正常\n連線延遲：${latencyText}\n智慧助理隨時為您服務！`
    }]);
    return true;
  }

  if (content === '測試') {
    await replyMessage(replyToken, [{ type: 'text', text: `V7 系統 Webhook 運作正常！userId 為 ${lineUserId}` }]);
    return true;
  }

  if (content === '我的資料') {
    try {
      const displayName = memberProfile.memberData?.name || memberName || 'Unknown';
      const role = memberProfile.memberData?.organization?.role || '一般會員';
      await replyMessage(replyToken, [{
        type: 'text',
        text: `👤 [個人資料]\n姓名：${displayName}\n身份：${role}\n資料查詢完成✅`
      }]);
    } catch (err) {
      logDetailedError('Error fetching member stats', err, { lineUserId });
      await replyMessage(replyToken, [{ type: 'text', text: '資料查詢失敗，請稍後再試。' }]);
    }
    return true;
  }

  if (content === '最新活動查詢') {
    try {
      const eventsSnap = await db.collection('events').orderBy('time.date', 'desc').limit(3).get();
      if (eventsSnap.empty) {
        await replyMessage(replyToken, [{ type: 'text', text: '目前沒有活動資訊。' }]);
        return true;
      }

      let msg = '📋 [最新活動]\n';
      eventsSnap.docs.forEach((doc, idx) => {
        const data = doc.data();
        msg += `${idx + 1}. ${data.name} (${data.time?.date || '日期未定'})\n`;
      });
      await replyMessage(replyToken, [{ type: 'text', text: msg.trim() }]);
    } catch (err) {
      logDetailedError('Error fetching events', err, { lineUserId });
      await replyMessage(replyToken, [{ type: 'text', text: '活動查詢失敗，請稍後再試。' }]);
    }
    return true;
  }

  if (content === '最新公告') {
    try {
      const annSnap = await db.collection('announcements').orderBy('date', 'desc').limit(5).get();
      if (annSnap.empty) {
        await replyMessage(replyToken, [{ type: 'text', text: '目前沒有最新公告。' }]);
        return true;
      }

      let msg = '📢 [最新公告]\n';
      let idx = 0;
      for (const doc of annSnap.docs) {
        const data = doc.data();
        if (data.status?.status !== 'published') continue;
        const dateStr = data.date?.toDate ? data.date.toDate().toLocaleDateString('zh-TW') : '日期';
        msg += `${idx + 1}. ${data.title} (${dateStr})\n`;
        idx++;
        if (idx >= 3) break;
      }
      if (idx === 0) msg += '目前暫無已發布的公告。';
      await replyMessage(replyToken, [{ type: 'text', text: msg.trim() }]);
    } catch (err) {
      logDetailedError('Error fetching announcements', err, { lineUserId });
      await replyMessage(replyToken, [{ type: 'text', text: '公告查詢失敗，請稍後再試。' }]);
    }
    return true;
  }

  if (['help', '幫助', '指令'].includes(normalizedContent)) {
    await replyMessage(replyToken, [{
      type: 'text',
      text: '🦁 北大獅子會 V7 可用指令：\n- 最新公告：查詢最新公告\n- 最新活動查詢：查看近期活動\n- 我的資料：查詢個人資料\n- 我的報名：查詢活動報名狀態'
    }]);
    return true;
  }

  if (content === '我的報名') {
    try {
      const regSnap = await db.collection('registrations')
        .where('info.memberId', '==', memberProfile.memberId)
        .where('status.status', '==', '已報名')
        .get();

      if (regSnap.empty) {
        await replyMessage(replyToken, [{ type: 'text', text: `嗨 ${memberName}！\n\n目前沒有進行中的報名紀錄。\n\n如需報名活動，請點擊選單前往網頁端報名哦！` }]);
        return true;
      }

      let message = `嗨 ${memberName}！\n\n您目前有 ${regSnap.size} 個進行中的報名：\n`;
      let index = 1;
      const eventIds = regSnap.docs.map((doc) => String((doc.data() as any)?.info?.eventId || ''));
      const eventsMap = await fetchEventsByIds(db, eventIds);
      for (const doc of regSnap.docs) {
        const regData = doc.data() as any;
        const eventId = regData.info.eventId;
        const evt = eventsMap.get(eventId);
        if (!evt) continue;
        message += `\n📌 ${index}. ${evt.name}\n   📅 日期：${evt.time?.date || '未定'}\n   📍 地點：${evt.details?.location || '未定'}\n   👥 報名人數：${regData.details?.adultCount} 大人 / ${regData.details?.childCount} 小孩\n`;
        index++;
      }

      await replyMessage(replyToken, [{ type: 'text', text: message.trim() }]);
    } catch (error) {
      logDetailedError('Error fetching registrations', error, { lineUserId });
      await replyMessage(replyToken, [{ type: 'text', text: '報名查詢失敗，請稍後再試。' }]);
    }
    return true;
  }

  if (['繳費', '帳單', '我的帳單', '會費'].includes(content)) {
    try {
      const campsSnap = await db.collection('billing_campaigns').where('isPublished', '==', true).get();
      if (campsSnap.empty) {
        await replyMessage(replyToken, [{ type: 'text', text: `嗨 ${memberName}！\n\n目前系統中沒有需要繳費的帳單。` }]);
        return true;
      }

      const validCampMap = new Map<string, any>();
      campsSnap.docs.forEach((d) => validCampMap.set(d.id, d.data()));
      const billsSnap = await db.collection('billing_records').where('memberId', '==', memberProfile.memberId).get();
      const pendingBills = billsSnap.docs
        .map((d) => Object.assign({ id: d.id }, d.data() as any))
        .filter((d) => validCampMap.has(d.campaignId) && d.status?.status !== 'approved');

      if (pendingBills.length === 0) {
        await replyMessage(replyToken, [{ type: 'text', text: `嗨 ${memberName}！\n\n您目前無待繳納的專屬帳單或會費。` }]);
        return true;
      }

      const V7_URL = process.env.VITE_LIFF_URL
        ? process.env.VITE_LIFF_URL.trim().replace(/\/login\/?$/, '')
        : 'https://north-lions-v6-a7757.web.app';
      const flexBubbles = pendingBills.map((bill) => {
        const cmp = validCampMap.get(bill.campaignId);
        const expected = bill.billing?.expectedAmount || 0;
        const paid = bill.payment?.totalPaidAmount || 0;
        const remaining = expected - paid;
        return {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: cmp?.name || '專屬帳單', weight: 'bold', size: 'md', wrap: true },
              { type: 'text', text: `應繳總額：NT$ ${expected.toLocaleString()}`, size: 'sm', color: '#555555', margin: 'md' },
              { type: 'text', text: `尚欠餘額：NT$ ${remaining.toLocaleString()}`, size: 'sm', color: '#ff4444', margin: 'xs', weight: 'bold' }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [{
              type: 'button',
              style: 'primary',
              color: '#4F46E5',
              action: { type: 'uri', label: '前往專屬面板', uri: `${V7_URL}/billing` }
            }]
          }
        };
      });

      await replyMessage(replyToken, [
        { type: 'text', text: `您好！系統查詢到您有 ${pendingBills.length} 筆專屬帳單尚未結清。請點擊下方按鈕前往專屬面板查看明細與上傳憑證。` },
        { type: 'flex', altText: '待繳帳單列表', contents: { type: 'carousel', contents: flexBubbles } as any }
      ]);
    } catch (error) {
      logDetailedError('Error fetching bills', error, { lineUserId });
      await replyMessage(replyToken, [{ type: 'text', text: '帳單查詢失敗，請稍後再試。' }]);
    }
    return true;
  }

  if (content === '選單') {
    try {
      const currentUid = memberProfile.memberId;
      const notifsSnap = await db.collection('notifications')
        .where('userId', 'in', [currentUid, 'all'])
        .where('isRead', '==', false)
        .get();
      const unreadNotifCount = notifsSnap.size;

      const billsSnap = await db.collection('billing_records').where('memberId', '==', currentUid).get();
      const campsSnap = await db.collection('billing_campaigns').where('isPublished', '==', true).get();
      const pubCamps = new Set(campsSnap.docs.map((c) => c.id));
      let pendingBillCount = 0;
      billsSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status?.status !== 'approved' && pubCamps.has(data.campaignId)) pendingBillCount++;
      });

      const V7_URL = process.env.VITE_LIFF_URL
        ? process.env.VITE_LIFF_URL.trim().replace(/\/login\/?$/, '')
        : 'https://north-lions-v6-a7757.web.app';
      const billTitle = pendingBillCount > 0 ? `💰專屬帳單(${pendingBillCount})🔴` : '💰 專屬帳單';
      const billColor = pendingBillCount > 0 ? '#B91C1C' : '#333333';
      const billBg = pendingBillCount > 0 ? '#FEE2E2' : '#F3F4F6';
      const notifTitle = unreadNotifCount > 0 ? `🔔通知中心(${unreadNotifCount})🔴` : '🔔 通知中心';
      const notifColor = unreadNotifCount > 0 ? '#B91C1C' : '#333333';
      const notifBg = unreadNotifCount > 0 ? '#FEF3C7' : '#F3F4F6';

      const createCell = (title: string, color: string, bg: string, path: string) => ({
        type: 'box',
        layout: 'vertical',
        backgroundColor: bg,
        cornerRadius: 'md',
        paddingAll: 'md',
        alignItems: 'center',
        justifyContent: 'center',
        action: { type: 'uri', uri: `${V7_URL}${path}` },
        contents: [{ type: 'text', text: title, color, weight: 'bold', size: 'sm', align: 'center', wrap: true }]
      });

      const flexMsg = {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#4F46E5',
          contents: [{ type: 'text', text: '🦁 北大獅子會 個人儀表板', weight: 'bold', size: 'md', color: '#ffffff', align: 'center' }]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingAll: 'lg',
          contents: [
            { type: 'box', layout: 'horizontal', spacing: 'md', contents: [createCell(billTitle, billColor, billBg, '/billing'), createCell(notifTitle, notifColor, notifBg, '/')] },
            { type: 'box', layout: 'horizontal', spacing: 'md', contents: [createCell('👥 會員名冊', '#333333', '#F3F4F6', '/members'), createCell('📣 最新公告', '#333333', '#F3F4F6', '/announcements')] },
            { type: 'box', layout: 'horizontal', spacing: 'md', contents: [createCell('📅 活動報名', '#333333', '#F3F4F6', '/events'), createCell('⚙️ 個人設定', '#333333', '#F3F4F6', '/profile')] }
          ]
        }
      };

      await replyMessage(replyToken, [{ type: 'flex', altText: '會員動態儀表板選單', contents: flexMsg as any }]);
    } catch (error) {
      logDetailedError('Error generating menu', error, { lineUserId });
      await replyMessage(replyToken, [{ type: 'text', text: '選單載入失敗，請稍後再試。' }]);
    }
    return true;
  }

  if (event.source.type === 'user') return false;
  return false;
}
