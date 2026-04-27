<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { ChatLogRecord } from '../stores/chatLogs';
import { useChatLogsStore } from '../stores/chatLogs';
import { useMembersStore } from '../stores/members';

type FilterType = 'all' | 'bug' | 'suggestion';

const chatLogsStore = useChatLogsStore();
const membersStore = useMembersStore();
const activeFilter = ref<FilterType>('all');
const selectedLog = ref<ChatLogRecord | null>(null);

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

const filteredLogs = computed(() => {
  if (activeFilter.value === 'bug') return chatLogsStore.bugLogs;
  if (activeFilter.value === 'suggestion') return chatLogsStore.suggestionLogs;
  return chatLogsStore.logs;
});

const contextLogs = computed(() => {
  if (!selectedLog.value) return [];
  const uid = selectedLog.value.lineUserId || selectedLog.value.memberId || '';
  if (!uid) return [selectedLog.value];
  return chatLogsStore.logs
    .filter((log) => (log.lineUserId || log.memberId || '') === uid)
    .sort((a, b) => getTimestampMs(a.timestamp) - getTimestampMs(b.timestamp))
    .slice(-30);
});

const setFilter = (filter: FilterType) => {
  activeFilter.value = filter;
};

const openContext = (log: ChatLogRecord) => {
  selectedLog.value = log;
};

const closeContext = () => {
  selectedLog.value = null;
};

