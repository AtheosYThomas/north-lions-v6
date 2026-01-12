const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8081';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'north-lions-v6-a7757';

initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();

async function check() {
  try {
    const paths = [
      'members/admin-user',
      'members/regular-user',
      'events/event1',
      'registrations/reg1'
    ];

    for (const p of paths) {
      const [col, doc] = p.split('/');
      const snap = await db.collection(col).doc(doc).get();
      console.log(`\n== ${p} ==`);
      if (!snap.exists) {
        console.log('  (missing)');
      } else {
        console.log(JSON.stringify(snap.data(), null, 2));
      }
    }
  } catch (err) {
    console.error('Error reading seed data:', err);
    process.exitCode = 1;
  }
}

check();
