"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const firebase_functions_test_1 = __importDefault(require("firebase-functions-test"));
const registrations_1 = require("../src/registrations");
const test = (0, firebase_functions_test_1.default)();
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
    let transactionMock;
    let firestoreMock;
    let wrappedCancelRegistration;
    beforeEach(() => {
        jest.clearAllMocks();
        transactionMock = {
            get: jest.fn(),
            update: jest.fn()
        };
        firestoreMock = admin.firestore();
        firestoreMock.runTransaction.mockImplementation((callback) => callback(transactionMock));
        firestoreMock.collection.mockReturnValue({
            doc: jest.fn().mockReturnThis()
        });
        // Wrap the function
        wrappedCancelRegistration = test.wrap(registrations_1.cancelRegistration);
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
        firestoreMock.collection.mockImplementation((collectionName) => {
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
//# sourceMappingURL=registrations.spec.js.map