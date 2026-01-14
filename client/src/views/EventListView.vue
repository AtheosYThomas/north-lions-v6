
<script setup lang="ts">
import { onMounted } from 'vue';
import { useEventStore } from '../stores/event';
import { useRouter } from 'vue-router';

const store = useEventStore();
const router = useRouter();

onMounted(() => {
  store.fetchEvents();
});

const goToDetail = (id: string) => {
  router.push(`/events/${id}`);
};

// Helper to format date
const formatDate = (dateInput: any) => {
  if (!dateInput) return '';
  // Handle Firestore Timestamp or Date string
  const date = dateInput && dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

const getEventDate = (event: any) => {
  return event.time?.date || event.info?.date || event.publishing?.publishTime;
};
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">活動列表 (Events)</h1>
    
    <div v-if="store.loading" class="text-gray-500">Loading...</div>
    <div v-else-if="store.error" class="text-red-500">{{ store.error }}</div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="event in store.events" 
        :key="event.id" 
        class="border rounded-lg p-4 shadow hover:shadow-lg cursor-pointer transition"
        @click="event.id && goToDetail(event.id)"
      >
        <div class="h-40 bg-gray-200 rounded mb-2 flex items-center justify-center">
            <img v-if="event.system.coverImage" :src="event.system.coverImage" alt="cover" class="h-full w-full object-cover rounded" />
            <span v-else class="text-gray-400">No Image</span>
        </div>
        <h2 class="text-xl font-semibold">{{ event.name }}</h2>
        <p class="text-sm text-gray-600">
          {{ formatDate(getEventDate(event)) }} | {{ event.details.location }}
        </p>
        <div class="mt-2">
            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{{ event.category }}</span>
        </div>
      </div>
      
      <div v-if="store.events.length === 0" class="col-span-full text-center text-gray-500">
        No events found.
      </div>
    </div>
  </div>
</template>
