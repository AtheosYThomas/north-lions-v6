import * as admin from 'firebase-admin';
import { SchemaType } from '@google/generative-ai';
import { MemberAuthProfile, resolveMemberProfileByLineUserId } from './memberProfile';

type LogDetailedError = (context: string, error: unknown, extra?: Record<string, unknown>) => void;

export function getAiToolDeclarations(): any[] {
  return [
    {
      name: 'get_recent_events',
      description: '從 Firestore 查詢近期 30 天內的活動列表（按日期排序）'
    },
    {
      name: 'get_event_details',
      description: '查詢特定活動的詳細資訊，包括地點、費用與描述',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          event_name: {
            type: SchemaType.STRING,
            description: "模糊查詢的活動名稱，例如 '捐助兒童眼鏡'"
          }
        },
        required: ['event_name']
      }
    },
    {
      name: 'check_registration_status',
      description: '查詢當前 LINE 使用者的最新報名/繳費審核狀態'
    },
    {
      name: 'get_members_directory',
      description: '查詢會員名冊（僅 admin / officer 可用）',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          keyword: {
            type: SchemaType.STRING,
            description: '姓名、手機或 email 的關鍵字'
          },
          limit: {
            type: SchemaType.NUMBER,
            description: '最多回傳筆數，建議 1~20'
          }
        }
      }
    },
    {
      name: 'queryMembers',
      description: '查詢會員名冊（僅 admin / officer 可用）',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          keyword: {
            type: SchemaType.STRING,
            description: '姓名、手機或 email 的關鍵字'
          },
          limit: {
            type: SchemaType.NUMBER,
            description: '最多回傳筆數，建議 1~20'
          }
        }
      }
    }
  ];
}

export function isMembersDirectoryCall(name: string): boolean {
  return name === 'get_members_directory' || name === 'queryMembers';
}

export async function executeAiTool(input: {
  db: admin.firestore.Firestore;
  callName: string;
  callArgs: any;
  lineUserId: string;
  memberProfile: MemberAuthProfile;
  logDetailedError: LogDetailedError;
}): Promise<any> {
  const { db, callName, callArgs, lineUserId, memberProfile, logDetailedError } = input;
  try {
    if (callName === 'get_recent_events') {
      return await getRecentEvents(db, logDetailedError);
    }
    if (callName === 'get_event_details') {
      return await getEventDetails(db, String(callArgs?.event_name || ''), logDetailedError);
    }
    if (callName === 'check_registration_status') {
      return await checkRegistrationStatus(db, lineUserId, logDetailedError);
    }
    if (isMembersDirectoryCall(callName)) {
      const keyword = String(callArgs?.keyword || '');
      const limit = Number(callArgs?.limit || 10);
      return await getMembersDirectory(db, memberProfile, keyword, limit, logDetailedError);
    }
    return { error: '未知工具' };
  } catch (err) {
    logDetailedError('Function execution error', err, { lineUserId, functionName: callName });
    return { error: '工具執行失敗' };
  }
}

function maskLineUserId(lineUserId: string): string {
  const raw = String(lineUserId || '').trim();
  if (!raw) return '';
  if (raw.length <= 10) return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
  return `${raw.slice(0, 5)}...${raw.slice(-5)}`;
}

async function getRecentEvents(
  db: admin.firestore.Firestore,
  logDetailedError: LogDetailedError
): Promise<any> {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const snapshot = await db.collection('events')
      .where('time.date', '>=', todayStr)
      .orderBy('time.date', 'asc')
      .limit(5)
      .get();
    if (snapshot.empty) return { message: '未來 30 天內沒有查詢到任何活動' };
    return {
      events: snapshot.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          name: data.name,
          date: data.time?.date || '未提供',
          location: data.details?.location || '未提供',
          isPaidEvent: data.details?.isPaidEvent || false
        };
      })
    };
  } catch (error: any) {
    logDetailedError('Error in getRecentEvents', error);
    return { error: '查無活動或發生系統錯誤' };
  }
}

