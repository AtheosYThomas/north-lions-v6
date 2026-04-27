<template>
  <div class="min-h-screen bg-gray-50 pb-20 animate-fade-in relative text-left">
    <!-- Navbar / Header area for composition -->
    <div class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <router-link to="/announcements" class="text-gray-500 hover:text-gray-900 transition flex items-center p-2 -ml-2 rounded-full hover:bg-gray-100">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </router-link>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">新增系統公告</h1>
        </div>
        <div>
          <button @click="submit('published')" :disabled="isSubmitting" class="ml-3 inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all">
            {{ isSubmitting ? '發布中...' : '立即發布' }}
          </button>
        </div>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      <div class="bg-white shadow-xl rounded-2xl overflow-hidden ring-1 ring-gray-900/5 p-8 sm:p-12 border-t-8 border-indigo-600">
        <form @submit.prevent>
          <div class="space-y-8 divide-y divide-gray-200">
            <!-- 區塊 1：基本資訊 -->
            <div class="space-y-8">
              <div>
                <h3 class="text-lg leading-6 font-medium text-gray-900">基本內容設定</h3>
                <p class="mt-1 text-sm text-gray-500">決定公告的標題、屬性分類以及將顯示在清單上的摘要。</p>
              </div>

              <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <!-- 標題 -->
                <div class="sm:col-span-6">
                  <label for="title" class="block text-sm font-medium text-gray-700 mb-1">公告主旨標題 <span class="text-red-500">*</span></label>
                  <input v-model="form.title" type="text" id="title" class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg border p-3 placeholder-gray-400" placeholder="例如：第 35 屆會長交接典禮籌備會議通知">
                </div>

                <!-- 分類 -->
                <div class="sm:col-span-3">
                  <label for="category" class="block text-sm font-medium text-gray-700 mb-1">分類標籤</label>
                  <select v-model="form.category" id="category" class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-3 bg-white">
                    <option value="system">系統公告</option>
                    <option value="club_affairs">會務公告</option>
                    <option value="meeting">例會通知</option>
                    <option value="activity_preview">活動訊息</option>
                  </select>
                </div>
                
                <!-- 選項切換 -->
                <div class="sm:col-span-6 flex gap-6 mt-2 bg-gray-50 p-4 rounded-lg">
                  <label class="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" v-model="form.settings.isPinned" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2">
                    置頂此公告
                  </label>
                  <label class="flex items-center text-sm font-medium text-blue-700 cursor-pointer">
                    <input type="checkbox" v-model="form.enableAutoPush" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2">
                    建立時自動發送 LINE 推播
                  </label>
                </div>

                <!-- 摘要 -->
                <div class="sm:col-span-6">
                  <label for="summary" class="block text-sm font-medium text-gray-700 mb-1">簡短摘要 (純文字顯示於清單頁面)</label>
                  <textarea v-model="form.content.summary" id="summary" rows="2" class="block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 placeholder-gray-400" placeholder="一句話總結此公告內容..."></textarea>
                </div>
              </div>
            </div>

            <!-- 區塊 2：詳細內文 -->
            <div class="pt-8">
              <div>
                <h3 class="text-lg leading-6 font-medium text-gray-900">詳細內文</h3>
                <p class="mt-1 text-sm text-gray-500">使用者點擊進入後所看見的完整文字內容。</p>
              </div>
              <div class="mt-6">
                <textarea v-model="form.content.body" rows="12" class="block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-base p-4" placeholder="在此輸入公告詳細內文... (可換行)"></textarea>
              </div>
            </div>

            <!-- 區塊 3：附件上傳 -->
            <div class="pt-8">
              <div>
                <h3 class="text-lg leading-6 font-medium text-gray-900">新增附件 (選填)</h3>
                <p class="mt-1 text-sm text-gray-500">支援上傳相關文件或圖片 (單檔上限 10MB)。</p>
              </div>
              <div class="mt-4">
                <label class="block mb-2 text-sm font-medium text-gray-900" for="file_input">上傳檔案</label>
                <input class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" id="file_input" type="file" multiple @change="handleFileSelect">
                <!-- 檔案清單 -->
                <ul v-if="selectedFiles.length > 0" class="mt-4 space-y-2">
                  <li v-for="(fileObj, idx) in selectedFiles" :key="idx" class="flex items-center justify-between text-sm py-2 px-3 bg-gray-50 rounded border border-gray-200">
                    <span class="flex items-center truncate max-w-xs">
                      <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                      {{ fileObj.file.name }} ({{ (fileObj.file.size / 1024 / 1024).toFixed(2) }} MB)
                    </span>
                    <button type="button" @click="removeFile(idx)" class="text-red-500 hover:text-red-700 font-medium">移除</button>
                  </li>
                </ul>
              </div>
            </div>
            
            <div v-if="errorMsg" class="pt-6">
               <div class="bg-red-50 text-red-600 border border-red-200 rounded-lg p-4 font-medium text-sm">
                 ❌ {{ errorMsg }}
               </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, toRaw } from 'vue';
