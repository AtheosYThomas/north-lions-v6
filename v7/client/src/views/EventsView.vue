<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900">活動管理</h1>
      <router-link v-if="authStore.isAdmin" to="/events/create" class="inline-flex justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow-sm transition w-full sm:w-auto text-center">
        ＋ 發布新活動
      </router-link>
    </div>

    <!-- loading state -->
    <div v-if="eventsStore.loading" class="text-center py-10">
      <p class="text-gray-500">載入中...</p>
    </div>

    <!-- Events List -->
    <div v-else class="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
      <ul class="divide-y divide-gray-200">
        <li v-for="event in eventsStore.events" :key="event.id" class="p-6 hover:bg-gray-50 transition duration-150">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <h2 class="text-xl font-semibold text-gray-800">{{ event.name }}</h2>
              <p class="text-sm text-gray-500 mt-1">地點: {{ event.details?.location || '未定' }} | 日期: {{ event.time?.date || '未定' }}</p>
              <div class="mt-2 flex gap-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ event.category || '活動' }}
                </span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {{ event.status?.eventStatus || '籌備中' }}
                </span>
              </div>
            </div>
            <div class="flex flex-col gap-2 w-full sm:w-auto sm:items-end sm:text-right shrink-0">
              <!-- ✅ [修補] 顯示真實報名人數 (批次查詢，非 N+1) -->
              <p class="text-sm font-medium"
                 :class="isNearFull(event) ? 'text-red-600 font-bold' : 'text-gray-600'">
                報名人數:
                <span v-if="regCountLoading" class="text-gray-400">—</span>
                <span v-else class="font-bold">{{ regCountMap[event.id] ?? 0 }}</span>
                / {{ event.details?.quota || '無上限' }}
                <!-- 名額告急提示 (>=80% 配額) -->
                <span
                  v-if="!regCountLoading && isNearFull(event)"
                  class="ml-1.5 text-xs font-bold text-red-500 animate-pulse"
                >⚠ 名額告急！</span>
              </p>
              <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
                <button
                  v-if="authStore.isAdmin"
                  @click="manualPush(event.id)"
                  :disabled="pushingId === event.id"
                  class="inline-flex justify-center border border-blue-300 shadow-sm text-sm px-4 py-2 rounded text-blue-700 bg-blue-50 hover:bg-blue-100 transition disabled:opacity-50 w-full sm:w-auto"
                >
                  {{ pushingId === event.id ? '發送中...' : '📢 重傳通知' }}
                </button>
                <router-link :to="`/events/${event.id}`" class="inline-flex justify-center border border-gray-300 shadow-sm text-sm px-4 py-2 rounded text-gray-700 hover:bg-gray-50 transition w-full sm:w-auto text-center">
                  {{ authStore.isAdmin ? '編輯活動' : '報名 / 詳情' }}
                </router-link>
              </div>
            </div>
          </div>
        </li>
        <li v-if="eventsStore.events.length === 0" class="p-8 text-center text-gray-500">
          目前沒有任何活動。
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { functions, db } from '../firebase';
import { useEventsStore } from '../stores/events';
import { useAuthStore } from '../stores/auth';

const eventsStore = useEventsStore();
const authStore = useAuthStore();
const pushingId = ref<string | null>(null);

// ✅ [新增] 各活動有效報名人數計數 Map (eventId → count)
const regCountMap = ref<Record<string, number>>({});
const regCountLoading = ref(true);

/**
 * 批次查詢所有非「已取消」的活躍報名紀錄，統計每個活動的有效人數。
 * 使用單次 collection query（非 N+1），不影響讀取效能。
 */
const fetchRegCounts = async () => {
  regCountLoading.value = true;
  try {
    const q = query(
      collection(db, 'registrations'),
      where('status.status', '!=', '已取消')
    );
    const snapshot = await getDocs(q);
    const counts: Record<string, number> = {};
    snapshot.forEach(doc => {
      const eventId = doc.data().info?.eventId;
      if (eventId) {
        counts[eventId] = (counts[eventId] ?? 0) + 1;
      }
    });
    regCountMap.value = counts;
  } catch (e) {
    console.error('[EventsView] fetchRegCounts 失敗:', e);
  } finally {
    regCountLoading.value = false;
  }
};

/** 名額告急判斷：已報名人數 >= 配額的 80% */
const isNearFull = (event: any): boolean => {
  const quota = event.details?.quota;
  if (!quota) return false;
  return (regCountMap.value[event.id] ?? 0) / quota >= 0.8;
};

onMounted(async () => {
  await eventsStore.fetchEvents();
  await fetchRegCounts();
});

const manualPush = async (eventId: string) => {
  if (!confirm('確定要針對此活動重新發送 LINE 推播通知嗎？')) return;

  pushingId.value = eventId;
  try {
    const pushEventFn = httpsCallable(functions, 'manualPushEvent');
    await pushEventFn({ eventId });
    alert('推播已成功發送！');
  } catch (error: any) {
    console.error('Failed to manually push event:', error);
    alert('發送失敗：' + (error.message || '未知錯誤'));
  } finally {
    pushingId.value = null;
  }
};
</script>
