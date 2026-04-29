import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import axios from "axios";
import { createAuditLog } from "./utils/audit";

const ADMIN_SYSTEM_PASSWORD_SECRET = defineSecret("ADMIN_SYSTEM_PASSWORD");

function getAdminSystemPassword(): string {
  const fromEnv = process.env.ADMIN_SYSTEM_PASSWORD?.trim();
  if (fromEnv) return fromEnv;

  // Deployed environments should set the Secret Manager value.
  // For local/dev, `process.env.ADMIN_SYSTEM_PASSWORD` is the fallback.
  try {
    const fromSecret = ADMIN_SYSTEM_PASSWORD_SECRET.value();
    return typeof fromSecret === "string" ? fromSecret.trim() : String(fromSecret ?? "").trim();
  } catch {
    return "";
  }
}

export const adminLogin = onCall(async (request) => {
  const db = admin.firestore();
  const { account, password } = request.data;
  const expectedPassword = getAdminSystemPassword();
  if (account === 'ADMIN' && expectedPassword && password === expectedPassword) {
    const uid = 'admin-system-account';
    const adminDoc = await db.collection('members').doc(uid).get();
    if (!adminDoc.exists) {
      // 確保寫入根目錄的 role: 'admin' 以符合 Firestore Security Rules
      await db.collection('members').doc(uid).set({
        name: '系統管理員',
        role: 'admin',
        contact: { mobile: '0900000000', email: 'admin@peida.net', lineUserId: '' },
        organization: { role: 'admin', title: 'Admin' },
        status: { activeStatus: 'active', membershipType: '正式' },
        system: { account: 'ADMIN', role: 'admin', accountStatus: 'active', pushConsent: true }
      });
    }
    const token = await admin.auth().createCustomToken(uid);
    await createAuditLog({
      operatorUid: uid,
      operatorName: '系統管理員',
      action: 'ADMIN_PASSWORD_LOGIN',
      meta: { account: 'ADMIN' }
    });
    return { token };
  } else {
    throw new HttpsError('unauthenticated', 'Invalid admin credentials');
  }
});

export const testUserLogin = onCall(async (request) => {
  const db = admin.firestore();
  const uid = 'test-unit-user';
  // Simulate what LINE login creates
  await db.collection('members').doc(uid).set({
      name: 'Test Member',
      role: 'member',
      contact: { mobile: '', email: '', lineUserId: 'unit-line' },
      organization: { role: '', title: '' },
      status: { activeStatus: 'active', membershipType: '潛在' },
      system: { account: '', role: 'Member', accountStatus: 'active', pushConsent: true }
  });
  const token = await admin.auth().createCustomToken(uid);
  return { token, needsRegistration: true };
});

export const verifyLineToken = onCall(async (request) => {
  // 延遲到函式內部初始化，確保 admin.initializeApp() 已經執行完畢
  const db = admin.firestore();
  const { lineAccessToken } = request.data;
  
  try {
    if (!lineAccessToken) {
      throw new HttpsError('invalid-argument', 'Missing LINE token');
    }
    
    // 透過 LINE API 驗證 Token 並取得使用者 Profile
    const response = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${lineAccessToken}` }
    });
    
    const lineProfile = response.data;
    const lineUserId = lineProfile.userId;
    const displayName = lineProfile.displayName || "LINE 會員";

    // 檢查 Firestore (members collection) 是否已經有這個 lineUserId
    const membersRef = db.collection('members');
    const snapshot = await membersRef.where('contact.lineUserId', '==', lineUserId).limit(1).get();
    
    let uid = lineUserId;
    let isNewUser = false;
    let needsRegistration = false;
    
    if (snapshot.empty) {
      isNewUser = true;
      needsRegistration = true;
      // 自動建立全新的最小化會員資料
      const newMember = {
        name: displayName,
        role: 'member',
        contact: { mobile: '', email: '', lineUserId },
        organization: { role: '', title: '' },
        status: { activeStatus: 'active', membershipType: '潛在' },
        system: { account: '', role: 'Member', accountStatus: 'active', pushConsent: true },
      };
      await membersRef.doc(uid).set(newMember);
    } else {
      uid = snapshot.docs[0].id; // 已經註冊過的會員
      const existingData = snapshot.docs[0].data();
      if (!existingData.contact || !existingData.contact.mobile) {
         needsRegistration = true;
      }
    }

    // 發行 Firebase Custom Token
    const customToken = await admin.auth().createCustomToken(uid);

    return { token: customToken, isNewUser, needsRegistration, lineProfile };

  } catch (error: any) {
    console.error("LINE Token Verification Failed:", error.response?.data || error.message);
    throw new HttpsError('unauthenticated', 'LINE login verification failed. Invalid token.');
  }
});
