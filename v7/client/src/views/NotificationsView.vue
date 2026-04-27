<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <span>🔔</span> 通知中心
      </h1>
      <button 
        v-if="notificationsStore.unreadCount > 0" 
        @click="notificationsStore.markAllAsRead()"
        class="text-sm px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors font-medium">
        全部標示為已讀
      </button>
    </div>

    <div class="bg-white shadow sm:rounded-md">
      <div v-if="notificationsStore.loading" class="px-4 py-12 text-center text-gray-500">
        載入中...
      </div>
      <div v-else-if="notificationsStore.notifications.length === 0" class="px-4 py-12 text-center text-gray-500 flex flex-col items-center">
        <i class="pi pi-check-circle text-4xl text-green-300 mb-3"></i>
        <p>目前沒有任何新通知</p>
      </div>
      <ul v-else role="list" class="divide-y divide-gray-200">
        <li v-for="notif in notificationsStore.notifications" :key="notif.id" 
            class="hover:bg-gray-50 transition cursor-pointer"
            :class="!notif.isRead ? 'bg-indigo-50/30' : ''"
            @click="handleClick(notif)">
          <div class="px-4 py-4 sm:px-6 flex items-start gap-4">
            <div class="flex-shrink-0 mt-1">
              <span class="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" :class="getIconColor(notif.type)">
                <i :class="['pi', getIcon(notif.type), 'text-lg']"></i>
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900 truncate" :class="!notif.isRead ? 'font-bold' : ''">
                  {{ notif.title }}
                </p>
                <div class="ml-2 flex flex-shrink-0">
                  <p class="inline-flex text-xs text-gray-500">
                    {{ formatDate(notif.createdAt) }}
                  </p>
                </div>
              </div>
              <div class="mt-2">
                <p class="text-sm text-gray-600 line-clamp-3">
                  {{ notif.message }}
                </p>
              </div>
            </div>
            <div v-if="!notif.isRead" class="mt-2 flex-shrink-0">
               <span class="h-3 w-3 inline-block bg-indigo-600 rounded-full"></span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNotificationsStore } from '../stores/notifications';
import { useRouter } from 'vue-router';
import type { AppNotification } from 'shared';

const notificationsStore = useNotificationsStore();
const router = useRouter();

const getIcon = (type: string) => {
  switch (type) {
    case 'activity': return 'pi-calendar';
    case 'announcement': return 'pi-megaphone';
    case 'billing': return 'pi-dollar';
    case 'social': return 'pi-users';
    case 'registration': return 'pi-check-square';
    case 'system': return 'pi-shield';
    default: return 'pi-bell';
  }
};

const getIconColor = (type: string) => {
  switch (type) {
    case 'activity': return 'bg-blue-100 text-blue-600';
    case 'announcement': return 'bg-yellow-100 text-yellow-600';
    case 'billing': return 'bg-red-100 text-red-600';
    case 'social': return 'bg-purple-100 text-purple-600';
    case 'registration': return 'bg-green-100 text-green-600';
    case 'system': return 'bg-gray-200 text-gray-700';
    default: return 'bg-indigo-100 text-indigo-600';
  }
};

const formatDate = (ts: any) => {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const handleClick = async (notif: AppNotification) => {
  if (!notif.isRead && notif.id) {
    await notificationsStore.markAsRead(notif.id);
  }
  if (notif.actionUrl) {
    router.push(notif.actionUrl as string);
  }
};
</script>
