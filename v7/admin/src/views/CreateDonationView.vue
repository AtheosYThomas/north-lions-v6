<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="flex items-center gap-4 mb-6">
      <router-link to="/donations" class="text-gray-500 hover:text-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </router-link>
      <h1 class="text-2xl font-bold text-gray-900">建檔新繳款 / 捐款紀錄</h1>
    </div>

    <!-- Error Banner -->
    <div v-if="saveError" class="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-red-700 flex justify-between rounded shadow-sm">
      <p>{{ saveError }}</p>
      <button @click="saveError = ''">✖</button>
    </div>

    <form @submit.prevent="submitDonation" class="bg-white shadow-sm rounded-lg border border-gray-200 p-8 space-y-8">
      
      <!-- 付款人與日期 -->
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900 border-b pb-2 mb-4">付款人與日期</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">捐款/繳費會員 *</label>
            <select v-model="formData.memberId" required class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-gray-50 hover:bg-white transition">
              <option value="" disabled selected>請選擇獅友</option>
              <option v-for="m in activeMembers" :key="m.id" :value="m.id">
                {{ m.organization?.title || '會員' }} - {{ m.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">入帳日期 *</label>
            <input v-model="formData.date" type="date" required class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
            <p class="text-xs text-gray-500 mt-1">此筆金額匯入或收齊的實際日期</p>
          </div>
        </div>
      </div>

      <!-- 款項內容 -->
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900 border-b pb-2 mb-4">帳目內容</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">類別項目 *</label>
            <select v-model="formData.category" required class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-indigo-50 font-bold text-indigo-900">
              <option v-for="cat in donationsStore.DONATION_CATEGORIES" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1">入帳金額 (NT$) *</label>
            <input v-model.number="formData.amount" type="number" min="1" required class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-lg font-bold p-2 border" placeholder="5000">
          </div>
          <div class="col-span-1 md:col-span-2">
             <label class="block text-sm font-medium text-gray-700 mb-1">顯示捐贈匿名 (若空白則顯示實名)</label>
             <input v-model="formData.donorName" type="text" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="無名氏 (選填)">
          </div>
        </div>
      </div>

      <!-- 付款與收據 -->
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900 border-b pb-2 mb-4">付款與收據設定</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">付款方式</label>
            <div class="mt-2 space-y-2">
              <div class="flex items-center">
                <input id="cash" type="radio" v-model="formData.payment.method" value="cash" class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300">
                <label for="cash" class="ml-3 block text-sm font-medium text-gray-700">現金面交</label>
              </div>
              <div class="flex items-center">
                <input id="transfer" type="radio" v-model="formData.payment.method" value="transfer" class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300">
                <label for="transfer" class="ml-3 block text-sm font-medium text-gray-700">銀行匯款</label>
              </div>
            </div>
            
            <div v-if="formData.payment.method === 'transfer'" class="mt-3">
               <label class="block text-sm text-gray-600 mb-1">匯款帳號末五碼</label>
               <input v-model="formData.payment.accountLast5" type="text" maxlength="5" class="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="12345">
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg flex flex-col justify-center border border-gray-100">
            <label class="block text-sm font-medium text-gray-700 mb-3">開立實體收據</label>
            <div class="flex items-center">
              <input v-model="formData.receipt.isRequired" id="receipt" type="checkbox" class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
              <label for="receipt" class="ml-3 block text-sm text-gray-900 font-bold">是，需要開立收據給該獅友</label>
            </div>
          </div>
        </div>
      </div>

      <!-- 按鈕區 -->
      <div class="flex justify-end gap-3 pt-4 border-t">
        <router-link to="/donations" class="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 border border-gray-300 rounded shadow-sm transition">
          取消
        </router-link>
        <button type="submit" :disabled="saving" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50">
          {{ saving ? '資料建檔中...' : '確認登錄入帳' }}
        </button>
      </div>

    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMembersStore } from '../stores/members';
import { useDonationsStore } from '../stores/donations';
import { useAuthStore } from '../stores/auth';
import type { Donation } from 'shared';

const router = useRouter();
const membersStore = useMembersStore();
const donationsStore = useDonationsStore();
const authStore = useAuthStore();

const saving = ref(false);
const saveError = ref('');

const activeMembers = computed(() => {
   return membersStore.members.filter(m => m.status?.activeStatus !== 'withdrawn' && m.id !== 'DEV_ADMIN_ID');
});

// 預設表單狀態
const formData = reactive({
  memberId: '',
  donorName: '', // 空白為實名
  amount: 0,
  category: donationsStore.DONATION_CATEGORIES[0], 
  // date 為 HTML YYYY-MM-DD
  date: new Date().toISOString().split('T')[0],
  payment: {
    method: 'cash',
    accountLast5: ''
  },
  receipt: {
    isRequired: false,
    status: 'pending',
    deliveryMethod: ''
  }
});

onMounted(async () => {
    // 若不是 Admin 則沒有權限進入建檔頁面，防呆踢回首頁
    if (!authStore.isAdmin) {
        alert('權限不足，僅系統管理員與財務幹部可手動建檔。');
        router.replace('/');
        return;
    }
    
    if (membersStore.members.length === 0) {
        await membersStore.fetchMembers();
    }
});

const submitDonation = async () => {
   if (!formData.memberId) {
     saveError.value = "請務必選擇一名繳款之獅友";
     return;
   }
   if (formData.amount <= 0) {
     saveError.value = "入帳金額必須大於 0";
     return;
   }
   
   saving.value = true;
   saveError.value = '';

   try {
      const payload: Omit<Donation, 'id'> = {
          memberId: formData.memberId,
          donorName: formData.donorName.trim(),
          amount: formData.amount,
          category: formData.category,
          date: new Date(formData.date), // 將 YYYY-MM-DD 轉回 Date 物件，交給 firebase 自動轉成 Timestamp
          payment: {
             method: formData.payment.method,
             accountLast5: formData.payment.method === 'transfer' ? formData.payment.accountLast5 : ''
          },
          audit: {
             status: 'approved', // Admin 建檔直接批准
             auditor: authStore.user?.uid || 'System'
          },
          receipt: {
             isRequired: formData.receipt.isRequired,
             status: formData.receipt.isRequired ? 'pending' : 'issued',
             deliveryMethod: '面交'
          }
      };

      await donationsStore.createDonation(payload);
      
      alert('登錄成功！Firebase 自動計算總額中...');
      router.push('/donations');
   } catch (e: any) {
      saveError.value = `發生異常：${e.message}`;
   } finally {
      saving.value = false;
   }
};

</script>