const getTimestampMs = (timestamp: any) => {
  if (!timestamp) return 0;
  if (typeof timestamp?.toDate === 'function') return timestamp.toDate().getTime();
  if (typeof timestamp?.seconds === 'number') return timestamp.seconds * 1000;
  const t = new Date(timestamp).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const formatDateTime = (timestamp: any) => {
  const ms = getTimestampMs(timestamp);
  if (!ms) return '時間未知';
  return new Date(ms).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const previewText = (text: string) => {
  const raw = String(text || '').trim();
  if (!raw) return '（無文字內容）';
  return raw.length > 80 ? `${raw.slice(0, 80)}...` : raw;
};

const categoryClass = (category: string) => {
  if (category === 'bug') return 'bg-red-100 text-red-700 ring-red-200';
  if (category === 'suggestion') return 'bg-amber-100 text-amber-700 ring-amber-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
};

const categoryText = (category: string) => {
  if (category === 'bug') return 'Bug 回報';
  if (category === 'suggestion') return '功能建議';
  return '一般訊息';
};

const roleClass = (role: string) => {
  return role === 'assistant'
    ? 'bg-indigo-50 text-indigo-700 ring-indigo-200'
    : 'bg-emerald-50 text-emerald-700 ring-emerald-200';
};

const displayUserName = (log: ChatLogRecord) => {
  const memberId = String(log.memberId || '').trim();
  if (memberId && memberNameByMemberId.value[memberId]) {
    return memberNameByMemberId.value[memberId];
  }
  const lineId = String(log.lineUserId || '').trim();
  if (lineId && memberNameByLineId.value[lineId]) {
    return memberNameByLineId.value[lineId];
  }
  return '未綁定訪客';
};

const displayUserMeta = (log: ChatLogRecord) => {
  const memberId = String(log.memberId || '').trim();
  if (memberId) return `memberId: ${memberId}`;
  const lineId = String(log.lineUserId || '').trim();
  if (lineId) return `lineId: ${lineId}`;
  return 'lineId: 未提供';
};

onMounted(() => {
  chatLogsStore.fetchLogs();
  membersStore.fetchMembers();
});
</script>

<template>
  <div class="space-y-4">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <h1 class="text-2xl font-bold text-gray-800">對話與反饋紀錄</h1>
      <p class="text-sm text-gray-500 mt-2">
        檢視 LINE 對話紀錄，並快速聚焦 Bug 回報與功能建議。
      </p>

      <div class="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          @click="setFilter('all')"
          :class="activeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          class="px-4 py-2 rounded-lg text-sm font-semibold transition w-full sm:w-auto"
        >
          顯示全部
        </button>
        <button
          @click="setFilter('bug')"
          :class="activeFilter === 'bug' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'"
          class="px-4 py-2 rounded-lg text-sm font-semibold transition w-full sm:w-auto"
        >
          Bug 回報
        </button>
        <button
          @click="setFilter('suggestion')"
          :class="activeFilter === 'suggestion' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'"
          class="px-4 py-2 rounded-lg text-sm font-semibold transition w-full sm:w-auto"
        >
          功能建議
        </button>
      </div>
    </div>

    <div v-if="chatLogsStore.loading" class="bg-white rounded-xl border border-gray-100 p-6 text-sm text-gray-500">
      載入對話紀錄中...
    </div>
    <div v-else-if="chatLogsStore.error" class="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
      讀取失敗：{{ chatLogsStore.error }}
    </div>

    <template v-else>
      <div v-if="filteredLogs.length === 0" class="bg-white rounded-xl border border-gray-100 p-6 text-sm text-gray-500">
        目前沒有符合條件的紀錄。
      </div>

      <!-- Mobile cards -->
      <div v-else class="grid grid-cols-1 gap-3 md:hidden">
        <button
          v-for="log in filteredLogs"
          :key="log.id"
          @click="openContext(log)"
          class="text-left bg-white rounded-xl border border-gray-200 p-4 shadow-sm active:scale-[0.99] transition"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs text-gray-500">{{ formatDateTime(log.timestamp) }}</span>
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset" :class="categoryClass(log.category)">
              {{ categoryText(log.category) }}
            </span>
          </div>
          <p class="mt-2 text-sm font-medium text-gray-900 break-words">
            {{ previewText(log.text) }}
          </p>
          <div class="mt-3 flex items-center justify-between text-xs">
            <span class="inline-flex items-center rounded-full px-2 py-0.5 ring-1 ring-inset" :class="roleClass(log.role)">
              {{ log.role === 'assistant' ? 'AI' : 'User' }}
            </span>
            <span class="text-gray-500 truncate max-w-[55vw]">
              {{ displayUserName(log) }}
            </span>
          </div>
          <div class="mt-1 text-[11px] text-gray-400 truncate">
            {{ displayUserMeta(log) }}
          </div>
        </button>
      </div>

      <!-- Desktop table -->
      <div v-if="filteredLogs.length > 0" class="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-[900px] w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">時間</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">對話內容</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">分類</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">角色</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">使用者</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="log in filteredLogs" :key="log.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{{ formatDateTime(log.timestamp) }}</td>
                <td class="px-4 py-3 text-sm text-gray-900 break-words">{{ previewText(log.text) }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset" :class="categoryClass(log.category)">
                    {{ categoryText(log.category) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset" :class="roleClass(log.role)">
                    {{ log.role === 'assistant' ? 'AI' : 'User' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">
                  <div class="font-medium text-gray-700 whitespace-nowrap">{{ displayUserName(log) }}</div>
                  <div class="text-xs text-gray-400 whitespace-nowrap">{{ displayUserMeta(log) }}</div>
                </td>
                <td class="px-4 py-3 text-right">
                  <button @click="openContext(log)" class="text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
                    查看上下文
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>

  <!-- Context modal -->
  <div v-if="selectedLog" class="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div class="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
      <div class="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-lg font-bold text-gray-900">完整對話上下文</h2>
          <p class="text-xs text-gray-500 truncate">
            {{ displayUserName(selectedLog) }}
          </p>
          <p class="text-[11px] text-gray-400 truncate">
            {{ displayUserMeta(selectedLog) }}
          </p>
        </div>
        <button @click="closeContext" class="text-gray-500 hover:text-gray-700 text-sm font-semibold">關閉</button>
      </div>

      <div class="overflow-y-auto p-4 sm:p-6 space-y-3">
        <div v-for="log in contextLogs" :key="log.id" class="rounded-lg border p-3" :class="log.role === 'assistant' ? 'border-indigo-200 bg-indigo-50/40' : 'border-emerald-200 bg-emerald-50/40'">
          <div class="flex items-center justify-between gap-2 mb-1">
            <div class="flex items-center gap-2 min-w-0">
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset" :class="roleClass(log.role)">
                {{ log.role === 'assistant' ? 'AI' : 'User' }}
              </span>
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset" :class="categoryClass(log.category)">
                {{ categoryText(log.category) }}
              </span>
            </div>
            <span class="text-xs text-gray-500 whitespace-nowrap">{{ formatDateTime(log.timestamp) }}</span>
          </div>
          <p class="text-sm text-gray-800 whitespace-pre-wrap break-words">{{ log.text || '（無文字內容）' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
