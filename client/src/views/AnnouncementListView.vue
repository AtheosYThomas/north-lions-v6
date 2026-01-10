
<script setup lang="ts">
import { onMounted } from 'vue';
import { useAnnouncementStore } from '../stores/announcement';
import { useRouter } from 'vue-router';

const store = useAnnouncementStore();
const router = useRouter();

onMounted(() => {
  store.fetchAnnouncements();
});

const goToDetail = (id: string) => {
  router.push(`/announcements/${id}`);
};

const formatDate = (dateInput: any) => {
  if (!dateInput) return '';
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  return date.toLocaleDateString();
};
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">公告消息 (Announcements)</h1>
    
    <div v-if="store.loading" class="text-gray-500">Loading...</div>
    <div v-else-if="store.error" class="text-red-500">{{ store.error }}</div>
    
    <div v-else class="space-y-4">
      <div 
        v-for="announcement in store.announcements" 
        :key="announcement.id" 
        class="border rounded-lg p-4 shadow hover:shadow-lg cursor-pointer transition bg-white"
        @click="announcement.id && goToDetail(announcement.id)"
      >
        <div class="flex justify-between items-center mb-2">
            <h2 class="text-xl font-semibold">{{ announcement.title }}</h2>
            <span class="text-sm text-gray-500">{{ formatDate(announcement.content.date) }}</span>
        </div>
        <p class="text-gray-600 line-clamp-2">
            {{ announcement.content.summary }}
        </p>
        <div class="mt-2">
            <span class="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                {{ announcement.category }}
            </span>
        </div>
      </div>
      
      <div v-if="store.announcements.length === 0" class="text-center text-gray-500 py-8">
        目前沒有最新公告。
      </div>
    </div>
  </div>
</template>
