import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export type ChatLogCategory = 'bug' | 'suggestion' | 'general' | string;

export interface ChatLogRecord {
  id: string;
  lineUserId?: string;
  memberId?: string;
  text: string;
  role: 'user' | 'assistant' | string;
  timestamp: any;
  category: ChatLogCategory;
}

export const useChatLogsStore = defineStore('chatLogs', () => {
  const logs = ref<ChatLogRecord[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchLogs = async () => {
    loading.value = true;
    error.value = null;
    try {
      const q = query(
        collection(db, 'message_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      logs.value = snapshot.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          lineUserId: data.lineUserId || '',
          memberId: data.memberId || '',
          text: data.text || data.content || '',
          role: data.role || 'user',
          timestamp: data.timestamp || null,
          category: data.category || 'general'
        };
      });
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch chat logs';
      console.error(e);
    } finally {
      loading.value = false;
    }
  };

  const bugLogs = computed(() => logs.value.filter((log) => log.category === 'bug'));
  const suggestionLogs = computed(() => logs.value.filter((log) => log.category === 'suggestion'));

  return {
    logs,
    loading,
    error,
    bugLogs,
    suggestionLogs,
    fetchLogs
  };
});
