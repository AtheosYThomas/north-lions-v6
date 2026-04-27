<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useChatLogsStore, type ChatLogRecord, type ChatLogTimeRange } from '../stores/chatLogs';
import { useMembersStore } from '../stores/members';

type ConversationRow = {
  id: string;
  timestamp: any;
  memberLabel: string;
  sourceType: ChatLogRecord['sourceType'];
  userText: string;
  replyText: string;
};

const chatLogsStore = useChatLogsStore();
const membersStore = useMembersStore();
const keyword = ref('');
const selectedTimeRange = ref<ChatLogTimeRange>('all');

const memberNameByLineId = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const member of membersStore.members) {
    const lineId = String((member as any)?.contact?.lineUserId || '').trim();
    if (lineId) map[lineId] = (member as any)?.name || '未命名會員';
  }
  return map;
});

const memberNameByMemberId = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const member of membersStore.members) {
    const memberId = String((member as any)?.id || '').trim();
    if (memberId) map[memberId] = (member as any)?.name || '未命名會員';
  }
  return map;
});

const formatDateTime = (timestamp: any) => {
  if (!timestamp) return '時間未知';
  const ms = typeof timestamp?.toDate === 'function'
    ? timestamp.toDate().getTime()
    : typeof timestamp?.seconds === 'number'
      ? timestamp.seconds * 1000
      : new Date(timestamp).getTime();
  if (!Number.isFinite(ms)) return '時間未知';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const sourceLabel = (sourceType: ChatLogRecord['sourceType']) => {
  if (sourceType === 'text') return 'Text';
  if (sourceType === 'image') return 'Image';
  if (sourceType === 'postback') return 'Postback';
  if (sourceType === 'follow') return 'Follow';
  if (sourceType === 'system') return 'System';
  return 'Unknown';
};

const resolveMemberLabel = (log: ChatLogRecord) => {
  if (log.memberName) return log.memberName;
  const memberId = String(log.memberId || '').trim();
  if (memberId && memberNameByMemberId.value[memberId]) return memberNameByMemberId.value[memberId];
  const lineId = String(log.lineUserId || '').trim();
  if (lineId && memberNameByLineId.value[lineId]) return memberNameByLineId.value[lineId];
  return memberId || lineId || '未綁定訪客';
};

const allConversationRows = computed<ConversationRow[]>(() => {
  const rows: ConversationRow[] = [];
  const logs = chatLogsStore.logs;
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    if (log.role !== 'user') continue;
    const userKey = String(log.lineUserId || log.memberId || '');
    let replyText = '-';
    for (let j = i - 1; j >= 0; j--) {
      const nextLog = logs[j];
      const nextUserKey = String(nextLog.lineUserId || nextLog.memberId || '');
      if (nextLog.role === 'assistant' && nextUserKey === userKey) {
        replyText = nextLog.text || '-';
        break;
      }
      if (nextLog.role === 'user' && nextUserKey === userKey) {
        break;
      }
    }
    rows.push({
      id: log.id,
      timestamp: log.timestamp,
      memberLabel: resolveMemberLabel(log),
      sourceType: log.sourceType,
      userText: log.text || '-',
      replyText
    });
  }
  return rows;
});

const conversationRows = computed<ConversationRow[]>(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return allConversationRows.value;
  return allConversationRows.value.filter((row) => {
    return [
      row.memberLabel,
      row.sourceType,
      row.userText,
      row.replyText
    ].some((field) => String(field || '').toLowerCase().includes(q));
  });
});

const handleLoadMore = async () => {
  await chatLogsStore.loadMoreLogs();
};

const handleTimeRangeChange = async () => {
  await chatLogsStore.setTimeRange(selectedTimeRange.value);
};

onMounted(() => {
  chatLogsStore.fetchLogs(50);
  membersStore.fetchMembers();
});
</script>

<template>
  <div class="space-y-4">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <h1 class="text-2xl font-bold text-gray-800">對話與反饋紀錄</h1>
      <p class="text-sm text-gray-500 mt-2">
        顯示近期會員與 LINE 智慧助理互動紀錄（已自動隱藏 ping 健康檢查，支援分頁載入）。
      </p>
      <div class="mt-4">
        <div class="flex flex-col sm:flex-row gap-3">
          <input
            v-model="keyword"
            type="text"
            placeholder="關鍵字搜尋（目前已載入資料）"
            class="w-full sm:max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <select
            v-model="selectedTimeRange"
            @change="handleTimeRangeChange"
            class="w-full sm:w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="all">全部時間</option>
            <option value="today">今天</option>
            <option value="7days">近 7 天</option>
            <option value="30days">近 30 天</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="chatLogsStore.loading" class="bg-white rounded-xl border border-gray-100 p-6 text-sm text-gray-500">
      載入紀錄中...
    </div>
    <div v-else-if="chatLogsStore.error" class="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
      讀取失敗：{{ chatLogsStore.error }}
    </div>
    <div v-else-if="conversationRows.length === 0" class="bg-white rounded-xl border border-gray-100 p-6 text-sm text-gray-500">
      目前沒有可顯示的對話紀錄。
    </div>

    <div v-else class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-[1100px] w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">時間</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">會員身分</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">觸發來源</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">對話內容</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">AI / 系統回覆</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="row in conversationRows" :key="row.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{{ formatDateTime(row.timestamp) }}</td>
              <td class="px-4 py-3 text-sm text-gray-700">{{ row.memberLabel }}</td>
              <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{{ sourceLabel(row.sourceType) }}</td>
              <td class="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words">{{ row.userText }}</td>
              <td class="px-4 py-3 text-sm text-indigo-900 whitespace-pre-wrap break-words">{{ row.replyText }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="border-t border-gray-100 p-4 flex items-center justify-between">
        <p class="text-xs text-gray-500">
          已載入 {{ allConversationRows.length }} 筆對話
        </p>
        <button
          v-if="chatLogsStore.hasMore"
          @click="handleLoadMore"
          :disabled="chatLogsStore.loading"
          class="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ chatLogsStore.loading ? '載入中...' : '載入更多' }}
        </button>
        <span v-else class="text-xs text-gray-400">已載入全部可用資料</span>
      </div>
    </div>
  </div>
</template>
