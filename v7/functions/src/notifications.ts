import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { broadcastMessage, LineMessage } from "./line";
import type { Announcement, Event } from "shared";

const LIFF_URL = process.env.VITE_LIFF_URL || 'https://liff.line.me/YOUR_LIFF_ID'; // Ensure this points to the right LIFF

const buildAnnouncementFlexMessage = (docId: string, data: Announcement): LineMessage => {
    const { title, content, category } = data;
    const desc = content.summary || (content.body.substring(0, 50) + '...');
    const url = `${LIFF_URL}?path=/announcements/${docId}`;

    return {
        type: "flex",
        altText: `📢 新公告推播：${title}`,
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: `📢 ${category}公告`,
                        color: "#ffffff",
                        weight: "bold",
                        size: "sm"
                    }
                ],
                backgroundColor: "#4f46e5",
                paddingAll: "12px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: title,
                        weight: "bold",
                        size: "xl",
                        wrap: true
                    },
                    {
                        type: "text",
                        text: desc,
                        size: "sm",
                        color: "#666666",
                        wrap: true,
                        margin: "md"
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: {
                            type: "uri",
                            label: "立刻點擊查看詳情",
                            uri: url
                        },
                        style: "primary",
                        color: "#4f46e5"
                    }
                ]
            }
        }
    };
};

export const onAnnouncementPublished = onDocumentCreated("announcements/{docId}", async (event) => {
    const data = event.data?.data() as Announcement;
    
    // Check if auto push is enabled and status is published
    if (!data || !data.enableAutoPush || data.status?.status !== 'published') {
        console.log(`[Announcement Push] Skipping auto push for ${event.data?.id} (enableAutoPush: ${data?.enableAutoPush})`);
        return;
    }

    const flexMsg = buildAnnouncementFlexMessage(event.data!.id, data);
    await broadcastMessage([flexMsg]);
});

export const manualPushAnnouncement = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const db = admin.firestore();
    const memberDoc = await db.collection("members").doc(request.auth.uid).get();
    const isDevAdmin = request.auth.uid === 'dev-admin';
    const isSystemAdmin = memberDoc.exists && memberDoc.data()?.system?.role === 'Admin';
    const isBaseAdmin = memberDoc.exists && memberDoc.data()?.role === 'Admin';
    
    if (!isDevAdmin && !isSystemAdmin && !isBaseAdmin) {
        throw new HttpsError("permission-denied", "Only administrators can trigger manual pushes.");
    }

    const { announcementId } = request.data;
    if (!announcementId) throw new HttpsError("invalid-argument", "announcementId is required.");

    const docSnap = await db.collection("announcements").doc(announcementId).get();
    if (!docSnap.exists) throw new HttpsError("not-found", "Announcement not found.");

    const data = docSnap.data() as Announcement;
    const flexMsg = buildAnnouncementFlexMessage(announcementId, data);
    await broadcastMessage([flexMsg]);
    
    return { success: true, message: `Successfully pushed announcement ${announcementId}` };
});

const buildEventFlexMessage = (eventId: string, data: Event): LineMessage => {
    const { name, time, details, category } = data;
    const url = `${LIFF_URL}?path=/events/${eventId}`;
    
    const eventDate = time.date;
    const loc = details.location || '近期公佈';

    return {
        type: "flex",
        altText: `🎉 新活動邀約：${name}`,
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: `🎉 全會活動通知 (${category})`,
                        color: "#1e40af",
                        weight: "bold",
                        size: "sm"
                    }
                ],
                backgroundColor: "#dbeafe",
                paddingAll: "12px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: name,
                        weight: "bold",
                        size: "xl",
                        wrap: true,
                        margin: "sm"
                    },
                    {
                        type: "box",
                        layout: "baseline",
                        margin: "md",
                        contents: [
                            { type: "text", text: "📅 時間：", color: "#666666", size: "sm", flex: 2 },
                            { type: "text", text: eventDate, color: "#111827", size: "sm", flex: 5 }
                        ]
                    },
                    {
                        type: "box",
                        layout: "baseline",
                        margin: "sm",
                        contents: [
                            { type: "text", text: "📍 地點：", color: "#666666", size: "sm", flex: 2 },
                            { type: "text", text: loc, color: "#111827", size: "sm", flex: 5, wrap: true }
                        ]
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: {
                            type: "uri",
                            label: "前往系統立刻報名",
                            uri: url
                        },
                        style: "primary",
                        color: "#3b82f6"
                    }
                ]
            }
        }
    };
};

export const onEventPublished = onDocumentCreated("events/{docId}", async (event) => {
    const data = event.data?.data() as Event;
    if (!data) return;

    if (!data.enableAutoPush) {
        console.log(`[Event Push] Skipping auto push for event ${event.data?.id} because enableAutoPush is false`);
        return;
    }

    const flexMsg = buildEventFlexMessage(event.data!.id, data);
    await broadcastMessage([flexMsg]);
});

export const manualPushEvent = onCall(async (request) => {
    // 1. Verify Authentication & Authorization
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    const db = admin.firestore();
    const memberDoc = await db.collection("members").doc(request.auth.uid).get();
    
    // We assume dev-admin or actual admin check
    const isDevAdmin = request.auth.uid === 'dev-admin';
    const isSystemAdmin = memberDoc.exists && memberDoc.data()?.system?.role === 'Admin';
    const isBaseAdmin = memberDoc.exists && memberDoc.data()?.role === 'Admin';
    
    if (!isDevAdmin && !isSystemAdmin && !isBaseAdmin) {
        throw new HttpsError("permission-denied", "Only administrators can trigger manual pushes.");
    }

    const { eventId } = request.data;
    if (!eventId) {
        throw new HttpsError("invalid-argument", "eventId is required.");
    }

    // 2. Fetch Event Data
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) {
        throw new HttpsError("not-found", "Event not found.");
    }

    const eventData = eventSnap.data() as Event;
    
    // 3. Construct and Send Message
    const flexMsg = buildEventFlexMessage(eventId, eventData);
    await broadcastMessage([flexMsg]);
    
    return { success: true, message: `Successfully pushed event ${eventId}` };
});
