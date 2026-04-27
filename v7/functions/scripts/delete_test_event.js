/**
 * 一次性腳本：刪除 Firestore 中名稱為 '111111' 的測試活動
 * 執行方式：node v7/functions/scripts/delete_test_event.js
 */
const admin = require('firebase-admin');
const serviceAccount = require('../../../north-lions-v6-a7757-firebase-adminsdk-fbsvc-4a3c9a3613.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function deleteTestEvent() {
  const db = admin.firestore();
  const snap = await db.collection('events')
    .where('name', '==', '111111')
    .get();
  
  if (snap.empty) {
    console.log('✅ 找不到名稱為 "111111" 的活動，可能已刪除。');
    return;
  }

  for (const doc of snap.docs) {
    await doc.ref.delete();
    console.log(`🗑️  已刪除活動 ID: ${doc.id}, 名稱: ${doc.data().name}`);
  }
  console.log(`✅ 共刪除 ${snap.size} 筆測試活動。`);
}

deleteTestEvent().catch(console.error).finally(() => process.exit(0));
