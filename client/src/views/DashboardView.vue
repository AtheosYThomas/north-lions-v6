
<script setup lang="ts">
import { useUserStore } from '../stores/user';
import { useEventStore } from '../stores/event';
import { onMounted } from 'vue';

const userStore = useUserStore();
const eventStore = useEventStore();

onMounted(() => {
  if (userStore.isAuthenticated) {
    eventStore.fetchEvents();
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- User Summary Card -->
    <div class="bg-white shadow overflow-hidden sm:rounded-lg">
      <div class="px-4 py-5 sm:px-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">
          會員概況
        </h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500">
          您的個人基本資料與狀態
        </p>
      </div>
      <div class="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl class="sm:divide-y sm:divide-gray-200">
          <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">姓名</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ userStore.currentUser?.name }}</dd>
          </div>
          <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">職務</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ userStore.currentUser?.organization?.title }}</dd>
          </div>
          <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">會員狀態</dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                {{ userStore.currentUser?.status?.activeStatus }}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- Recent Events -->
    <div class="bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 class="text-lg leading-6 font-medium text-gray-900">近期活動</h3>
        <router-link to="/events" class="text-sm text-indigo-600 hover:text-indigo-900">查看全部</router-link>
      </div>
      <ul role="list" class="divide-y divide-gray-200">
        <li v-for="event in eventStore.events.slice(0, 3)" :key="event.id" class="px-4 py-4 sm:px-6 hover:bg-gray-50 transition">
          <router-link :to="`/events/${event.id}`" class="block">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-indigo-600 truncate">{{ event.name }}</p>
              <div class="ml-2 flex-shrink-0 flex">
                <p class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {{ event.category }}
                </p>
              </div>
            </div>
            <div class="mt-2 sm:flex sm:justify-between">
              <div class="sm:flex">
                <p class="flex items-center text-sm text-gray-500">
                   {{ event.details.location }}
                </p>
              </div>
            </div>
          </router-link>
        </li>
        <li v-if="eventStore.events.length === 0" class="px-4 py-4 text-center text-gray-500">
          目前沒有近期活動
        </li>
      </ul>
    </div>
  </div>
</template>
