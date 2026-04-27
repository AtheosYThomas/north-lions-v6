<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 border-l-4 border-indigo-600 pl-4 py-1">捐款與繳費總覽</h1>
        <p class="text-gray-500 mt-2 ml-5 text-sm">
          {{ authStore.isAdmin ? '管理全會財務繳款紀錄' : '查詢個人歷史捐款及繳費明細' }}
        </p>
      </div>
      <div>
        <router-link v-if="authStore.isAdmin" to="/donations/new" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          新增繳款紀錄
        </router-link>
      </div>
    </div>

    <!-- 我的個人摘要 (僅一般會員) -->
    <div v-if="!authStore.isAdmin" class="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6 mb-8 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
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
      <!-- 搜尋篩選區 (只有 Admin 才有) -->
      <div v-if="authStore.isAdmin" class="p-4 bg-gray-50 border-b border-gray-200 flex gap-4 flex-wrap items-center justify-between">
        <div class="flex gap-2 items-center text-sm font-medium text-gray-700">
           🗂️ 全會繳款清單 (最近 100 筆)
        </div>
        <button @click="exportDonationsCsv" class="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-4 rounded shadow-sm transition text-sm flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          匯出 CSV
        </button>
      </div>

      <!-- 資料表 -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">日期</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">類別項目</th>
              <th v-if="authStore.isAdmin" scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">捐款獅友</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">付款方式</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">金額</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">狀態</th>
              <th v-if="authStore.isAdmin" scope="col" class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr v-if="donationsStore.loading">
              <td :colspan="authStore.isAdmin ? 7 : 5" class="px-6 py-8 text-center text-gray-500 text-sm">
                 <span class="inline-flex animate-pulse">正在載入紀錄中...</span>
              </td>
            </tr>
            <tr v-else-if="displayDonations.length === 0">
              <td :colspan="authStore.isAdmin ? 7 : 5" class="px-6 py-12 text-center text-gray-400">
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
              <td v-if="authStore.isAdmin" class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                {{ d.donorName || getMemberName(d.memberId) }}
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
              <td v-if="authStore.isAdmin" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button @click="handleDelete(d.id)" class="text-red-500 hover:text-red-900 transition font-medium">
                  🗑️ 刪除
                </button>
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
import { useMembersStore } from '../stores/members';

const authStore = useAuthStore();
const donationsStore = useDonationsStore();
const membersStore = useMembersStore();

// 動態計算已收訖的捐款/繳費總額
const totalDonationsAmount = computed(() => {
   return displayDonations.value
     .filter(d => d.audit?.status === 'approved')
     .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
});

const displayDonations = ref<any[]>([]);

onMounted(async () => {
   // 確保載入名冊
   if (membersStore.members.length === 0) {
     await membersStore.fetchMembers();
   }

   const uid = authStore.user?.memberId || authStore.user?.uid;

   if (authStore.isAdmin) {
     displayDonations.value = await donationsStore.fetchAllDonations();
   } else if (uid) {
     displayDonations.value = await donationsStore.fetchMyDonations(uid);
   }
});

const getMemberName = (id: string) => {
  const m = membersStore.members.find(x => x.id === id);
  return m ? m.name : id;
};

const formatDateTime = (ts: any) => {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString();
};

const handleDelete = async (id: string) => {
  if (!confirm('確認要刪除這筆帳目紀錄嗎？（刪除後 Firebase 會自動扣除歷史累積總額）')) return;
  const success = await donationsStore.deleteDonation(id);
  if (success) {
    if (authStore.isAdmin) {
       displayDonations.value = await donationsStore.fetchAllDonations();
    }
    alert('已成功刪除');
  }
};

const escapeCsv = (str: any) => str == null ? '""' : '"' + String(str).replace(/"/g, '""') + '"';

const exportDonationsCsv = () => {
    let csvContent = '\uFEFF日期,類別項目,捐款獅友,付款方式,金額,狀態\n';
    displayDonations.value.forEach(d => {
        const dateStr = formatDateTime(d.date);
        const category = d.category || '';
        const name = d.donorName || getMemberName(d.memberId) || '';
        const paymentMethod = d.payment?.method === 'cash' ? '現金' : `匯款 (${d.payment?.accountLast5 || ''})`;
        const amount = Number(d.amount) || 0;
        const status = d.audit?.status === 'approved' ? '已收訖' : '待確認';
        
        csvContent += `${escapeCsv(dateStr)},${escapeCsv(category)},${escapeCsv(name)},${escapeCsv(paymentMethod)},${amount},${escapeCsv(status)}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `全會財務繳費紀錄.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
</script>
