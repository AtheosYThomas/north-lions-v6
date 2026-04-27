import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from 'firebase-admin';
import { pushMessage } from './line';
import type { Member, Donation } from 'shared';

// 每次捐款紀錄有變動 (新增、修改、刪除) 時，自動重算該名獅友的累積捐款金額與次數
export const onDonationWritten = onDocumentWritten("donations/{donationId}", async (event) => {
    const db = admin.firestore();
    
    // 取得變更前與變更後的資料，找出影響到的 memberId
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    const memberIdsToUpdate = new Set<string>();
    if (beforeData?.memberId) memberIdsToUpdate.add(beforeData.memberId);
    if (afterData?.memberId) memberIdsToUpdate.add(afterData.memberId);

    // 針對受影響的每一個 memberId 重算聚合資料 (Idempotent 寫法)
    for (const memberId of memberIdsToUpdate) {
        try {
            // 撈出該名會員的所有「非拒絕/非待審核」狀態的正式捐款
            // 若業務邏輯只要紀錄 approved 的才算，可在此過濾
            const snapshots = await db.collection("donations")
                .where("memberId", "==", memberId)
                // 這裡可以依據 audit.status 來做過濾
                .get();

            let totalDonation = 0;
            let donationCount = 0;
            let lastDonationDate: admin.firestore.Timestamp | null = null;

            snapshots.forEach((doc) => {
                const data = doc.data();
                // 假設被拒絕的捐款不計入總數
                if (data.audit?.status !== 'rejected') {
                    totalDonation += (Number(data.amount) || 0);
                    donationCount += 1;
                    
                    if (data.date) {
                        if (!lastDonationDate || data.date.toMillis() > lastDonationDate.toMillis()) {
                            lastDonationDate = data.date;
                        }
                    }
                }
            });

            // 更新 Member 資料
            await db.collection("members").doc(memberId).set({
                stats: {
                    totalDonation,
                    donationCount,
                    lastDonationDate
                }
            }, { merge: true });

            console.log(`Successfully updated member ${memberId} stats: ${donationCount} donations, total ${totalDonation}`);
        } catch (error) {
            console.error(`Failed to update stats for member ${memberId}:`, error);
        }
    }

    // 第二發：針對新增的會費/捐款發出個人推播
    if (!event.data?.before.exists && afterData?.memberId) {
        const docRef = db.collection('members').doc(afterData.memberId);
        const memberDoc = await docRef.get();
        if (memberDoc.exists) {
            const memberData = memberDoc.data() as Member;
            const lineUserId = memberData.contact?.lineUserId;
            if (lineUserId) {
                const donation = afterData as Donation;
                const msg = `🦁 ${memberData.name} 獅友您好！\n\n系統已為您收到並核銷了一筆「${donation.category}」款項（金額：NT$ ${donation.amount.toLocaleString()}）。\n\n感謝您的熱心參與！您可隨時至系統的「帳目與捐款」查看您的歷史累積明細。`;
                await pushMessage(lineUserId, [{ type: "text", text: msg }]);
            }
        }
    }
});
