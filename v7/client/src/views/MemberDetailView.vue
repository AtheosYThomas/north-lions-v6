<template>
  <div class="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
    <div class="mb-6 flex items-center justify-between">
      <router-link to="/members" class="text-sm font-medium text-indigo-600 flex items-center hover:text-indigo-800 transition-colors">
        <svg class="mr-1 h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clip-rule="evenodd" /></svg>
        返回名單
      </router-link>
      <div v-if="saveSuccess" class="text-sm text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full flex items-center shadow-sm">
        <span class="mr-1">✓</span> 儲存成功
      </div>
    </div>

    <div class="bg-white shadow-xl ring-1 ring-black/5 rounded-2xl overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8 sm:px-8 text-center sm:text-left sm:flex sm:items-center">
        <div 
          @click="isAdmin ? triggerFileInput() : null"
          :class="[
            'h-20 w-20 rounded-full backdrop-blur-md mx-auto sm:mx-0 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg border border-white/30 overflow-hidden relative group',
            isAdmin ? 'cursor-pointer bg-white/20' : 'bg-white/10'
          ]"
          :title="isAdmin ? '點擊上傳頭像' : ''"
        >
          <img v-if="memberData?.photoUrl" :src="memberData.photoUrl" class="h-full w-full object-cover" />
          <span v-else>{{ memberData?.name?.charAt(0) || '?' }}</span>
          <div v-if="isAdmin" class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-none">
            <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
        </div>
        <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileUpload">
        <div class="mt-4 sm:mt-0 sm:ml-6 text-white">
          <h2 class="text-2xl font-bold tracking-tight">{{ memberData?.name || '載入中...' }}</h2>
          <p class="text-indigo-100 mt-1 font-medium">{{ memberData?.organization?.title || '未設定外部頭銜' }}</p>
        </div>
      </div>

      <!-- Form Body -->
      <div v-if="loading" class="p-12 text-center text-gray-500">
        <svg class="animate-spin mx-auto h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <div class="mt-2 text-sm">與 Firestore 同步中...</div>
      </div>
      <form v-else-if="memberData" @submit.prevent="saveMember" class="px-6 py-8 sm:px-8 space-y-8">
        
        <!-- Contact -->
        <div>
          <h3 class="text-base font-semibold leading-6 text-gray-900 border-b pb-2 border-gray-200">基本與聯絡資訊</h3>
          <div class="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium leading-6 text-gray-900">姓名</label>
              <input v-model="memberData.name" :disabled="!isAdmin" type="text" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500" required />
            </div>
            <template v-if="isGuarded">
              <div class="sm:col-span-2">
                <div class="rounded-md bg-yellow-50 p-4 border border-yellow-200">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-yellow-800">隱私防護已啟動 (🔒 僅正式會員可見)</h3>
                      <div class="mt-2 text-sm text-yellow-700">
                        <p>為保護社團會員個資，通訊資訊受到最高級別防護。如果您是正式會員，請等待管理員審核您的系統存取權限。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div>
                <label class="block text-sm font-medium leading-6 text-gray-900">手機號碼</label>
                <input v-model="memberData.contact.mobile" :disabled="!isAdmin" type="tel" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium leading-6 text-gray-900">Email 電子信箱</label>
                <input v-model="memberData.contact.email" :disabled="!isAdmin" type="email" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium leading-6 text-gray-900 flex items-center">
                  LINE User ID 
                  <span class="ml-2 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">唯讀 (系統綁定用)</span>
                </label>
                <input v-model="memberData.contact.lineUserId" type="text" disabled placeholder="尚未綁定 LINE 帳號" class="mt-2 block w-full rounded-md border-0 py-2 bg-gray-50 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-200 cursor-not-allowed sm:text-sm sm:leading-6" />
                <p class="mt-1 text-xs text-gray-400">此 ID 供系統與機器人精確辨識該會員身分，具有唯一性，建立後無法手動修改。</p>
              </div>
            </template>
          </div>
        </div>

        <!-- Org & Status -->
        <div>
          <h3 class="text-base font-semibold leading-6 text-gray-900 border-b pb-2 border-gray-200">組織與權限設定</h3>
          <div class="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium leading-6 text-gray-900">外部頭銜</label>
              <input v-model="memberData.organization.title" :disabled="!isAdmin" type="text" placeholder="例如：某某企業董事長" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500" />
            </div>
            <div>
              <label class="block text-sm font-medium leading-6 text-gray-900">會內職務</label>
              <select v-model="memberData.organization.role" :disabled="!isAdmin" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500">
                <option value="">無</option>
                <option value="會長">會長</option>
                <option value="第一副會長">第一副會長</option>
                <option value="第二副會長">第二副會長</option>
                <option value="第三副會長">第三副會長</option>
                <option value="秘書">秘書</option>
                <option value="財務">財務</option>
                <option value="聯絡">聯絡</option>
                <option value="總管">總管</option>
                <option value="常務監事">常務監事</option>
                <option value="常務理事">常務理事</option>
                <option value="理事">理事</option>
                <option value="一般會員">一般會員</option>
              </select>
            </div>
            
            <div class="sm:col-span-2 mt-4 space-y-4 pt-4 border-t border-gray-50">
              <div class="flex gap-4 w-full flex-col sm:flex-row">
                <div class="flex-1">
                  <label class="block text-sm font-medium leading-6 text-gray-900">會員資格</label>
                  <select v-model="memberData.status.membershipType" :disabled="!isAdmin" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500">
                    <option value="創會會員">創會會員</option>
                    <option value="正會員">正會員</option>
                    <option value="贊助會員">贊助會員</option>
                    <option value="潛在">潛在</option>
                  </select>
                </div>
                <div class="flex-1">
                  <label class="block text-sm font-medium leading-6 text-gray-900">活躍狀態</label>
                  <select v-model="memberData.status.activeStatus" :disabled="!isAdmin" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500">
                    <option value="active">活躍使用中</option>
                    <option value="inactive">停用/不活躍</option>
                    <option value="suspended">帳號凍結</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium leading-6 text-gray-900">系統權限 (System Role)</label>
                <select v-model="memberData.system.role" :disabled="!isAdmin" class="mt-2 block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500">
                  <option value="Admin">管理員 (Admin) - 可編輯他人資料</option>
                  <option value="Member">一般會員 (Member) - 只可檢視</option>
                  <option value="Guest">訪客 (Guest) - 無權限</option>
                </select>
                <p class="mt-1 text-xs text-gray-500">管理員權限影響能看到的路由與修改能力。</p>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-6 border-t flex justify-end gap-3 sticky bottom-4 bg-white/90 backdrop-blur-sm -m-6 p-6 sm:static sm:bg-transparent sm:m-0 sm:p-0">
          <router-link to="/members" class="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            返回名錄
          </router-link>
          <button v-if="isAdmin" type="submit" :disabled="saving" class="inline-flex justify-center rounded-md bg-indigo-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-all">
            {{ saving ? '儲存同步中...' : '儲存變更 (管理員功能)' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMembersStore } from '../stores/members';
import { useAuthStore } from '../stores/auth';
import type { Member } from 'shared';

const route = useRoute();
const membersStore = useMembersStore();
const authStore = useAuthStore();

const isAdmin = computed(() => {
  const sysRole = authStore.user?.memberData?.system?.role;
  const rootRole = authStore.user?.memberData?.role;
  return [sysRole, rootRole].some(r => r === 'admin' || r === 'Admin' || r === 'ADMIN');
});

const isGuarded = computed(() => {
  if (!memberData.value) return false;
  return authStore.isPendingMember && 
         memberData.value.id !== authStore.user?.memberId && 
         memberData.value.id !== authStore.user?.uid;
});

const loading = ref(true);
const saving = ref(false);
const saveSuccess = ref(false);
const memberData = ref<(Member & { id: string }) | null>(null);

onMounted(async () => {
  const id = route.params.id as string;
  const data = await membersStore.getMemberById(id);
  if (data) {
    memberData.value = JSON.parse(JSON.stringify(data));
  }
  loading.value = false;
});

const saveMember = async () => {
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
      
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff'; // White background for transparency
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to very small Data URL (avoids Firestore 1MB limits easily)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        memberData.value!.photoUrl = dataUrl;
      }
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
