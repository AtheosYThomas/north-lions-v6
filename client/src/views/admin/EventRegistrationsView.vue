
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

const route = useRoute();
const registrations = ref<any[]>([]);
const loading = ref(true);
const error = ref('');
const eventId = route.params.id as string;

const fetchRegistrations = async () => {
  try {
    const getEventRegistrations = httpsCallable(functions, 'getEventRegistrations');
    const result = await getEventRegistrations({ eventId });
    // @ts-ignore
    registrations.value = result.data.registrations;
  } catch (e: any) {
    error.value = e.message || '無法取得報名名單';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchRegistrations();
});

const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    // Actually our backend returns serverTimestamp which is a complex object if not converted, 
    // but typically serialized to something readable or we need to handle it.
    // The previous implementation of getMyRegistrations returned `doc.data()` directly. 
    // Firestore Timestamps in HTTPS callable results are often serialized as { _seconds, _nanoseconds } or ISO strings if we converted them.
    // Let's assume we might need to handle ISO or timestamp object.
    
    // In `registrations.ts`, we didn't explicitly convert.
    // So it will likely be an object like { _seconds: ..., _nanoseconds: ... }
    
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
        <h1 class="text-xl font-semibold text-gray-900">活動報名名單</h1>
        <p class="mt-2 text-sm text-gray-700">Event ID: {{ eventId }}</p>
      </div>
      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <button type="button" @click="$router.back()" class="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
          返回
        </button>
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
                  <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">會員姓名</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">報名時間</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">人數 (大/小)</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">狀態</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">付款狀態</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">備註</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="reg in registrations" :key="reg.id">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {{ reg.memberName }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ formatDate(reg.info.timestamp) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ reg.details.adultCount }} / {{ reg.details.childCount }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5"
                      :class="{
                        'bg-green-100 text-green-800': reg.status.status === 'registered',
                        'bg-yellow-100 text-yellow-800': reg.status.status === 'waitlist',
                        'bg-red-100 text-red-800': reg.status.status === 'cancelled'
                      }">
                      {{ reg.status.status }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                     {{ reg.status.paymentStatus }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {{ reg.needs.remark || '-' }}
                  </td>
                </tr>
                <tr v-if="registrations.length === 0">
                    <td colspan="6" class="text-center py-4 text-gray-500">尚無報名資料</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
