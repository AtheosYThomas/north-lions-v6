
import * as admin from 'firebase-admin';
import firebaseFunctionsTest from 'firebase-functions-test';
import { cancelRegistration } from '../src/registrations';

const test = firebaseFunctionsTest();

// Mock firebase-admin
jest.mock('firebase-admin', () => {
    const firestoreMock = {
        collection: jest.fn(),
        runTransaction: jest.fn()
    };
    
    // Create the firestore function mock
    const firestoreFn = Object.assign(() => firestoreMock, {
         FieldValue: {
             increment: jest.fn()
         }
    });

    return {
        initializeApp: jest.fn(),
        firestore: firestoreFn,
        apps: ['app'], // Simulate initialized app
        auth: jest.fn()
    };
});

describe('cancelRegistration', () => {
    let transactionMock: any;
    let firestoreMock: any;
    let wrappedCancelRegistration: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        transactionMock = {
            get: jest.fn(),
            update: jest.fn()
        };

        firestoreMock = admin.firestore();
        firestoreMock.runTransaction.mockImplementation((callback: any) => callback(transactionMock));
        firestoreMock.collection.mockReturnValue({
            doc: jest.fn().mockReturnThis()
        });

        // Wrap the function
        wrappedCancelRegistration = test.wrap(cancelRegistration);
    });

    afterAll(() => {
        test.cleanup();
    });

    it('should allow owner to cancel registration', async () => {
        const userId = 'user1';
        const registrationData = {
            info: { memberId: userId, eventId: 'event1' },
            status: { status: 'registered' }
        };

        // Mock Registration Get
        transactionMock.get.mockResolvedValueOnce({
            exists: true,
            data: () => registrationData
        });

        const context = { auth: { uid: userId } };
        const data = { registrationId: 'reg1' };

        await wrappedCancelRegistration(data, context);

        expect(transactionMock.update).toHaveBeenCalled();
    });

    it('should deny non-owner non-admin to cancel', async () => {
        const userId = 'attacker';
        const registrationData = {
            info: { memberId: 'victim', eventId: 'event1' },
            status: { status: 'registered' }
        };

        transactionMock.get.mockResolvedValueOnce({
            exists: true,
            data: () => registrationData
        });

        // Mock Admin Check (Caller is NOT admin)
        const docMock = {
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ system: { role: 'member' } })
            })
        };
        firestoreMock.collection.mockReturnValue({
            doc: jest.fn().mockReturnValue(docMock)
        });

        const context = { auth: { uid: userId } };
        const data = { registrationId: 'reg1' };

        await expect(wrappedCancelRegistration(data, context)).rejects.toThrow('You can only cancel your own registration or must be an admin.');
    });
    
     it('should allow admin to cancel others registration', async () => {
        const userId = 'adminUser';
        const registrationData = {
            info: { memberId: 'victim', eventId: 'event1' },
            status: { status: 'registered' }
        };

        // Setup Transaction Mock for Registration
        transactionMock.get.mockResolvedValueOnce({
            exists: true,
            data: () => registrationData
        });

        // Setup DB Mock for Admin Profile
        firestoreMock.collection.mockImplementation((collectionName: string) => {
            if (collectionName === 'members') {
                return {
                    doc: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({ system: { role: 'admin' } })
                        })
                    })
                };
            }
            if (collectionName === 'registrations' || collectionName === 'events') {
                 return {
                    doc: jest.fn().mockReturnThis() 
                 };
            }
            return { doc: jest.fn() };
        });

        const context = { auth: { uid: userId } };
        const data = { registrationId: 'reg1' };

        await wrappedCancelRegistration(data, context);

        expect(transactionMock.update).toHaveBeenCalled();
    });
});
