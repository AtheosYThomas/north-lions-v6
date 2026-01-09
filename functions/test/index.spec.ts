
import firebaseFunctionsTest from 'firebase-functions-test';

// Initialize the test SDK (even if unused, it initializes environment)
firebaseFunctionsTest();

// Import the function to be tested
import { hello } from '../src/index';

describe('Cloud Functions', () => {
  it('hello should return a Hello World message', () => {
    // A fake request object
    const req = { query: {text: 'input'} } as any;
    // A fake response object
    const res = {
      send: (body: any) => {
        expect(body).toBe('Hello from Firebase!');
      }
    } as any;

    // Invoke hello
    hello(req, res);
  });
});
