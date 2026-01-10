
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

const members = ref<any[]>([]);
const loading = ref(true);
const error = ref('');

const fetchMembers = async () => {
  try {
    const getMembers = httpsCallable(functions, 'getMembers');
    const result = await getMembers();
    // @ts-ignore
    members.value = result.data.members;
  } catch (e: any) {
    error.value = e.message || '無法取得會員列表';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchMembers();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900">會員列表管理</h1>
        <p class="mt-2 text-sm text-gray-700">檢視所有會員資料。</p>
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
                  <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">姓名</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">職務</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">手機</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">狀態</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">系統角色</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="member in members" :key="member.id">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {{ member.name }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ member.organization?.title }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ member.contact?.mobile }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                     {{ member.contact?.email }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5"
                      :class="{
                        'bg-green-100 text-green-800': member.status?.activeStatus === 'active',
                        'bg-gray-100 text-gray-800': member.status?.activeStatus !== 'active'
                      }">
                      {{ member.status?.activeStatus }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                     {{ member.system?.role }}
                  </td>
                </tr>
                <tr v-if="members.length === 0">
                    <td colspan="6" class="text-center py-4 text-gray-500">尚無會員資料</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
