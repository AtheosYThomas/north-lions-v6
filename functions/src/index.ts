
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

import { verifyLineToken } from './auth';
import { initDatabase } from './init';
import { getEvents, getEvent, createEvent, updateEvent } from './events';
import { registerMember } from './members';
import { getAnnouncements, getAnnouncement, createAnnouncement, updateAnnouncement } from './announcements';
import { registerEvent, cancelRegistration, getMyRegistrations } from './registrations';
import { getDonations, createDonation } from './donations';
import { getPayments, createPayment } from './payments';
import { updateProfile } from './profile';

export { 
  verifyLineToken, 
  initDatabase, 
  getEvents, 
  getEvent, 
  createEvent, 
  updateEvent, 
  registerMember,
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  registerEvent,
  cancelRegistration,
  getMyRegistrations,
  getDonations,
  createDonation,
  getPayments,
  createPayment,
  updateProfile
};

// Export helloWorld for legacy test compatibility
export const hello = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
