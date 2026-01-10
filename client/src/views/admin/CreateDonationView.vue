
<script setup lang="ts">
import { ref } from 'vue';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const error = ref('');

const form = ref({
  memberId: '', // To be filled manually or selected. For simplicity, manual input of UID/ID now.
  donorName: '',
  amount: 0,
  category: 'annual_fund',
  date: new Date().toISOString().split('T')[0],
  paymentMethod: 'cash',
  receiptRequired: false
});

const handleCreate = async () => {
  loading.value = true;
  error.value = '';
  try {
    const createDonation = httpsCallable(functions, 'createDonation');
    
    await createDonation({
        memberId: form.value.memberId,
        donorName: form.value.donorName,
        amount: form.value.amount,
        category: form.value.category,
        date: new Date(form.value.date || new Date()).toISOString(),
        payment: {
            method: form.value.paymentMethod,
            accountLast5: ''
        },
        receipt: {
            isRequired: form.value.receiptRequired
        }
    });

    alert('捐款紀錄建立成功！');
    router.push('/donations'); // Or stay and clear form?
  } catch (e: any) {
    error.value = e.message || '建立失敗';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-2xl mx-auto bg-white p-6 rounded shadow mt-6">
    <h1 class="text-2xl font-bold mb-6">新增捐款紀錄 (Admin)</h1>
    
    <form @submit.prevent="handleCreate" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">會員 ID (Member ID)</label>
        <input type="text" v-model="form.memberId" required class="mt-1 block w-full border rounded p-2" placeholder="輸入會員UID">
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700">捐款人姓名</label>
        <input type="text" v-model="form.donorName" required class="mt-1 block w-full border rounded p-2">
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
        <label class="block text-sm font-medium text-gray-700">項目分類</label>
        <select v-model="form.category" class="mt-1 block w-full border rounded p-2">
            <option value="annual_fund">年度活動基金</option>
            <option value="emergency_relief">急難救助金</option>
            <option value="other">其他</option>
        </select>
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
        <input type="checkbox" v-model="form.receiptRequired" id="receipt" class="h-4 w-4 text-indigo-600 border-gray-300 rounded">
        <label for="receipt" class="ml-2 block text-sm text-gray-900">需要收據</label>
      </div>

      <div v-if="error" class="text-red-500">{{ error }}</div>

      <button type="submit" :disabled="loading" class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50">
        {{ loading ? '建立中...' : '建立捐款' }}
      </button>
    </form>
  </div>
</template>
