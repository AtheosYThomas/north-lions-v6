"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_functions_test_1 = __importDefault(require("firebase-functions-test"));
// Initialize the test SDK (even if unused, it initializes environment)
(0, firebase_functions_test_1.default)();
// Import the function to be tested
const index_1 = require("../src/index");
describe('Cloud Functions', () => {
    it('hello should return a Hello World message', () => {
        // A fake request object
        const req = { query: { text: 'input' } };
        // A fake response object
        const res = {
            send: (body) => {
                expect(body).toBe('Hello from Firebase!');
            }
        };
        // Invoke hello
        (0, index_1.hello)(req, res);
    });
});
//# sourceMappingURL=index.spec.js.map