import { useRouter } from 'vue-router';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { useAnnouncementsStore } from '../../stores/announcements';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const announcementsStore = useAnnouncementsStore();
const authStore = useAuthStore();

const isSubmitting = ref(false);
const errorMsg = ref('');

const form = ref({
  title: '',
  category: 'system' as any,
  content: {
    body: '',
    summary: '',
    date: new Date(), // Place holder, store will override with serverTimestamp
    attachments: [] as { name: string; url: string; size?: number }[]
  },
  publishing: {
    targetAudience: ['all'],
    publisherId: authStore.user?.uid || 'system',
    publishTime: new Date()
  },
  status: {
    status: 'draft' as any,
    pushStatus: 'none'
  },
  settings: {
    isPushEnabled: false,
    isPinned: false,
    deliveryMethod: 'none',
    replySetting: 'none'
  },
  enableAutoPush: false,
  related: {}
});

const selectedFiles = ref<{ file: File; id: string }[]>([]);

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files) return;

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  for (let i = 0; i < target.files.length; i++) {
    const file = target.files[i];
    if (file.size > MAX_SIZE) {
      alert(`檔案 ${file.name} 超過 10MB 限制，無法加入！`);
      continue;
    }
    selectedFiles.value.push({ file, id: window.crypto.randomUUID() });
  }
  target.value = ''; // Reset input
};

const removeFile = (idx: number) => {
  selectedFiles.value.splice(idx, 1);
};

const uploadAttachments = async (): Promise<{ name: string; url: string; size: number }[]> => {
  const results = [];
  for (const fileObj of selectedFiles.value) {
    const file = toRaw(fileObj.file);
    const fileExt = file.name.split('.').pop() || '';
    const uniqueFileName = `${Date.now()}_${fileObj.id.substring(0,8)}.${fileExt}`;
    const fileRef = storageRef(storage, `announcements/${uniqueFileName}`);
    
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    
    results.push({
      name: file.name,
      size: file.size,
      url
    });
  }
  return results;
};

const submit = async (status: string) => {
  if (!form.value.title.trim()) {
    errorMsg.value = '請輸入公告主旨標題';
    return;
  }
  
  if (!form.value.content.body.trim()) {
     errorMsg.value = '請填寫詳細內文';
     return;
  }

  isSubmitting.value = true;
  errorMsg.value = '';
  form.value.status.status = status;

  try {
    // 若有選擇檔案，先執行上傳
    if (selectedFiles.value.length > 0) {
      const uploadedFiles = await uploadAttachments();
      form.value.content.attachments = uploadedFiles;
    }

    const newId = await announcementsStore.createAnnouncement(form.value);
    console.log('Created announcement', newId);
    router.push('/announcements');
  } catch (err: any) {
    errorMsg.value = err.message || '發布失敗';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
