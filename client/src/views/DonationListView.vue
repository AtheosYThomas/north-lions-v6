
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

interface Donation {
  id: string;
  donorName: string;
  amount: number;
  category: string;
  date: string;
  payment: {
    method: string;
    accountLast5: string;
  };
  audit: {
    status: string;
  };
  receipt: {
    status: string;
  };
}

const donations = ref<Donation[]>([]);
const loading = ref(true);
const error = ref('');

const fetchDonations = async () => {
  try {
    const getDonations = httpsCallable(functions, 'getDonations');
    const result = await getDonations();
    donations.value = result.data as Donation[];
  } catch (e: any) {
    error.value = e.message || '無法取得捐款紀錄';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchDonations();
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
        <h1 class="text-xl font-semibold text-gray-900">我的捐款紀錄</h1>
        <p class="mt-2 text-sm text-gray-700">查看您所有的捐款歷史與狀態。</p>
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
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">項目</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">金額</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">付款方式</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">狀態</th>
                  <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span class="sr-only">詳細</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="donation in donations" :key="donation.id">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {{ formatDate(donation.date) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ donation.category }}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ formatCurrency(donation.amount) }}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {{ donation.payment.method }}
                    <span v-if="donation.payment.accountLast5" class="text-xs text-gray-400">({{ donation.payment.accountLast5 }})</span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5"
                      :class="{
                        'bg-green-100 text-green-800': donation.audit.status === 'confirmed',
                        'bg-yellow-100 text-yellow-800': donation.audit.status === 'pending',
                        'bg-red-100 text-red-800': donation.audit.status === 'rejected'
                      }">
                      {{ donation.audit.status === 'confirmed' ? '已核實' : (donation.audit.status === 'pending' ? '待核實' : '已駁回') }}
                    </span>
                  </td>
                  <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <router-link :to="`/donations/${donation.id}`" class="text-indigo-600 hover:text-indigo-900">詳細</router-link>
                  </td>
                </tr>
                <tr v-if="donations.length === 0">
                    <td colspan="6" class="text-center py-4 text-gray-500">目前沒有捐款紀錄</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
