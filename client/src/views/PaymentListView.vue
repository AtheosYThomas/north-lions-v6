
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

interface Payment {
  id: string;
  payerName: string;
  amount: number;
  date: string;
  method: {
    type: string;
    accountLast5: string;
  };
  audit: {
    isConfirmed: boolean;
  };
  system: {
    eventName: string;
  };
}

const payments = ref<Payment[]>([]);
const loading = ref(true);
const error = ref('');

const fetchPayments = async () => {
  try {
    const getPayments = httpsCallable(functions, 'getPayments');
    const result = await getPayments();
    payments.value = result.data as Payment[];
  } catch (e: any) {
    error.value = e.message || '無法取得繳費紀錄';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchPayments();
});

const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString('zh-TW');
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900">我的繳費紀錄</h1>
        <p class="mt-2 text-sm text-gray-700">查看您參加活動或其他項目的繳費狀態。</p>
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
                  <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">日期</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">活動/項目</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">金額</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">繳費方式</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">確認狀態</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="payment in payments" :key="payment.id">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {{ formatDate(payment.date) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ payment.system.eventName || '一般繳費' }}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ formatCurrency(payment.amount) }}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ payment.method.type }}
                    <span v-if="payment.method.accountLast5" class="text-xs text-gray-400">({{ payment.method.accountLast5 }})</span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5"
                      :class="{
                        'bg-green-100 text-green-800': payment.audit.isConfirmed,
                        'bg-yellow-100 text-yellow-800': !payment.audit.isConfirmed
                      }">
                      {{ payment.audit.isConfirmed ? '已確認' : '待確認' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="payments.length === 0">
                    <td colspan="5" class="text-center py-4 text-gray-500">目前沒有繳費紀錄</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
