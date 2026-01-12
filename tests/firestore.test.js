
const { assertFails, assertSucceeds, initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');
const { expect } = require('chai');

const PROJECT_ID = 'demo-project';

describe('Firestore Rules', () => {
    let testEnv;

    before(async () => {
        testEnv = await initializeTestEnvironment({
            projectId: PROJECT_ID,
            firestore: {
                rules: readFileSync('../firestore.rules', 'utf8'),
                host: '127.0.0.1',
                port: 8080
            }
        });
    });

    after(async () => {
        await testEnv.cleanup();
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
        
        // Setup initial state: Create admin user profile
        // We need to write this with admin privileges (bypassing rules)
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await db.collection('members').doc('admin-user').set({
                system: { role: 'admin' }
            });
            await db.collection('members').doc('regular-user').set({
                system: { role: 'member' }
            });
        });
    });

    it('should allow everyone to read announcements', async () => {
        const alice = testEnv.authenticatedContext('regular-user');
        await assertSucceeds(alice.firestore().collection('announcements').doc('1').get());
    });

    it('should allow admin to create announcements', async () => {
        const admin = testEnv.authenticatedContext('admin-user');
        await assertSucceeds(admin.firestore().collection('announcements').add({
            title: 'Test'
        }));
    });

    it('should deny regular user from creating announcements', async () => {
        const alice = testEnv.authenticatedContext('regular-user');
        await assertFails(alice.firestore().collection('announcements').add({
            title: 'Hacked'
        }));
    });

    it('should allow user to read their own registration', async () => {
        const alice = testEnv.authenticatedContext('regular-user');
        // Setup registration
        await testEnv.withSecurityRulesDisabled(async (context) => {
             await context.firestore().collection('registrations').doc('reg1').set({
                 info: { memberId: 'regular-user' }
             });
        });

        await assertSucceeds(alice.firestore().collection('registrations').doc('reg1').get());
    });

    it('should deny user from reading others registration', async () => {
        const alice = testEnv.authenticatedContext('regular-user');
        // Setup registration for Bob
        await testEnv.withSecurityRulesDisabled(async (context) => {
             await context.firestore().collection('registrations').doc('reg2').set({
                 info: { memberId: 'bob' }
             });
        });

        await assertFails(alice.firestore().collection('registrations').doc('reg2').get());
    });
    
    it('should allow admin to read any registration', async () => {
        const admin = testEnv.authenticatedContext('admin-user');
        // Setup registration for Bob
        await testEnv.withSecurityRulesDisabled(async (context) => {
             await context.firestore().collection('registrations').doc('reg2').set({
                 info: { memberId: 'bob' }
             });
        });
        
        await assertSucceeds(admin.firestore().collection('registrations').doc('reg2').get());
    });
});
