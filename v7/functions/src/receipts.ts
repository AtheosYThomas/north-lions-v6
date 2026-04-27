import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
// LINE Push 輔助函式已根據「零推播限制」要求移除

export const onReceiptImageUploaded = onObjectFinalized({
    region: 'us-west1',
    memory: '512MiB',
    maxInstances: 5
}, async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const metadata = event.data.metadata || {};

    if (!filePath.startsWith("receipts/")) return;
    const contentType = event.data.contentType;
    if (!contentType || !contentType.startsWith('image/')) {
        logger.log(`File ${filePath} is not an image. Skipping.`);
        return;
    }

    const regId = metadata.regId;
    const billId = metadata.billId;

    if (!regId && !billId) {
        logger.error(`File ${filePath} has no regId or billId in customMetadata.`);
        return;
    }

    let existingDocs;
    if (billId) {
        existingDocs = await admin.firestore().collection('billing_records').doc(billId).get();
        // Billing supports multiple receipts, so we DO NOT skip based on existingConfidence
    } else {
        existingDocs = await admin.firestore().collection('registrations').doc(regId).get();
        const existingConfidence = existingDocs.data()?.payment?.aiConfidence;
        if (existingConfidence && existingConfidence !== 'pending') {
            logger.log(`[receipts] doc already processed (confidence="${existingConfidence}"). Skipping.`);
            return;
        }
    }

    try {
        const bucket = admin.storage().bucket(fileBucket);
        const [fileBuffer] = await bucket.file(filePath).download();
        const base64Image = fileBuffer.toString("base64");

        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
            logger.error('GEMINI_API_KEY is not defined.');
            return;
        }
        const { GoogleGenAI, Type } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey });

const prompt = `
你現在是一個專業的財務助理。請閱讀這張銀行轉帳截圖，並精準提取以下資訊。

規則（嚴格遵守）：
1. 請一律以 JSON 格式回傳，不可包含任何 Markdown 標記或說明文字。
2. 若圖片模糊或找不到對應資訊，請將該欄位設為 null，金額若找不到設為 0。
3. amount 欄位請只輸出純數字（去除逗號或幣值符號）。
4. 【極度重要】關於帳號末五碼 (aiAccountLast5)：
   - 只能提取「轉出帳號 / 付款帳號 / 扣款帳號 / 我的帳號」的最後五個數字！
   - 絕對忽略「轉入帳號 / 收款帳號 / 存入帳號」的數字。如果不確定是轉出還是轉入，請回傳空字串。
   - 斷行處理：有時候帳號數字會因為螢幕寬度被截斷換行（例如數字斷開在上下兩行），請務必將相關數字完整接合（剔除空白與換行符號）後，再精確取出最後五碼。
5. aiTransferDate 請以 YYYY-MM-DD 格式回傳，若無法判斷則回傳空字串。

預期輸出格式（JSON only）：
{
  "aiAmount": 1500,
  "aiAccountLast5": "37082",
  "aiTransferDate": "2023-10-26",
  "aiConfidence": "high"
}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [
                { inlineData: { mimeType: contentType, data: base64Image } },
                { text: prompt }
            ]}],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        aiAccountLast5: { type: Type.STRING, description: "轉出帳號末五碼，注意排版換行需接合，若無法判斷回傳空字串" },
                        aiAmount:       { type: Type.NUMBER, description: "轉帳金額（純數字），若無法判斷回傳 0" },
                        aiTransferDate: { type: Type.STRING, description: "轉帳日期 YYYY-MM-DD，若無法判斷回傳空字串" },
                        aiConfidence:   { type: Type.STRING, description: "'high' 或 'low'" }
                    },
                    required: ["aiAccountLast5", "aiAmount", "aiTransferDate", "aiConfidence"]
                }
            }
        });

        // [Bug Fix] JSON.parse 在 Gemini 輸出空字串或非物件時可能回傳 null，
        // 加入 null 保護確保後續屬性存取不拋出 TypeError。
        const rawParsed = JSON.parse(response.text || "{}");
        const parsed = (rawParsed && typeof rawParsed === 'object') ? rawParsed : {};
        const accountLast5  = parsed.aiAccountLast5  || "";
        const amount        = parsed.aiAmount        || 0;
        const transferDate  = parsed.aiTransferDate  || "";
        const aiConfidence  = parsed.aiConfidence    || "low";

        // 更新 Firestore
        if (billId) {
            const billData = existingDocs?.data();
            const expectedAmount = billData?.billing?.expectedAmount || 0;
            const currentTotalPaid = billData?.payment?.totalPaidAmount || 0;
            
            const newTotalPaid = currentTotalPaid + amount;
            const isMatched = newTotalPaid >= expectedAmount && expectedAmount > 0;
            
            const newReceipt = {
                url: `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`,
                aiAmount: amount,
                aiConfidence: aiConfidence,
                status: 'pending',
                uploadedAt: new Date().toISOString(),
                originalName: metadata.originalName || null,
                fileSize: metadata.fileSize || null
            };

            await admin.firestore().collection('billing_records').doc(billId).update({
                'payment.accountLast5':  accountLast5, // keep latest
                'payment.amount':        amount,       // keep latest
                'payment.transferDate':  transferDate,
                'payment.aiConfidence':  aiConfidence,
                'payment.isMatched':     isMatched,
                'payment.totalPaidAmount': newTotalPaid,
                'payment.receipts': admin.firestore.FieldValue.arrayUnion(newReceipt),
                'payment.aiUpdatedAt':   admin.firestore.FieldValue.serverTimestamp(),
                'status.status':         isMatched ? 'submitted' : 'partial_paid'
            });
            logger.info(`AI parsing done for billId: ${billId}`, { accountLast5, amount, newTotalPaid, expectedAmount, isMatched, aiConfidence });
        } else {
            await admin.firestore().collection('registrations').doc(regId).update({
                'payment.accountLast5':  accountLast5,
                'payment.amount':        amount,
                'payment.transferDate':  transferDate,
                'payment.aiConfidence':  aiConfidence,
                'payment.aiUpdatedAt':   admin.firestore.FieldValue.serverTimestamp()
            });
            logger.info(`AI parsing done for regId: ${regId}`, { accountLast5, amount, transferDate, aiConfidence });
        }

    } catch (e: any) {
        logger.error(`Error processing receipt for req (regId: ${regId}, billId: ${billId}):`, e);
        const col = billId ? 'billing_records' : 'registrations';
        const docId = billId || regId;
        await admin.firestore().collection(col).doc(docId).update({
            'payment.aiConfidence': 'error',
            'payment.aiUpdatedAt': admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
