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
const firebase_functions_test_1 = __importDefault(require("firebase-functions-test"));
const admin = __importStar(require("firebase-admin"));
const test = (0, firebase_functions_test_1.default)();
// Mock axios
jest.mock('axios');
// Import function
const auth_1 = require("../src/auth");
describe('Auth Functions', () => {
    let adminInitStub;
    beforeAll(() => {
        // Prevent re-initialization error
        if (admin.apps.length === 0) {
            adminInitStub = jest.spyOn(admin, 'initializeApp').mockImplementation(() => ({}));
        }
    });
    afterAll(() => {
        test.cleanup();
        if (adminInitStub)
            adminInitStub.mockRestore();
    });
    it('verifyLineToken should throw error if no token provided', async () => {
        // onCall function wrapper takes (data, context)
        const wrapped = test.wrap(auth_1.verifyLineToken);
        // Use any to bypass strict type checking for the test input
        await expect(wrapped({ lineAccessToken: null })).rejects.toThrow('Missing LINE access token.');
    });
});
//# sourceMappingURL=auth.spec.js.map