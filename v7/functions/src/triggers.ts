import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Helper to create notifications
async function createNotification(targetId: string, type: string, title: string, message: string, url: string = '') {
  const db = admin.firestore();
  await db.collection('notifications').add({
    userId: targetId,
    type,
    title,
    message,
    actionUrl: url,
    isRead: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// 1. 新會員註冊: Notify admin (Listen to members creation or when membershipType is 潛在)
export const onMemberCreated = onDocumentCreated("members/{memberId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;
  
  if (data.status?.membershipType === '潛在') {
    await createNotification(
      'admin', 
      'system', 
      '有新會員尚未審核', 
      `會員 [${data.name}] 已完成初步綁定，請前往管理後台審核會籍。`, 
      '/admin/'
    );
  }
});

// 2. 帳單動態 (Upload receipts -> admin, Approve/Reject -> member)
export const onBillingUpdated = onDocumentUpdated("billing_records/{billId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  
  // 會員上傳了憑證 (Status changed to submitted OR receipts length increased)
  const receiptsB = before.payment?.receipts || [];
  const receiptsA = after.payment?.receipts || [];
  if (receiptsA.length > receiptsB.length) {
    await createNotification(
      'admin', 
      'billing', 
      '收到新的帳單憑證', 
      `會員 [${after.memberInfo?.name}] 針對專屬帳單上傳了匯款憑證，請進行對帳。`, 
      '/admin/reconciliation'
    );
  }
  
  // 管理員退回帳單
  if (before.status?.status !== 'rejected' && after.status?.status === 'rejected') {
    await createNotification(
      after.memberId,
      'billing',
      '您的帳單/憑證已被退回',
      `管理員已將您的帳單標記為退回重審，請至專屬面板查看紀錄並重新上傳。`,
      '/billing'
    );
  }

  // 帳單結清
  if (before.status?.status !== 'approved' && after.status?.status === 'approved') {
    await createNotification(
      after.memberId,
      'billing',
      '帳單已成功結清',
      `您好！系統已確認並核銷您的專屬帳單，感謝您的配合！`,
      '/billing'
    );
  }
});

// 3. 報名與憑證 (Registrations) -> Admin / Social feed
export const onRegistrationUpdated = onDocumentUpdated("registrations/{regId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  
  // 上傳憑證 通知 admin
  if (before.status?.status !== '已上傳憑證' && after.status?.status === '已上傳憑證') {
    // 取得 memberName
    const db = admin.firestore();
    let name = '某會員';
    if (after.info?.memberId) {
      const memDoc = await db.collection('members').doc(after.info.memberId).get();
      if (memDoc.exists) name = memDoc.data()?.name || name;
    }
    
    await createNotification(
      'admin', 
      'registration', 
      '收到活動繳費憑證', 
      `會員 [${name}] 上傳了報名憑證，請前往後台對帳。`, 
      '/admin/reconciliation'
    );
  }
});

export const onRegistrationCreated = onDocumentCreated("registrations/{regId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const db = admin.firestore();
  
  let memberName = '某位熱情獅友';
  if (data.info?.memberId) {
    const memDoc = await db.collection('members').doc(data.info.memberId).get();
    if (memDoc.exists) memberName = memDoc.data()?.name || memberName;
  }
  
  let eventName = '活動';
  if (data.info?.eventId) {
    const evtDoc = await db.collection('events').doc(data.info.eventId).get();
    if (evtDoc.exists) eventName = evtDoc.data()?.name || eventName;
  }

  // 社會動態 (給所有正式會員)
  await createNotification(
    'all', 
    'social', 
    '🌟 報名動態', 
    `就在剛剛，${memberName} 已經手刀報名了「${eventName}」！快來共襄盛舉吧！`, 
    '/events'
  );
  
  // 給管理員的私密通知
  await createNotification(
    'admin', 
    'registration', 
    '📝 新的活動報名', 
    `${memberName} 完成了「${eventName}」的報名。`, 
    '/admin/reconciliation'
  );
});
