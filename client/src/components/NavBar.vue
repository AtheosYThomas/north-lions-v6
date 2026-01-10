<template>
  <nav class="bg-white shadow-md">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <router-link to="/" class="text-xl font-bold text-gray-800">北大獅子會</router-link>
          </div>
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <router-link 
              to="/" 
              class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              active-class="border-indigo-500 text-gray-900"
            >
              首頁
            </router-link>
            <router-link 
              v-if="userStore.isAuthenticated"
              to="/events" 
              class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              active-class="border-indigo-500 text-gray-900"
            >
              活動列表
            </router-link>
            <router-link 
              v-if="userStore.isAuthenticated"
              to="/announcements" 
              class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              active-class="border-indigo-500 text-gray-900"
            >
              公告消息
            </router-link>
            
            <!-- Admin Menu -->
            <div v-if="isAdmin" class="relative ml-3 flex items-center">
                <span class="text-sm font-medium text-gray-500 mr-2">管理:</span>
                <router-link 
                  to="/admin/members" 
                  class="text-gray-500 hover:text-gray-700 text-sm font-medium mr-3"
                >
                  會員
                </router-link>
                <router-link 
                  to="/admin/events/new" 
                  class="text-gray-500 hover:text-gray-700 text-sm font-medium mr-3"
                >
                  新增活動
                </router-link>
                <router-link 
                  to="/admin/announcements/new" 
                  class="text-gray-500 hover:text-gray-700 text-sm font-medium mr-3"
                >
                  發布公告
                </router-link>
                 <router-link 
                  to="/admin/donations/new" 
                  class="text-gray-500 hover:text-gray-700 text-sm font-medium mr-3"
                >
                  新增捐款
                </router-link>
                 <router-link 
                  to="/admin/payments/new" 
                  class="text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  新增繳費
                </router-link>
            </div>

          </div>
        </div>
        <div class="flex items-center">
          <div v-if="userStore.isAuthenticated" class="flex items-center gap-4">
            <div class="text-sm text-gray-700">
              <span class="font-bold">{{ userStore.currentUser?.name }}</span>
              <span class="text-xs text-gray-500 ml-1">{{ userStore.currentUser?.organization?.title }}</span>
            </div>
            <button 
              @click="handleLogout"
              class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm transition"
            >
              登出
            </button>
          </div>
          <div v-else>
            <router-link 
              to="/login"
              class="bg-[#00C300] hover:bg-[#00b300] text-white px-4 py-2 rounded text-sm font-bold transition"
            >
              會員登入
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '../stores/user';
import { useRouter } from 'vue-router';

const userStore = useUserStore();
const router = useRouter();

const isAdmin = computed(() => {
    return userStore.currentUser?.system?.role === 'admin';
});

const handleLogout = async () => {
  await userStore.logout();
  router.push('/login');
};
</script>
