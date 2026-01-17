
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

import { verifyLineToken } from './auth';
import { initDatabase } from './init';
import { getEvents, getEvent, createEvent, updateEvent, onEventCreatedTrigger } from './events';
import { registerMember, getMembers, updateMemberStatus } from './members';
import { getAnnouncements, getAnnouncement, createAnnouncement, updateAnnouncement } from './announcements';
import { registerEvent, cancelRegistration, getMyRegistrations, getEventRegistrations } from './registrations';
import { getDonations, createDonation } from './donations';
import { getPayments, createPayment } from './payments';
import { updateProfile } from './profile';
import { lineWebhook } from './webhook';
import { getMessageLogs } from './messages';

export { 
  verifyLineToken, 
  initDatabase, 
  getEvents, 
  getEvent, 
  createEvent, 
  updateEvent, 
  onEventCreatedTrigger,
  registerMember,
  getMembers,
  updateMemberStatus,
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  registerEvent,
  cancelRegistration,
  getMyRegistrations,
  getEventRegistrations,
  getDonations,
  createDonation,
  getPayments,
  createPayment,
  updateProfile,
  lineWebhook,
  getMessageLogs
};

// Export helloWorld for legacy test compatibility
export const hello = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
