<script setup lang="ts">
import { useAuthStore } from './stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div v-if="!authStore.isReady" class="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
    Initializing Admin System...
  </div>
  
  <div v-else class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Navbar -->
    <nav v-if="authStore.isAdmin" class="bg-indigo-900 text-white shadow-md z-10 w-full relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:h-16 md:py-0">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-8 min-w-0">
            <h1 class="text-xl font-bold tracking-wider shrink-0">LIONS <span class="font-light text-indigo-300">ADMIN</span></h1>
            <div class="flex flex-wrap gap-x-1 gap-y-1 text-sm -mx-1 md:flex-nowrap md:overflow-x-auto md:pb-0">
              <router-link to="/" class="hover:text-white px-2 py-1 rounded transition whitespace-nowrap" active-class="bg-indigo-700/50 text-white font-bold" exact>儀表板</router-link>
              <router-link to="/billing" class="hover:text-white px-2 py-1 rounded transition whitespace-nowrap" active-class="bg-indigo-700/50 text-white font-bold">批次帳單</router-link>
              <router-link to="/reconciliation" class="hover:text-white px-2 py-1 rounded transition whitespace-nowrap" active-class="bg-indigo-700/50 text-white font-bold">財務對帳</router-link>
              <router-link to="/donations" class="hover:text-white px-2 py-1 rounded transition whitespace-nowrap" active-class="bg-indigo-700/50 text-white font-bold">帳目總表</router-link>
              <router-link to="/feedbacks" class="hover:text-white px-2 py-1 rounded transition whitespace-nowrap" active-class="bg-indigo-700/50 text-white font-bold">對話反饋</router-link>
              <router-link to="/chat-logs" class="hover:text-white px-2 py-1 rounded transition whitespace-nowrap" active-class="bg-indigo-700/50 text-white font-bold">會員對話紀錄</router-link>
            </div>
          </div>
          <div class="flex items-center gap-3 sm:gap-4 shrink-0">
            <a href="/" class="flex text-sm text-indigo-300 hover:text-white transition font-medium items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              回前台
            </a>
            <span class="text-sm text-indigo-200">Hi, Admin</span>
            <button @click="handleLogout" class="text-sm bg-indigo-800 hover:bg-indigo-700 px-4 py-2 rounded-lg transition font-medium">登出</button>
          </div>
        </div>
      </div>
    </nav>
    
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      <router-view />
    </main>
  </div>
</template>
