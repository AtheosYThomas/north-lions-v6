
<script setup lang="ts">
import { onMounted } from 'vue';
import { useEventStore } from '../stores/event';
import { useRoute, useRouter } from 'vue-router';

const store = useEventStore();
const route = useRoute();
const router = useRouter();

onMounted(() => {
  const eventId = route.params.id as string;
  if (eventId) {
    store.fetchEvent(eventId);
  }
});

const formatDate = (dateInput: any) => {
  if (!dateInput) return '';
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  return date.toLocaleString();
};

const goBack = () => {
  router.push('/events');
};
</script>

<template>
  <div class="p-4 max-w-4xl mx-auto">
    <button @click="goBack" class="mb-4 text-blue-500 hover:underline">&larr; Back to List</button>

    <div v-if="store.loading" class="text-gray-500">Loading...</div>
    <div v-else-if="store.error" class="text-red-500">{{ store.error }}</div>
    
    <div v-else-if="store.currentEvent" class="bg-white rounded-lg shadow p-6">
      <div class="h-64 bg-gray-200 rounded mb-6 flex items-center justify-center overflow-hidden">
         <img v-if="store.currentEvent.system.coverImage" :src="store.currentEvent.system.coverImage" alt="cover" class="h-full w-full object-cover" />
         <span v-else class="text-gray-400 text-2xl">No Cover Image</span>
      </div>

      <div class="flex justify-between items-start mb-4">
        <h1 class="text-3xl font-bold">{{ store.currentEvent.name }}</h1>
        <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{{ store.currentEvent.category }}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
            <h3 class="font-semibold text-gray-700">Time & Location</h3>
            <p><strong>Date:</strong> {{ formatDate(store.currentEvent.time.date) }}</p>
            <p><strong>Time:</strong> {{ formatDate(store.currentEvent.time.start) }} - {{ formatDate(store.currentEvent.time.end) }}</p>
            <p><strong>Location:</strong> {{ store.currentEvent.details.location }}</p>
            <p><strong>Deadline:</strong> {{ formatDate(store.currentEvent.time.deadline) }}</p>
        </div>
        <div>
            <h3 class="font-semibold text-gray-700">Cost & Quota</h3>
            <p><strong>Cost:</strong> {{ store.currentEvent.details.isPaidEvent ? `$${store.currentEvent.details.cost}` : 'Free' }}</p>
            <p><strong>Quota:</strong> {{ store.currentEvent.details.quota }}</p>
            <p><strong>Registered:</strong> {{ store.currentEvent.stats.registeredCount }}</p>
        </div>
      </div>

      <div class="mb-8">
        <h3 class="font-semibold text-gray-700 mb-2">Description</h3>
        <p class="whitespace-pre-wrap">{{ store.currentEvent.publishing.content }}</p>
      </div>

      <!-- Action Buttons (Placeholder) -->
      <div class="flex gap-4">
        <button class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50">
            Register Now
        </button>
      </div>
    </div>
    
    <div v-else class="text-center text-gray-500">
      Event not found.
    </div>
  </div>
</template>
