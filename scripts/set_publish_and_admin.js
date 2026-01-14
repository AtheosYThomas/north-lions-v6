const admin = require('firebase-admin');

// 取得 UID 參數 (原生寫法，不需要 commander 套件)
const args = process.argv.slice(2);
const uidArg = args.find(arg => arg.startsWith('--uid='));
const uid = uidArg ? uidArg.split('=')[1] : null;

if (!uid) {
  console.error('❌ 錯誤：請提供 --uid="您的UID"');
  process.exit(1);
}

// 初始化 Firebase (會自動讀取 GOOGLE_APPLICATION_CREDENTIALS)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function run() {
  console.log('🚀 開始更新 Firestore 資料...');

  // 1. 強制將活動設為發佈，且日期設為 Timestamp (2026/2/15)
  const eventRef = db.collection('events').doc('event_2026_new_year');
  await eventRef.set({
    status: 'published',
    info: {
      date: admin.firestore.Timestamp.fromDate(new Date('2026-02-15')),
      title: '2026 北大獅子會新春團拜'
    }
  }, { merge: true });
  console.log('✅ 活動已設為公開 (Status: published) 且日期已修復為 Timestamp');

  // 2. 將使用者設為管理員 (同時寫入 users 與 members 集合)
  const userUpdate = { 
    role: 'admin', 
    updatedAt: admin.firestore.FieldValue.serverTimestamp() 
  };
  
  await db.collection('users').doc(uid).set(userUpdate, { merge: true });
  await db.collection('members').doc(uid).set(userUpdate, { merge: true });
  
  console.log(`✅ 使用者 ${uid} 已晉升為管理員`);
  console.log('\n🎉 所有更新已完成！請重新整理網頁。');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ 發生錯誤:', err.message || err);
  process.exit(1);
});
