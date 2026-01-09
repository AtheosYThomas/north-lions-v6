
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

import { verifyLineToken } from './auth';
import { initDatabase } from './init';
import { getEvents, getEvent, createEvent, updateEvent } from './events';
import { registerMember } from './members';

export { verifyLineToken, initDatabase, getEvents, getEvent, createEvent, updateEvent, registerMember };

// Export helloWorld for legacy test compatibility
export const hello = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
