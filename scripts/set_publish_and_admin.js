#!/usr/bin/env node
// Usage:
// node scripts/set_publish_and_admin.js --serviceAccount=path/to/key.json --projectId=your-project-id --uid=USER_UID
// Or set env vars: SERVICE_ACCOUNT, PROJECT_ID, TARGET_UID

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  });
  return args;
}

async function main() {
  const args = parseArgs();
  const serviceAccountPath = args.serviceAccount || process.env.SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = args.projectId || process.env.PROJECT_ID || process.env.PROJECT || 'north-lions-v6-a7757';
  const targetUid = args.uid || process.env.TARGET_UID || process.env.UID;

  if (!serviceAccountPath) {
    console.error('Missing service account path. Provide --serviceAccount=path or set SERVICE_ACCOUNT env var.');
    process.exit(1);
  }
  if (!targetUid) {
    console.error('Missing target UID. Provide --uid=USER_UID or set TARGET_UID env var.');
    process.exit(1);
  }

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account file not found at', serviceAccountPath);
    process.exit(1);
  }

  const key = require(path.resolve(serviceAccountPath));

  admin.initializeApp({
    credential: admin.credential.cert(key),
    projectId: projectId,
  });

  const db = admin.firestore();

  try {
    // 1) Set event status
    const eventDocRef = db.collection('events').doc('event_2026_new_year');
    await eventDocRef.set({ status: 'published' }, { merge: true });
    console.log('Set events/event_2026_new_year.status = published');

    // 2) Set member role
    const memberRef = db.collection('members').doc(targetUid);
    await memberRef.set({ system: { role: 'admin' }, role: 'admin' }, { merge: true });
    console.log(`Set members/${targetUid}.system.role = admin and role = admin`);

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error updating Firestore:', err);
    process.exit(1);
  }
}

main();
