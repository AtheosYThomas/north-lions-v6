
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

const route = useRoute();
const donation = ref<any>(null);
const loading = ref(true);
const error = ref('');

// We can reuse getDonations and filter locally, or ideally implement getDonation(id).
// For now, let's reuse getDonations since we don't have getDonation yet and the list is likely small.
// Or even better, implement a simple specific getter later if needed.
// Actually, let's just use getDonations and find by ID for simplicity as it's already implemented.

const fetchDonation = async () => {
  try {
    const getDonations = httpsCallable(functions, 'getDonations');
    const result = await getDonations();
    const donations = result.data as any[];
    donation.value = donations.find((d: any) => d.id === route.params.id);
    
    if (!donation.value) {
        error.value = '找不到該筆捐款紀錄';
    }
  } catch (e: any) {
    error.value = e.message || '無法取得捐款詳細資料';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchDonation();
});

const formatDate = (isoString: string) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('zh-TW');
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);
};
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="text-center">載入中...</div>
    <div v-else-if="error" class="text-center text-red-600">{{ error }}</div>
    <div v-else class="bg-white shadow overflow-hidden sm:rounded-lg">
      <div class="px-4 py-5 sm:px-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">捐款詳細資料</h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500">ID: {{ donation.id }}</p>
      </div>
      <div class="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl class="sm:divide-y sm:divide-gray-200">
          <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">捐款日期</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ formatDate(donation.date) }}</dd>
          </div>
          <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">捐款人</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ donation.donorName }}</dd>
          </div>
          <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">金額</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ formatCurrency(donation.amount) }}</dd>
          </div>
          <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">捐款項目</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ donation.category }}</dd>
          </div>
          <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">付款方式</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {{ donation.payment.method }} 
                <span v-if="donation.payment.accountLast5">(末五碼: {{ donation.payment.accountLast5 }})</span>
            </dd>
          </div>
          <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">核實狀態</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ donation.audit.status }}</dd>
          </div>
          <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">收據需求</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {{ donation.receipt.isRequired ? '需要' : '不需要' }}
            </dd>
          </div>
           <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6" v-if="donation.receipt.isRequired">
            <dt class="text-sm font-medium text-gray-500">收據狀態</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {{ donation.receipt.status }} ({{ donation.receipt.deliveryMethod }})
            </dd>
          </div>
        </dl>
      </div>
      <div class="px-4 py-3 bg-gray-50 text-right sm:px-6">
          <button type="button" class="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" @click="$router.back()">
            返回列表
          </button>
      </div>
    </div>
  </div>
</template>
