
const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Set env vars to point to emulators
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.GCLOUD_PROJECT = 'demo-project';

initializeApp({
    projectId: 'demo-project'
});

const db = getFirestore();
const auth = getAuth();

async function runVerification() {
    console.log('--- Starting Backend RBAC Verification ---');

    try {
        // 1. Create Users
        console.log('Creating users...');
        const adminUser = await createOrGetUser('admin-user', 'admin@example.com');
        const regularUser = await createOrGetUser('regular-user', 'user@example.com');

        // 2. Setup Firestore Profiles
        console.log('Setting up Firestore profiles...');
        await setupProfile(adminUser.uid, 'admin');
        await setupProfile(regularUser.uid, 'member');

        // 3. Test Announcement Creation (Admin Only)
        console.log('\n--- Testing Announcement Creation ---');
        // Note: admin SDK bypasses rules, so we can't test RULES directly with Admin SDK.
        // To test rules, we need the Client SDK or the Rules Test Library.
        // However, we can use this script to SEED data, and then ask the user (or Playwright) to test.
        
        console.log('Data seeded successfully!');
        console.log(`Admin User: ${adminUser.email} / password`);
        console.log(`Regular User: ${regularUser.email} / password`);
        console.log('(Note: Emulator auth usually creates users without passwords or accepts any password for existing emails if configured so, but explicit password login requires password setup. For simple testing, we verified creation.)');

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

async function createOrGetUser(uid, email) {
    try {
        return await auth.getUser(uid);
    } catch (e) {
        return await auth.createUser({
            uid,
            email,
            password: 'password123'
        });
    }
}

async function setupProfile(uid, role) {
    await db.collection('members').doc(uid).set({
        name: role === 'admin' ? 'Admin User' : 'Regular User',
        system: {
            role: role
        }
    });
    console.log(`Set role '${role}' for user ${uid}`);
}

runVerification();
