
import firebaseFunctionsTest from 'firebase-functions-test';
import * as admin from 'firebase-admin';

const test = firebaseFunctionsTest();

// Mock axios
jest.mock('axios');

// Import function
import { verifyLineToken } from '../src/auth';

describe('Auth Functions', () => {
  let adminInitStub: any;

  beforeAll(() => {
    // Prevent re-initialization error
    if (admin.apps.length === 0) {
      adminInitStub = jest.spyOn(admin, 'initializeApp').mockImplementation(() => ({}) as any);
    }
  });

  afterAll(() => {
    test.cleanup();
    if (adminInitStub) adminInitStub.mockRestore();
  });

  it('verifyLineToken should throw error if no token provided', async () => {
    // onCall function wrapper takes (data, context)
    const wrapped = test.wrap(verifyLineToken);
    
    // Use any to bypass strict type checking for the test input
    await expect(wrapped({ lineAccessToken: null } as any)).rejects.toThrow('Missing LINE access token.');
  });
});
