import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

export type AuditLogInput = {
  operatorUid: string;
  operatorName?: string;
  action: string;
  target?: string;
  meta?: Record<string, unknown>;
};

/**
 * 寫入管理行為稽核（Admin SDK，不受 Firestore rules 限制）。
 * 集合 `admin_audit_logs` 對一般使用者為 create-only + officer read（見 firestore.rules）。
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  const { operatorUid, operatorName, action, target, meta } = input;
  if (!operatorUid || !action) return;
  try {
    await admin.firestore().collection('admin_audit_logs').add({
      operatorUid,
      operatorName: operatorName || '',
      action,
      target: target || '',
      meta: meta || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    logger.error('createAuditLog failed', { operatorUid, action, err: e });
  }
}
