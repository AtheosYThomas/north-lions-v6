import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { collection, getDocs, limit, orderBy, query, startAfter, where, Timestamp, type QueryConstraint, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '../firebase';

export type ChatLogCategory = 'bug' | 'suggestion' | 'general' | string;
export type ChatLogTimeRange = 'all' | 'today' | '7days' | '30days';

export interface ChatLogRecord {
  id: string;
  lineUserId?: string;
  memberId?: string;
  memberName?: string;
  text: string;
  role: 'user' | 'assistant' | string;
  timestamp: any;
  category: ChatLogCategory;
  sourceType: 'text' | 'image' | 'postback' | 'follow' | 'system' | 'unknown';
}

const HIDDEN_TEXTS = new Set(['ping']);

function normalizeSourceType(data: any, text: string, role: string): ChatLogRecord['sourceType'] {
  const rawSource = String(data?.sourceType || data?.eventType || data?.triggerSource || '').toLowerCase();
  if (['text', 'image', 'postback', 'follow'].includes(rawSource)) {
    return rawSource as ChatLogRecord['sourceType'];
  }
  if (role === 'assistant') return 'system';
  if (/\[image\]|圖片|照片/i.test(text)) return 'image';
  return 'text';
}

function shouldHideLog(data: any, text: string): boolean {
  const role = String(data?.role || 'user').toLowerCase();
  const normalizedText = String(text || '').trim().toLowerCase();
  return role === 'user' && HIDDEN_TEXTS.has(normalizedText);
}

export const useChatLogsStore = defineStore('chatLogs', () => {
  const logs = ref<ChatLogRecord[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pageSize = ref(50);
  const lastVisible = ref<QueryDocumentSnapshot<DocumentData> | null>(null);
  const hasMore = ref(true);
  const timeRange = ref<ChatLogTimeRange>('all');

  const getTimeRangeStartTimestamp = (range: ChatLogTimeRange): Timestamp | null => {
    const now = new Date();
    if (range === 'all') return null;
    if (range === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return Timestamp.fromDate(start);
    }
    const days = range === '7days' ? 7 : 30;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return Timestamp.fromDate(start);
  };

  const resetPaginationState = () => {
    logs.value = [];
    lastVisible.value = null;
    hasMore.value = true;
  };

  const buildQueryConstraints = (isLoadMore: boolean): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [];
    const startTimestamp = getTimeRangeStartTimestamp(timeRange.value);
    if (startTimestamp) {
      constraints.push(where('timestamp', '>=', startTimestamp));
    }
    constraints.push(orderBy('timestamp', 'desc'));
    if (isLoadMore && lastVisible.value) {
      constraints.push(startAfter(lastVisible.value));
    }
    constraints.push(limit(pageSize.value));
    return constraints;
  };

  const mapLogDoc = (doc: QueryDocumentSnapshot<DocumentData>): ChatLogRecord | null => {
    const data = doc.data() as any;
    const text = String(data.text || data.content || '');
    if (shouldHideLog(data, text)) return null;
    const role = String(data.role || 'user');
    return {
      id: doc.id,
      lineUserId: data.lineUserId || '',
      memberId: data.memberId || '',
      memberName: data.memberName || '',
      text,
      role,
      timestamp: data.timestamp || null,
      category: data.category || 'general',
      sourceType: normalizeSourceType(data, text, role)
    } as ChatLogRecord;
  };

  const fetchLogs = async (customLimit?: number) => {
    loading.value = true;
    error.value = null;
    try {
      if (customLimit && customLimit > 0) pageSize.value = customLimit;
      resetPaginationState();
      const q = query(collection(db, 'message_logs'), ...buildQueryConstraints(false));
      const snapshot = await getDocs(q);
      logs.value = snapshot.docs
        .map((doc) => mapLogDoc(doc))
        .filter((item): item is ChatLogRecord => Boolean(item));
      lastVisible.value = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      hasMore.value = snapshot.docs.length === pageSize.value;
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch chat logs';
      console.error(e);
    } finally {
      loading.value = false;
    }
  };

  const loadMoreLogs = async () => {
    if (loading.value || !hasMore.value || !lastVisible.value) return;
    loading.value = true;
    error.value = null;
    try {
      const q = query(collection(db, 'message_logs'), ...buildQueryConstraints(true));
      const snapshot = await getDocs(q);
      const nextLogs = snapshot.docs
        .map((doc) => mapLogDoc(doc))
        .filter((item): item is ChatLogRecord => Boolean(item));
      logs.value = [...logs.value, ...nextLogs];
      lastVisible.value = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : lastVisible.value;
      hasMore.value = snapshot.docs.length === pageSize.value;
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch chat logs';
      console.error(e);
    } finally {
      loading.value = false;
    }
  };

  const bugLogs = computed(() => logs.value.filter((log) => log.category === 'bug'));
  const suggestionLogs = computed(() => logs.value.filter((log) => log.category === 'suggestion'));
  const setTimeRange = async (nextRange: ChatLogTimeRange) => {
    if (timeRange.value === nextRange) return;
    timeRange.value = nextRange;
    resetPaginationState();
    await fetchLogs();
  };

  return {
    logs,
    loading,
    error,
    hasMore,
    timeRange,
    bugLogs,
    suggestionLogs,
    fetchLogs,
    loadMoreLogs,
    setTimeRange
  };
});
