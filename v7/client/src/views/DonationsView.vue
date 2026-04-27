<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 border-l-4 border-indigo-600 pl-4 py-1">我的繳費與捐款紀錄</h1>
        <p class="text-gray-500 mt-2 ml-5 text-sm">
          查詢個人歷史捐款及繳費明細
        </p>
      </div>
    </div>

    <!-- 我的個人摘要 -->
    <div class="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6 mb-8 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
      <div>
        <h3 class="text-lg font-bold text-indigo-900 mb-1">感謝您的支持與奉獻</h3>
        <p class="text-sm text-indigo-700">您對外社會服務與對內的參與，都是獅子會前進的動力。</p>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm w-full md:w-auto min-w-[200px] flex justify-between items-center ring-1 ring-black/5">
        <div>
          <span class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">累計已收訖總額</span>
          <span class="block text-2xl font-bold text-gray-900 mt-1">NT$ {{ totalDonationsAmount.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- 紀錄列表清單 -->
    <div class="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">


      <!-- 資料表 -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">日期</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">類別項目</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">付款方式</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">金額</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">狀態</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr v-if="donationsStore.loading">
              <td colspan="5" class="px-6 py-8 text-center text-gray-500 text-sm">
                 <span class="inline-flex animate-pulse">正在載入紀錄中...</span>
              </td>
            </tr>
            <tr v-else-if="displayDonations.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-gray-400">
                目前沒有任何紀錄
              </td>
            </tr>
            <tr v-else v-for="d in displayDonations" :key="d.id" class="hover:bg-gray-50 transition">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDateTime(d.date) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <span class="bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 px-2 py-0.5 rounded mr-2">
                  {{ d.category }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ d.payment.method === 'cash' ? '💵 現金' : '🏦 匯款 (' + d.payment.accountLast5 + ')' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border-l border-gray-100 bg-gray-50/30">
                NT$ {{ Number(d.amount).toLocaleString() }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      :class="d.audit.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'">
                  {{ d.audit.status === 'approved' ? '已收訖' : '待確認' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useDonationsStore } from '../stores/donations';

const authStore = useAuthStore();
const donationsStore = useDonationsStore();

// 動態計算已收訖的捐款/繳費總額
const totalDonationsAmount = computed(() => {
   return displayDonations.value
     .filter(d => d.audit?.status === 'approved')
     .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
});

const displayDonations = ref<any[]>([]);

onMounted(async () => {
   const uid = authStore.user?.memberId || authStore.user?.uid;

   if (uid) {
     displayDonations.value = await donationsStore.fetchMyDonations(uid);
   }
});

const formatDateTime = (ts: any) => {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString();
};
</script>
