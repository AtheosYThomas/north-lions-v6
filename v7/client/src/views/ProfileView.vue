<template>
  <div class="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">個人設定與統計</h1>
      <div v-if="saveSuccess" class="text-sm text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full flex items-center shadow-sm">
        <span class="mr-1">✓</span> 儲存成功
      </div>
    </div>

    <div class="bg-white shadow-xl ring-1 ring-black/5 rounded-2xl overflow-hidden mb-8">
      <!-- Header -->
      <div class="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8 sm:px-8 text-center sm:text-left sm:flex sm:items-center">
        <div 
          @click="triggerFileInput"
          class="h-20 w-20 rounded-full bg-white/20 backdrop-blur-md mx-auto sm:mx-0 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg border border-white/30 cursor-pointer overflow-hidden relative group"
          title="點擊上傳頭像"
        >
          <img v-if="memberData?.photoUrl" :src="memberData.photoUrl" class="h-full w-full object-cover" />
          <span v-else>{{ memberData?.name?.charAt(0) || '?' }}</span>
          <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-none">
            <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
        </div>
        <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileUpload">
        <div class="mt-4 sm:mt-0 sm:ml-6 text-white">
          <h2 class="text-2xl font-bold tracking-tight">{{ memberData?.name || '載入中...' }}</h2>
          <p class="text-emerald-100 mt-1 font-medium">{{ memberData?.organization?.title || '未設定外部頭銜' }}</p>
          <div class="mt-2 inline-flex items-center rounded-md bg-emerald-400/20 px-2 py-1 text-xs font-medium text-emerald-50 ring-1 ring-inset ring-white/10">
            {{ memberData?.status?.membershipType || '潛在會員' }}
          </div>
        </div>
      </div>

      <!-- Form Body -->
      <div v-if="loading" class="p-12 text-center text-gray-500">
        <svg class="animate-spin mx-auto h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <div class="mt-2 text-sm">讀取個人資料中...</div>
      </div>
      <form v-else-if="memberData" @submit.prevent="saveProfile" class="px-6 py-8 sm:px-8 space-y-8">
        
        <!-- Contact -->
        <div>
          <h3 class="text-base font-semibold leading-6 text-gray-900 border-b pb-2 border-gray-200">基本與聯絡資訊 <span class="text-xs font-normal text-gray-500 ml-2">可自由修改</span></h3>
          <div class="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium leading-6 text-gray-900">姓名</label>
              <input v-model="memberData.name" type="text" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6" required />
            </div>
            <div>
              <label class="block text-sm font-medium leading-6 text-gray-900">手機號碼</label>
              <input v-model="memberData.contact.mobile" type="tel" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium leading-6 text-gray-900">Email 電子信箱</label>
              <input v-model="memberData.contact.email" type="email" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6" />
            </div>
            <div>
              <label class="block text-sm font-medium leading-6 text-gray-900 flex items-center">
                LINE User ID 
                <span class="ml-2 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">已綁定</span>
              </label>
              <input :value="memberData.contact.lineUserId" type="text" disabled class="mt-2 block w-full rounded-md border-0 py-2 bg-gray-50 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-200 cursor-not-allowed sm:text-sm sm:leading-6" />
            </div>
            <div>
              <label class="block text-sm font-medium leading-6 text-gray-900">外部頭銜</label>
              <input v-model="memberData.organization.title" type="text" placeholder="例如：某企業執行長" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6" />
            </div>
          </div>
        </div>

        <div class="pt-6 border-t flex justify-end gap-3">
          <button type="submit" :disabled="saving" class="inline-flex justify-center rounded-md bg-emerald-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50 transition-all">
            {{ saving ? '儲存更新中...' : '儲存我的設定' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Stats Section -->
    <div class="bg-white shadow-lg ring-1 ring-black/5 rounded-2xl overflow-hidden p-6 sm:p-8">
      <h3 class="text-lg font-bold leading-6 text-gray-900 border-b pb-4 mb-6 border-gray-100">個人統計與活動紀錄</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        <div class="bg-gray-50 rounded-xl p-4 sm:p-6 text-center border border-gray-100">
          <p class="text-xs sm:text-sm font-medium text-gray-500 mb-1">捐款總額</p>
          <p class="text-xl sm:text-3xl font-extrabold text-emerald-600"><span class="text-lg">$</span>{{ totalDonationAmount.toLocaleString() }}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-4 sm:p-6 text-center border border-gray-100">
          <p class="text-xs sm:text-sm font-medium text-gray-500 mb-1">捐款筆數</p>
          <p class="text-xl sm:text-3xl font-extrabold text-indigo-600">{{ totalDonationCount }}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-4 sm:p-6 text-center border border-gray-100">
          <p class="text-xs sm:text-sm font-medium text-gray-500 mb-1">報名活動數</p>
          <p class="text-xl sm:text-3xl font-extrabold text-blue-600">{{ activeEventCount }}</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-4 sm:p-6 text-center border border-gray-100">
          <p class="text-xs sm:text-sm font-medium text-gray-500 mb-1">會內職務</p>
          <p class="text-sm sm:text-lg font-bold text-gray-800 mt-1 sm:mt-2">{{ memberData?.organization?.role || '無' }}</p>
        </div>
      </div>
      <div class="mt-8 text-sm text-gray-500 text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        如需要查詢詳細的捐款明細或活動報名歷史，請點選上方主選單的「帳目與捐款」或「活動管理」。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useMembersStore } from '../stores/members';
import { useDonationsStore } from '../stores/donations';
import { useRegistrationsStore } from '../stores/registrations';
import type { Member } from 'shared';

const authStore = useAuthStore();
const membersStore = useMembersStore();
const donationsStore = useDonationsStore();
const registrationsStore = useRegistrationsStore();

const loading = ref(true);
const saving = ref(false);
const saveSuccess = ref(false);
const memberData = ref<(Member & { id: string }) | null>(null);
const myDonations = ref<any[]>([]);
const myRegistrations = ref<any[]>([]);

onMounted(async () => {
  if (authStore.user?.uid) {
    const data = await membersStore.getMemberById(authStore.user.uid);
    if (data) {
      memberData.value = JSON.parse(JSON.stringify(data));
    }
    const memberId = authStore.user.memberId || authStore.user.uid;
    myDonations.value = await donationsStore.fetchMyDonations(memberId);
    myRegistrations.value = await registrationsStore.fetchMyRegistrations(memberId);
  }
  loading.value = false;
});

const totalDonationAmount = computed(() => {
    return myDonations.value
        .filter(d => d.audit?.status === 'approved')
        .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
});

const totalDonationCount = computed(() => {
    return myDonations.value.filter(d => d.audit?.status === 'approved').length;
});

const activeEventCount = computed(() => {
    return myRegistrations.value.filter(r => r.status?.status !== '已取消').length;
});

const saveProfile = async () => {
  if (!memberData.value) return;
  saving.value = true;
  saveSuccess.value = false;
  
  const success = await membersStore.updateMember(memberData.value.id, memberData.value);
  if (success) {
    saveSuccess.value = true;
    setTimeout(() => { saveSuccess.value = false }, 3000);
  }
  
  saving.value = false;
};

const fileInput = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !memberData.value) return;

  // ✅ [防呆] 非圖片格式攔截
  if (!file.type.startsWith('image/')) {
    alert(`🚨 格式錯誤！只能上傳圖片檔案（JPG/PNG），不支援「${file.type || '未知格式'}」。`);
    if (fileInput.value) fileInput.value.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 256;
      let width = img.width;
      let height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
      else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        memberData.value!.photoUrl = canvas.toDataURL('image/jpeg', 0.8);
      }
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
</style>
