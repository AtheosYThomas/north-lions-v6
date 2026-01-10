
<script setup lang="ts">
import { ref } from 'vue';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const error = ref('');

const form = ref({
  payerName: '',
  memberId: '', // required for 'related.memberId'
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  eventName: '', 
  eventId: '',
  paymentMethod: 'cash',
  isConfirmed: true
});

const handleCreate = async () => {
  loading.value = true;
  error.value = '';
  try {
    const createPayment = httpsCallable(functions, 'createPayment');
    
    await createPayment({
        payerName: form.value.payerName,
        amount: form.value.amount,
        date: new Date(form.value.date || new Date()).toISOString(),
        method: {
            type: form.value.paymentMethod
        },
        audit: {
            isConfirmed: form.value.isConfirmed
        },
        related: {
            memberId: form.value.memberId,
            eventId: form.value.eventId
        },
        system: {
            eventName: form.value.eventName
        }
    });

    alert('繳費紀錄建立成功！');
    router.push('/payments');
  } catch (e: any) {
    error.value = e.message || '建立失敗';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-2xl mx-auto bg-white p-6 rounded shadow mt-6">
    <h1 class="text-2xl font-bold mb-6">新增繳費紀錄 (Admin)</h1>
    
    <form @submit.prevent="handleCreate" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">會員 ID (Member ID)</label>
        <input type="text" v-model="form.memberId" required class="mt-1 block w-full border rounded p-2" placeholder="輸入會員UID">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">繳費者姓名</label>
        <input type="text" v-model="form.payerName" required class="mt-1 block w-full border rounded p-2">
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
            <label class="block text-sm font-medium text-gray-700">金額</label>
            <input type="number" v-model="form.amount" min="1" required class="mt-1 block w-full border rounded p-2">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">日期</label>
            <input type="date" v-model="form.date" required class="mt-1 block w-full border rounded p-2">
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">活動名稱 (Event Name)</label>
        <input type="text" v-model="form.eventName" class="mt-1 block w-full border rounded p-2">
      </div>
      
       <div>
        <label class="block text-sm font-medium text-gray-700">活動 ID (Event ID, Optional)</label>
        <input type="text" v-model="form.eventId" class="mt-1 block w-full border rounded p-2">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">付款方式</label>
        <select v-model="form.paymentMethod" class="mt-1 block w-full border rounded p-2">
            <option value="cash">現金</option>
            <option value="transfer">匯款</option>
            <option value="credit_card">信用卡</option>
        </select>
      </div>

      <div class="flex items-center">
        <input type="checkbox" v-model="form.isConfirmed" id="confirmed" class="h-4 w-4 text-indigo-600 border-gray-300 rounded">
        <label for="confirmed" class="ml-2 block text-sm text-gray-900">立即確認 (Verified)</label>
      </div>

      <div v-if="error" class="text-red-500">{{ error }}</div>

      <button type="submit" :disabled="loading" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {{ loading ? '建立中...' : '建立繳費紀錄' }}
      </button>
    </form>
  </div>
</template>
