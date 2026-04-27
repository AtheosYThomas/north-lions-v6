<template>
  <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in relative">
    <div class="mb-6 flex justify-between items-center">
      <router-link to="/announcements" class="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center transition-colors">
        <svg class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        返回清單
      </router-link>

      <div class="flex gap-2" v-if="authStore.isAdmin && announcement">
        <button 
          @click="manualPush(announcement.id!)"
          :disabled="pushing"
          class="inline-block border border-blue-300 shadow-sm text-sm px-4 py-2 rounded text-blue-700 bg-blue-50 hover:bg-blue-100 transition disabled:opacity-50"
        >
          {{ pushing ? '發送中...' : '📢 重傳通知' }}
        </button>
        <router-link 
          :to="`/announcements/${announcement.id}/edit`" 
          class="inline-block border border-gray-300 shadow-sm text-sm px-4 py-2 rounded text-gray-700 bg-white hover:bg-gray-50 transition"
        >
          ✏️ 編輯公告
        </router-link>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="bg-white rounded-2xl shadow-sm p-10 animate-pulse">
      <div class="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div class="h-4 bg-gray-200 rounded w-1/5 mb-8"></div>
      <div class="space-y-3">
        <div class="h-4 bg-gray-200 rounded w-full"></div>
        <div class="h-4 bg-gray-200 rounded w-full"></div>
        <div class="h-4 bg-gray-200 rounded w-5/6"></div>
        <div class="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>

    <!-- 找不到資料 -->
    <div v-else-if="!announcement" class="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-12 text-center text-gray-500">
      <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900">找不到這篇公告</h3>
      <p class="mt-1">該筆資料可能已被刪除或權限不足。</p>
    </div>

    <!-- 正常顯示 -->
    <article v-else class="bg-white shadow-xl ring-1 ring-black/5 rounded-2xl overflow-hidden relative">
      <!-- 頂部色塊 -->
      <div class="h-2 w-full" :class="{
        'bg-indigo-500': announcement.category === 'system',
        'bg-sky-500': announcement.category === 'club_affairs',
        'bg-emerald-500': announcement.category === 'meeting',
        'bg-amber-500': announcement.category === 'activity_preview',
        'bg-gray-400': !['system', 'meeting', 'activity_preview', 'club_affairs'].includes(announcement.category)
      }"></div>
      
      <div class="p-8 sm:p-12">
        <div class="flex flex-wrap items-center gap-4 mb-6">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                :class="{
                  'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20': announcement.category === 'system',
                  'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20': announcement.category === 'club_affairs',
                  'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20': announcement.category === 'meeting',
                  'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20': announcement.category === 'activity_preview',
                  'bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-600/20': !['system', 'meeting', 'activity_preview', 'club_affairs'].includes(announcement.category)
                }">
            {{ getCategoryName(announcement.category) }}
          </span>
          <span class="text-sm text-gray-500 flex items-center">
            <svg class="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {{ formatDate(announcement.content.date) }}
          </span>
          <span v-if="announcement.settings?.isPinned" class="text-sm font-bold text-red-500 flex items-center">
            📌 重要置頂
          </span>
        </div>

        <h1 class="text-3xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">
          {{ announcement.title }}
        </h1>
        
        <div class="prose prose-indigo prose-lg max-w-none text-gray-700 whitespace-pre-line leading-relaxed mb-10">
          {{ announcement.content.body }}
        </div>

        <!-- 附件區塊 -->
        <div v-if="announcement.content.attachments && announcement.content.attachments.length > 0" class="mt-8 border-t border-gray-100 pt-8">
          <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
            附件下載
          </h3>
          <ul class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <li v-for="(file, idx) in announcement.content.attachments" :key="idx" class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-start justify-between">
              <div class="flex items-start overflow-hidden">
                <svg class="flex-shrink-0 h-6 w-6 text-indigo-500 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div class="truncate">
                  <a :href="file.url" target="_blank" rel="noopener noreferrer" class="text-sm font-medium text-indigo-600 hover:text-indigo-800 truncate block">
                    {{ file.name }}
                  </a>
                  <span v-if="file.size" class="text-xs text-gray-500">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
      
      <div class="bg-gray-50 px-8 py-4 sm:px-12 text-sm text-gray-500 border-t border-gray-100 flex justify-between">
        <span>發布者 ID: {{ announcement.publishing.publisherId }}</span>
        <span>狀態: {{ announcement.status.status === 'published' ? '已發布' : '草稿' }}</span>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAnnouncementsStore } from '../stores/announcements';
import { useAuthStore } from '../stores/auth';
import type { Announcement } from 'shared';

const route = useRoute();
const router = useRouter();
const announcementsStore = useAnnouncementsStore();
const authStore = useAuthStore();

const announcement = ref<Announcement | null>(null);
const loading = ref(true);
const pushing = ref(false);

const manualPush = async (annId: string) => {
  if (!confirm('確定要針對此公告重新發送 LINE 推播通知嗎？')) {
    return;
  }
  
  pushing.value = true;
  try {
    const pushFn = httpsCallable(functions, 'manualPushAnnouncement');
    await pushFn({ announcementId: annId });
    alert('推播已成功發送！');
  } catch (error: any) {
    console.error('Failed to manually push announcement:', error);
    alert('發送失敗：' + (error.message || '未知錯誤'));
  } finally {
    pushing.value = false;
  }
};

onMounted(async () => {
  const id = route.params.id as string;
  if (!id) {
    router.push('/announcements');
    return;
  }
  
  announcement.value = await announcementsStore.fetchAnnouncementById(id);
  // Optional: check permissions for draft reading
  loading.value = false;
});

const getCategoryName = (cat: string) => {
  const map: Record<string, string> = {
    system: '系統公告',
    club_affairs: '會務公告',
    meeting: '例會通知',
    activity_preview: '活動訊息'
  };
  return map[cat] || '一般公告';
};

const formatDate = (dateObj: any) => {
  if (!dateObj) return '';
  const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
