// scripts/set_publish_and_admin.js
const admin = require('firebase-admin');
const { program } = require('commander');

program.option('--uid <type>', 'User UID').parse(process.argv);
const options = program.opts();

if (!admin.apps.length) {
  // Use application default credentials (set GOOGLE_APPLICATION_CREDENTIALS)
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const db = admin.firestore();

async function run() {
  const uid = options.uid;
  if (!uid) {
    console.error('Missing --uid argument');
    process.exit(1);
  }

  // 1. 强制將活動設為發佈，且日期設為 Timestamp (2026/2/15)
  const eventRef = db.collection('events').doc('event_2026_new_year');
  await eventRef.set({
    status: 'published',
    info: {
      date: admin.firestore.Timestamp.fromDate(new Date('2026-02-15')),
      title: '2026 北大獅子會新春團拜'
    }
  }, { merge: true });
  console.log('✅ 活動已設為公開 (Status: published) 且日期已更新為 Timestamp');

  // 2. 將使用者設為管理員 (同時寫入 users 與 members 以防萬一)
  const userUpdate = { role: 'admin', updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  await db.collection('users').doc(uid).set(userUpdate, { merge: true });
  await db.collection('members').doc(uid).set(userUpdate, { merge: true });

  console.log(`✅ 使用者 ${uid} 已晉升為管理員`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
