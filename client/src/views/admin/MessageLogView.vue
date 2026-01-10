
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

const logs = ref<any[]>([]);
const loading = ref(true);
const error = ref('');

const fetchLogs = async () => {
  try {
    const getMessageLogs = httpsCallable(functions, 'getMessageLogs');
    const result = await getMessageLogs();
    // @ts-ignore
    logs.value = result.data.logs;
  } catch (e: any) {
    error.value = e.message || '無法取得訊息紀錄';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchLogs();
});

const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000).toLocaleString('zh-TW');
    }
    return new Date(timestamp).toLocaleString('zh-TW');
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900">LINE 訊息紀錄 (Admin)</h1>
        <p class="mt-2 text-sm text-gray-700">檢視系統收到的最近 100 筆 LINE 訊息。</p>
      </div>
    </div>
    
    <div class="mt-8 flex flex-col">
      <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div v-if="loading" class="text-center py-4">載入中...</div>
          <div v-else-if="error" class="text-center py-4 text-red-600">{{ error }}</div>
          <div v-else class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">時間</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">會員姓名</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">內容</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">狀態</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="log in logs" :key="log.id">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {{ formatDate(log.timestamp) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ log.memberName }}
                    <div class="text-xs text-gray-400">{{ log.lineUserId }}</div>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 max-w-md truncate">
                    {{ log.content }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5"
                      :class="{
                        'bg-yellow-100 text-yellow-800': log.status === 'pending',
                        'bg-green-100 text-green-800': log.status === 'completed'
                      }">
                      {{ log.status }}
                    </span>
                  </td>
                </tr>
                <tr v-if="logs.length === 0">
                    <td colspan="4" class="text-center py-4 text-gray-500">尚無訊息紀錄</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
