import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { Event } from 'shared/types';
import { multicastMessage, LineMessage } from './line';

// Helper to check admin role
// Note: This logic duplicates what's in firestore.rules but is good for backend validation
async function isAdmin(uid: string): Promise<boolean> {
  const memberDoc = await admin.firestore().collection('members').doc(uid).get();
  return memberDoc.exists && memberDoc.data()?.system?.role === 'admin';
}

export const getEvents = functions.https.onCall(async (data: any, context: any) => {
  // Publicly accessible, but we can check auth if needed.
  // For now, allow anyone to view events.
  
  try {
    const snapshot = await admin.firestore().collection('events').orderBy('time.date', 'desc').get();
    const events: Event[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
    return { events };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to fetch events', error);
  }
});

export const getEvent = functions.https.onCall(async (data: any, context: any) => {
  const { eventId } = data;
  if (!eventId) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "eventId".');
  }

  try {
    const doc = await admin.firestore().collection('events').doc(eventId).get();
    if (!doc.exists) {
      throw new functions.https.HttpsError('not-found', 'Event not found');
    }
    return { event: { id: doc.id, ...doc.data() } as Event };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to fetch event', error);
  }
});

export const createEvent = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // Check Admin
  const adminRole = await isAdmin(context.auth.uid);
  if (!adminRole) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can create events.');
  }

  const eventData: Partial<Event> = data.event;
  // Basic validation could go here

  try {
    // Add creation metadata
    const newEvent = {
      ...eventData,
      publishing: {
        ...eventData.publishing,
        publisherId: context.auth.uid,
      },
      // Ensure time dates are handled correctly if passed as ISO strings
    };

    const ref = await admin.firestore().collection('events').add(newEvent);
    return { id: ref.id };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to create event', error);
  }
});

export const updateEvent = functions.https.onCall(async (data: any, context: any) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { eventId, event } = data;
  if (!eventId || !event) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing eventId or event data.');
  }

  // Check Admin
  const adminRole = await isAdmin(context.auth.uid);
  if (!adminRole) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can update events.');
  }

  try {
    await admin.firestore().collection('events').doc(eventId).update(event);
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Unable to update event', error);
  }
});

// Trigger: On Event Created
export const onEventCreated = onDocumentCreated("events/{eventId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        console.log("No data associated with the event");
        return;
    }
    const eventData = snap.data() as Event;

    // Check if push is enabled
    // Based on schema in DESIGN.md: settings: { isPushEnabled: boolean }
    const isPushEnabled = (eventData as any).settings?.isPushEnabled === true;

    if (!isPushEnabled) {
      console.log('Push notification not enabled for this event.');
      return;
    }

    try {
      // Find all members who consented to push
      const membersSnapshot = await admin.firestore().collection('members')
        .where('system.pushConsent', '==', true)
        .get();

      const lineUserIds: string[] = [];
      membersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.contact && data.contact.lineUserId) {
          lineUserIds.push(data.contact.lineUserId);
        }
      });

      if (lineUserIds.length === 0) {
        console.log('No members found with push consent.');
        return;
      }

      // Construct Flex Message
      const dateStr = eventData.time?.date ? (eventData.time.date as any).toDate().toLocaleDateString('zh-TW') : '未定';

      const message: LineMessage = {
        type: 'flex',
        altText: `新活動通知：${eventData.name}`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📅 新活動通知',
                color: '#ffffff',
                weight: 'bold'
              }
            ],
            backgroundColor: '#00B900'
          },
          hero: eventData.system?.coverImage ? {
            type: 'image',
            url: eventData.system.coverImage,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover'
          } : undefined,
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: eventData.name,
                weight: 'bold',
                size: 'xl',
                wrap: true
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'lg',
                spacing: 'sm',
                contents: [
                  {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: '日期',
                        color: '#aaaaaa',
                        size: 'sm',
                        flex: 1
                      },
                      {
                        type: 'text',
                        text: dateStr,
                        wrap: true,
                        color: '#666666',
                        size: 'sm',
                        flex: 5
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: '地點',
                        color: '#aaaaaa',
                        size: 'sm',
                        flex: 1
                      },
                      {
                        type: 'text',
                        text: eventData.details?.location || '待定',
                        wrap: true,
                        color: '#666666',
                        size: 'sm',
                        flex: 5
                      }
                    ]
                  }
                ]
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '查看詳情 & 報名',
                  uri: `https://liff.line.me/2006830768-D9X5j04x/events/${snap.id}` // Placeholder LIFF URL
                }
              }
            ],
            flex: 0
          }
        }
      };

      // LINE Messaging API Multicast (max 500 at a time)
      const BATCH_SIZE = 500;
      for (let i = 0; i < lineUserIds.length; i += BATCH_SIZE) {
        const batch = lineUserIds.slice(i, i + BATCH_SIZE);
        try {
            await multicastMessage(batch, [message]);
        } catch (batchError) {
            console.error(`Error sending batch ${i / BATCH_SIZE + 1}:`, batchError);
            // Continue to next batch
        }
      }

    } catch (error) {
      console.error('Error sending event push:', error);
    }
});