async function getEventDetails(
  db: admin.firestore.Firestore,
  eventName: string,
  logDetailedError: LogDetailedError
): Promise<any> {
  try {
    const snapshot = await db.collection('events').orderBy('time.date', 'desc').limit(50).get();
    if (snapshot.empty) return { message: '目前資料庫中沒有任何活動' };

    const normalize = (s: string) => s
      .toLowerCase()
      .replace(/[\uff01-\uff5e]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/\s+/g, '');
    const needle = normalize(eventName);
    const buildNgrams = (s: string, n: number) => {
      const r: string[] = [];
      for (let i = 0; i <= s.length - n; i++) r.push(s.slice(i, i + n));
      return r;
    };
    const bigrams = buildNgrams(needle, 2);
    const trigrams = buildNgrams(needle, 3);
    const chars = needle.split('');
    let bestScore = 0;
    let bestDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    snapshot.docs.forEach((docSnap) => {
      const h = normalize(docSnap.data().name || '');
      let score = 0;
      if (h.includes(needle) || needle.includes(h)) score += 3;
      bigrams.forEach((g) => { if (h.includes(g)) score += 1; });
      trigrams.forEach((g) => { if (h.includes(g)) score += 1; });
      chars.forEach((c) => { if (h.includes(c)) score += 0.5; });
      if (score > bestScore) { bestScore = score; bestDoc = docSnap; }
    });
    if (!bestDoc || bestScore < 0.5) {
      const names = snapshot.docs.map((d) => d.data().name).join('\u3001');
      return { message: `找不到符合「${eventName}」的活動。目前已登錄的活動包括：${names}，請確認後再查詢。` };
    }
    const d = (bestDoc as FirebaseFirestore.QueryDocumentSnapshot).data() as any;
    return {
      name: d.name,
      date: d.time?.date || '未提供',
      location: d.details?.location || '未提供',
      isPaidEvent: d.details?.isPaidEvent || false,
      cost: d.details?.cost || 0,
      description: d.content || '無詳細內容介紹',
      matchScore: bestScore
    };
  } catch (error: any) {
    logDetailedError('Error in getEventDetails', error, { eventName });
    return { error: '查詢詳細資料時發生錯誤' };
  }
}

async function checkRegistrationStatus(
  db: admin.firestore.Firestore,
  lineUserId: string | undefined,
  logDetailedError: LogDetailedError
): Promise<any> {
  if (!lineUserId) return { message: '未能取得 LINE 帳號，無法為您查詢。' };
  try {
    const memberProfile = await resolveMemberProfileByLineUserId(db, lineUserId);
    if (!memberProfile.found) {
      return { message: '查詢不到綁定此 LINE 帳號的獅友資料，請先前往網頁端綁定 LINE。' };
    }
    const regSnap = await db.collection('registrations')
      .where('info.memberId', '==', memberProfile.memberId)
      .orderBy('info.timestamp', 'desc')
      .limit(1)
      .get();
    if (regSnap.empty) return { message: '目前找不到您近期的任何報名紀錄。' };
    const regData = regSnap.docs[0].data() as any;
    const eventId = String(regData?.info?.eventId || '');
    const eventSnap = eventId ? await db.collection('events').doc(eventId).get() : null;
    const eventName = eventSnap?.exists ? eventSnap.data()?.name : '未知活動';
    return {
      eventName,
      status: regData.status?.status,
      paymentStatus: regData.status?.paymentStatus,
      aiConfidence: regData.payment?.aiConfidence || '無',
      message: '此為最新一筆活動的審核進度'
    };
  } catch (e: any) {
    logDetailedError('Error in checkRegistrationStatus', e, { lineUserId });
    return { error: '系統查詢資料時發生錯誤' };
  }
}

async function getMembersDirectory(
  db: admin.firestore.Firestore,
  memberProfile: MemberAuthProfile,
  keyword = '',
  limit = 10,
  logDetailedError?: LogDetailedError
): Promise<any> {
  try {
    if (!memberProfile?.found) {
      return { error: '查詢不到綁定此 LINE 帳號的獅友資料。' };
    }
    if (!memberProfile.isAdmin) {
      return { error: '權限不足：僅管理員可查詢會員名冊。' };
    }

    const safeLimit = Math.max(1, Math.min(20, Number.isFinite(limit) ? Math.floor(limit) : 10));
    const snapshot = await db.collection('members').limit(200).get();
    const q = String(keyword || '').trim().toLowerCase();

    const members = snapshot.docs
      .map((doc) => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          name: data?.name || '未命名',
          mobile: data?.contact?.mobile || '',
          email: data?.contact?.email || '',
          lineUserId: maskLineUserId(data?.contact?.lineUserId || ''),
          role: data?.organization?.role || data?.system?.role || data?.role || '',
          status: data?.status?.activeStatus || ''
        };
      })
      .filter((m) => !q || [m.name, m.mobile, m.email, m.role].some((v) => String(v).toLowerCase().includes(q)))
      .slice(0, safeLimit);

    if (members.length === 0) {
      return { message: q ? `找不到符合「${keyword}」的會員資料。` : '目前沒有可顯示的會員資料。' };
    }
    return { members, total: members.length, keyword };
  } catch (error) {
    logDetailedError?.('Error in getMembersDirectory', error, {
      memberId: memberProfile?.memberId,
      keyword,
      limit
    });
    return { error: '系統查詢資料時發生錯誤' };
  }
}
