import {
  collection,
  limit,
  orderBy,
  query,
  where,
  type Firestore,
  type QuerySnapshot,
} from 'firebase/firestore';
import type { Donation } from '../types/index';

export const DONATIONS_COLLECTION = 'donations' as const;

/** 預設捐款／繳費類別（與前後台 UI 選單一致） */
export const DONATION_CATEGORIES = [
  '常年會費',
  '月例會費',
  '社會服務樂捐',
  '活動贊助',
  '其他',
];

export type DonationWithId = Donation & { id: string };

/** 將 QuerySnapshot 轉成帶 id 的捐款列（兩端 store 共用） */
export function mapDonationSnapshot(
  snapshot: QuerySnapshot
): DonationWithId[] {
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Donation),
  }));
}

/** 全會近期捐款（後台總表；與原 limit 100 一致） */
export function queryAllDonationsRecent(db: Firestore) {
  return query(
    collection(db, DONATIONS_COLLECTION),
    orderBy('date', 'desc'),
    limit(100)
  );
}

/** 單一會員捐款明細 */
export function queryDonationsForMember(db: Firestore, memberId: string) {
  return query(
    collection(db, DONATIONS_COLLECTION),
    where('memberId', '==', memberId),
    orderBy('date', 'desc')
  );
}

/** 手動建檔時預設 audit.status 為 approved（與原 store 行為一致） */
export function withDefaultApprovedAudit(
  payload: Omit<Donation, 'id'>
): Omit<Donation, 'id'> {
  return {
    ...payload,
    audit: {
      ...payload.audit,
      status: payload.audit?.status || 'approved',
    },
  };
}
