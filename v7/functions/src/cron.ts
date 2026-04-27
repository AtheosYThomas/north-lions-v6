import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * 實作逾期未繳自動取消 (Cron Job)
 * 每小時執行一次。找出報名超過 48 小時且 paymentStatus 仍為 '未繳費' 的註冊紀錄，
 * 將其狀態自動變更為 '已取消' 以釋出活動名額。
 */
export const autoCancelUnpaidRegistrations = onSchedule("every 1 hours", async (event) => {
    const db = admin.firestore();
    const now = new Date();
    // 48小時前
    const thresholdMillis = now.getTime() - 48 * 60 * 60 * 1000;

    try {
        // 因效能及複合索引考量，先撈取未繳費的報名紀錄，再在記憶體過濾時間
        // (若資料量大，建議在 Firestore 建立複合索引 `paymentStatus` + `info.timestamp`)
        const snapshot = await db.collection('registrations')
            .where('status.paymentStatus', '==', '未繳費')
            .where('status.status', '==', '已報名')
            .get();

        if (snapshot.empty) {
            logger.info("No unpaid registrations found.");
            return;
        }

        const batch = db.batch();
        let cancelCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const timestamp = data.info?.timestamp as admin.firestore.Timestamp;
            if (timestamp && timestamp.toMillis() <= thresholdMillis) {
                logger.info(`Auto-cancelling registration ${doc.id} (Member: ${data.info?.memberId}, Event: ${data.info?.eventId})`);
                batch.update(doc.ref, {
                    'status.status': '已取消',
                    'status.cancelReason': '逾時 48 小時未繳費系統自動取消',
                    'updatedAt': admin.firestore.FieldValue.serverTimestamp()
                });
                cancelCount++;
            }
        });

        if (cancelCount > 0) {
            await batch.commit();
            logger.info(`Successfully cancelled ${cancelCount} unpaid registrations.`);
        } else {
            logger.info("No registrations exceeded the 48 hours threshold.");
        }
    } catch (error) {
        logger.error("Error in autoCancelUnpaidRegistrations:", error);
    }
});
