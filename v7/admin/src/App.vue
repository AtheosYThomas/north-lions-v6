<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthStore } from './stores/auth';
import { useRouter } from 'vue-router';
import { getMemberSiteUrl } from './lib/publicSiteUrl';

const authStore = useAuthStore();
const router = useRouter();
const mobileMenuOpen = ref(false);
const memberSiteUrl = computed(() =>
  getMemberSiteUrl(typeof window !== 'undefined' ? window.location.hostname : undefined),
);
const navItems = [
  { to: '/', label: '儀表板' },
  { to: '/billing', label: '批次帳單' },
  { to: '/reconciliation', label: '財務對帳' },
  { to: '/donations', label: '帳目總表' },
  { to: '/feedbacks', label: '系統反饋與建議' },
  { to: '/chat-logs', label: '會員對話紀錄' }
];

const handleBackToMain = () => {
  if (typeof window === 'undefined') return;
  mobileMenuOpen.value = false;
  // If admin was opened in a child tab, close it and reveal main-site tab.
  if (window.opener && !window.opener.closed) {
    window.close();
    return;
  }
  window.location.href = `${memberSiteUrl.value}/`;
};

const handleLogout = async () => {
  mobileMenuOpen.value = false;
  await authStore.logout();
  router.push('/login');
};

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
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
        <div class="flex items-center justify-between py-3 md:h-16 md:py-0">
          <div class="flex items-center gap-3 min-w-0">
            <h1 class="text-xl font-bold tracking-wider shrink-0">LIONS <span class="font-light text-indigo-300">ADMIN</span></h1>
            <div class="hidden md:flex md:flex-wrap gap-x-1 gap-y-1 text-sm -mx-1">
              <router-link
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="hover:text-white px-2 py-1 rounded transition whitespace-nowrap"
                active-class="bg-indigo-700/50 text-white font-bold"
                exact
              >
                {{ item.label }}
              </router-link>
            </div>
          </div>
          <div class="hidden md:flex items-center gap-3 sm:gap-4 shrink-0">
            <button
              type="button"
              @click="handleBackToMain"
              class="flex text-sm text-indigo-300 hover:text-white transition font-medium items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              回前台
            </button>
            <span class="text-sm text-indigo-200">Hi, Admin</span>
            <button @click="handleLogout" class="text-sm bg-indigo-800 hover:bg-indigo-700 px-4 py-2 rounded-lg transition font-medium">登出</button>
          </div>

          <button
            type="button"
            class="md:hidden inline-flex items-center justify-center rounded-lg border border-indigo-700/60 bg-indigo-800/50 p-2 hover:bg-indigo-700/60"
            @click="toggleMobileMenu"
            :aria-expanded="mobileMenuOpen"
            aria-label="開關選單"
          >
            <svg v-if="!mobileMenuOpen" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="mobileMenuOpen" class="md:hidden pb-3 space-y-2 border-t border-indigo-700/50 pt-3">
          <div class="grid grid-cols-1 gap-1">
            <router-link
              v-for="item in navItems"
              :key="`mobile-${item.to}`"
              :to="item.to"
              class="px-3 py-2 rounded text-sm hover:bg-indigo-700/50"
              active-class="bg-indigo-700/60 text-white font-bold"
              @click="closeMobileMenu"
              exact
            >
              {{ item.label }}
            </router-link>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-indigo-700/50">
            <button
              type="button"
              @click="handleBackToMain"
              class="flex text-sm text-indigo-300 hover:text-white transition font-medium items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              回前台
            </button>
            <button @click="handleLogout" class="text-sm bg-indigo-800 hover:bg-indigo-700 px-3 py-2 rounded-lg transition font-medium">登出</button>
          </div>
        </div>
      </div>
    </nav>
    
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      <router-view />
    </main>
  </div>
</template>
