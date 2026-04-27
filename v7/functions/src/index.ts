import * as admin from "firebase-admin";

// 集中全域初始化
if (!admin.apps.length) {
    admin.initializeApp();
}

// 匯出所有的 Cloud Functions
export * from './auth';
export * from './webhook';
export * from './donations';
export * from './notifications';
export * from './receipts';
export * from './cron';
export * from './triggers';
