<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
    <div class="sm:flex sm:items-center sm:justify-between mb-8">
      <div>
        <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">最新公告</h1>
        <p class="mt-2 text-sm text-gray-600">隨時掌握獅子會的各項最新消息、活動預告與系統公告。</p>
      </div>
      <div class="mt-4 sm:mt-0 flex gap-3">
        <router-link to="/" class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center">
          回首頁
        </router-link>
        <router-link v-if="authStore.isAdmin" to="/announcements/create" class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          發布新公告
        </router-link>
      </div>
    </div>

    <!-- 載入中狀態 -->
    <div v-if="announcementsStore.loading" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="bg-gray-50/50 rounded-2xl p-6 h-48 animate-pulse border border-gray-100">
        <div class="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div class="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div class="h-4 bg-gray-200 rounded w-full mb-1"></div>
        <div class="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>

    <!-- 錯誤訊息 -->
    <div v-else-if="announcementsStore.error" class="bg-red-50 text-red-600 p-4 rounded-xl text-center">
      ⚠️ {{ announcementsStore.error }}
    </div>

    <!-- 列表為空 -->
    <div v-else-if="announcementsStore.announcements.length === 0" class="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
      <h3 class="mt-2 text-sm font-semibold text-gray-900">目前沒有任何公告</h3>
      <p class="mt-1 text-sm text-gray-500">未來有新消息將會顯示在這裡。</p>
    </div>

    <!-- 公告列表 -->
    <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="item in announcementsStore.announcements" :key="item.id" 
           class="relative bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6 transition-all hover:shadow-md hover:-translate-y-1 flex flex-col cursor-pointer"
           @click="viewDetail(item.id!)">
        
        <!-- 裝飾色塊 -->
        <div class="absolute top-0 left-0 w-full h-1" 
             :class="{
              'bg-indigo-500': item.category === 'system',
               'bg-sky-500': item.category === 'club_affairs',
               'bg-emerald-500': item.category === 'meeting',
               'bg-amber-500': item.category === 'activity_preview',
               'bg-gray-400': !['system', 'meeting', 'activity_preview', 'club_affairs'].includes(item.category)
             }">
        </div>

        <div class="flex justify-between items-start mb-3">
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="{
                  'bg-indigo-50 text-indigo-700': item.category === 'system',
                  'bg-sky-50 text-sky-700': item.category === 'club_affairs',
                  'bg-emerald-50 text-emerald-700': item.category === 'meeting',
                  'bg-amber-50 text-amber-700': item.category === 'activity_preview',
                  'bg-gray-100 text-gray-800': !['system', 'meeting', 'activity_preview', 'club_affairs'].includes(item.category)
                }">
            {{ getCategoryName(item.category) }}
          </span>
          <span class="text-xs text-gray-400">{{ formatDate(item.content.date) }}</span>
        </div>
        
        <h2 class="text-xl font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
          <span v-if="item.settings?.isPinned" class="mr-1 text-red-500" title="置頂公告">📌</span>
          {{ item.title }}
        </h2>
        
        <p class="text-gray-600 text-sm line-clamp-3 mb-6 flex-grow">{{ item.content.summary || '點擊查看詳細內容' }}</p>
        
        <div class="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
          <span class="text-indigo-600 font-medium flex items-center">
            閱讀全文 <span aria-hidden="true" class="ml-1">&rarr;</span>
          </span>
          <span v-if="authStore.isAdmin && item.status.status === 'draft'" class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
            草稿
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnnouncementsStore } from '../stores/announcements';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const announcementsStore = useAnnouncementsStore();
const authStore = useAuthStore();

onMounted(() => {
  announcementsStore.fetchAnnouncements();
});

const viewDetail = (id: string) => {
  router.push(`/announcements/${id}`);
};

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
  // 處理 Firestore Timestamp
  const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
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
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
