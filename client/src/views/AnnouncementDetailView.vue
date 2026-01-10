
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAnnouncementStore } from '../stores/announcement';

const route = useRoute();
const store = useAnnouncementStore();

onMounted(() => {
  const id = route.params.id as string;
  if (id) {
    store.fetchAnnouncement(id);
  }
});

const formatDate = (dateInput: any) => {
  if (!dateInput) return '';
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};
</script>

<template>
  <div class="p-4 max-w-3xl mx-auto">
    <div v-if="store.loading" class="text-gray-500">Loading...</div>
    <div v-else-if="store.error" class="text-red-500">{{ store.error }}</div>
    
    <div v-else-if="store.currentAnnouncement" class="bg-white rounded-lg shadow-lg p-6">
      <h1 class="text-3xl font-bold mb-2">{{ store.currentAnnouncement.title }}</h1>
      <div class="flex items-center text-sm text-gray-500 mb-6">
        <span>{{ formatDate(store.currentAnnouncement.content.date) }}</span>
        <span class="mx-2">|</span>
        <span class="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
            {{ store.currentAnnouncement.category }}
        </span>
      </div>
      
      <div class="prose max-w-none text-gray-800 whitespace-pre-line">
        {{ store.currentAnnouncement.content.body }}
      </div>

      <div class="mt-8 border-t pt-4 text-sm text-gray-500">
        發布者: {{ store.currentAnnouncement.publishing.publisherId }}
      </div>
    </div>

    <div v-else class="text-center text-gray-500">
      Announcement not found.
    </div>
  </div>
</template>
