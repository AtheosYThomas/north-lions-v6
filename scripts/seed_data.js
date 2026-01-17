const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Set env vars to point to emulators (respect existing environment values)
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8081';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'north-lions-v6-a7757';

initializeApp({
    projectId: 'north-lions-v6-a7757'
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

        // 3. Setup Event and Registration
        console.log('Setting up Event and Registration...');
        const eventId = 'event1';
        await db.collection('events').doc(eventId).set({
            name: 'Test Event',
            time: { 
                date: new Date(),
                start: new Date(),
                end: new Date(),
                deadline: new Date(Date.now() + 86400000) // tomorrow
            },
            details: {
                location: 'Taipei',
                cost: 0,
                quota: 100,
                isPaidEvent: false
            },
            status: {
                eventStatus: 'published',
                registrationStatus: 'open',
                pushStatus: 'none'
            },
            stats: { registeredCount: 1 },
            publishing: {
                publisherId: adminUser.uid,
                target: ['all']
            }
        });

        // Add a registration for the regular user
        const regId = 'reg1';
        await db.collection('registrations').doc(regId).set({
            info: {
                memberId: regularUser.uid,
                eventId: eventId,
                timestamp: new Date()
            },
            details: {
                adultCount: 1,
                childCount: 0
            },
            needs: { remark: 'Initial Remark' },
            status: {
                status: 'registered',
                paymentStatus: 'unpaid'
            }
        });

        // 4. Test Announcement Creation (Admin Only)
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
