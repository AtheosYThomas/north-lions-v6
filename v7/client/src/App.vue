<template>
  <!-- ── Firebase Auth 初始化中：顯示全螢幕 Loading Spinner ─────────────────
       isReady 為 false 時，整個 UI 都不渲染，徹底避免任何權限按鈕的短暫閃現。
       onAuthStateChanged 的首次回調結束後，isReady 才變為 true，畫面才切換。 -->
  <div v-if="!authStore.isReady" class="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
    <svg class="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p class="text-sm text-gray-500 font-medium tracking-wide">北大獅子會 V7 — 連線中...</p>
  </div>

  <!-- ── Auth 初始化完成：渲染正式 UI ────────────────────────────────────── -->
  <div v-else class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Navbar -->
    <header class="bg-indigo-700 text-white shadow-md relative z-50">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <router-link to="/" class="text-xl font-bold tracking-tight hover:text-gray-200 shrink-0">北大獅子會 V7</router-link>
        
        <div class="flex items-center gap-2 md:gap-4">
          <!-- Notification Bell -->
          <div v-if="authStore.isAuthenticated" class="relative">
            <button @click="toggleNotifications" class="relative p-2 rounded-full text-indigo-200 hover:text-white focus:outline-none transition-colors">
              <span class="sr-only">View notifications</span>
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <!-- Unread Badge -->
              <span v-if="notificationsStore.unreadCount > 0" class="absolute top-1 right-1 block h-2 w-2 rounded-full ring-2 ring-indigo-700 bg-red-500"></span>
            </button>

            <!-- Dropdown Panel -->
            <div v-if="showNotifications" class="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[60]">
              <div class="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-md">
                <h3 class="text-sm font-medium text-gray-900">通知中心</h3>
                <button v-if="notificationsStore.unreadCount > 0" @click="notificationsStore.markAllAsRead" class="text-xs text-indigo-600 hover:text-indigo-800">全部標示為已讀</button>
              </div>
              <div class="max-h-96 overflow-y-auto bg-white rounded-b-md">
                <div v-if="notificationsStore.loading" class="px-4 py-6 text-center text-sm text-gray-500">載入中...</div>
                <div v-else-if="notificationsStore.notifications.length === 0" class="px-4 py-6 text-center text-sm text-gray-500">目前沒有新通知</div>
                <div v-else class="divide-y divide-gray-100">
                  <div v-for="notif in notificationsStore.notifications" :key="notif.id" 
                       @click="handleNotificationClick(notif)"
                       :class="['px-4 py-3 hover:bg-gray-50 cursor-pointer transition flex gap-3', !notif.isRead ? 'bg-indigo-50/50' : '']">
                    <div class="flex-shrink-0 mt-1">
                      <span class="inline-flex h-8 w-8 items-center justify-center rounded-full" :class="getIconColor(notif.type)">
                        <i :class="['pi', getIcon(notif.type), 'text-sm']"></i>
                      </span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 mt-1">{{ notif.title }}</p>
                      <p class="text-xs text-gray-500 line-clamp-2 mt-0.5">{{ notif.message }}</p>
                      <p class="text-[10px] text-gray-400 mt-1">{{ formatDate(notif.createdAt) }}</p>
                    </div>
                    <div v-if="!notif.isRead" class="flex-shrink-0 flex items-center">
                      <span class="h-2 w-2 bg-indigo-600 rounded-full"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mobile Hamburger Button -->
          <button
            type="button"
            data-testid="mobile-menu-toggle"
            class="md:hidden text-indigo-200 hover:text-white p-2 focus:outline-none"
            aria-label="主選單"
            :aria-expanded="showMobileMenu"
            @click="showMobileMenu = !showMobileMenu"
          >
            <svg v-if="!showMobileMenu" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <!-- Desktop Navigation（navItems 單一資料源） -->
          <nav data-testid="desktop-nav" class="hidden md:flex items-center space-x-4 text-sm">
            <router-link
              v-for="item in desktopNavItems"
              :key="item.path"
              :to="item.path"
              :class="['hover:text-gray-200', item.emphasized ? 'text-orange-200 font-bold' : '']"
            >{{ item.name }}</router-link>
            <a v-if="authStore.isAdmin" href="/admin/?refresh=1" class="text-indigo-200 hover:text-white font-bold ml-2">⚙️ 管理後台</a>

            <button v-if="authStore.isAuthenticated" @click="handleLogout" class="bg-white/20 hover:bg-white/30 rounded-md px-3 py-1 transition-colors font-medium ml-2">登出</button>
            <router-link v-else to="/login" class="bg-white/20 hover:bg-white/30 rounded-md px-3 py-1 transition-colors font-medium ml-2">登入</router-link>
          </nav>
        </div>
      </div>

      <!-- Mobile Dropdown Sidebar -->
      <transition 
        enter-active-class="transition duration-200 ease-out" 
        enter-from-class="opacity-0 -translate-y-2" 
        enter-to-class="opacity-100 translate-y-0" 
        leave-active-class="transition duration-150 ease-in" 
        leave-from-class="opacity-100 translate-y-0" 
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="showMobileMenu"
          data-testid="mobile-nav-panel"
          class="md:hidden absolute top-full left-0 w-full bg-indigo-800 shadow-xl border-t border-indigo-700 flex flex-col z-[45]"
        >
          <router-link
            :to="homeNavItem.path"
            class="block px-5 py-4 text-base font-medium hover:bg-indigo-700 border-b border-indigo-700/50"
            @click="closeMobileMenu"
          >{{ homeNavItem.icon }} {{ homeNavItem.name }}</router-link>
          <template v-if="authStore.isAuthenticated">
            <div data-testid="mobile-nav-authenticated-links">
              <router-link
                v-for="item in mobileAuthNavItems"
                :key="item.path"
                :to="item.path"
                class="block px-5 py-4 text-base font-medium hover:bg-indigo-700 border-b border-indigo-700/50"
                :class="item.emphasized ? 'font-bold text-orange-200' : ''"
                @click="closeMobileMenu"
              >{{ item.icon }} {{ item.name }}</router-link>
              <a v-if="authStore.isAdmin" href="/admin/?refresh=1" class="block px-5 py-4 text-base font-bold text-indigo-300 hover:bg-indigo-700 border-b border-indigo-700/50">⚙️ 管理後台</a>
              <button type="button" class="block w-full text-left px-5 py-4 text-base font-medium hover:bg-indigo-700 text-red-200" @click="closeMobileMenu(); handleLogout()">🚪 登出</button>
            </div>
          </template>
          <template v-else>
            <router-link to="/login" class="block px-5 py-4 text-base font-medium hover:bg-indigo-700" @click="closeMobileMenu">🔑 登入</router-link>
          </template>
        </div>
      </transition>
    </header>

    <main class="flex-grow w-full">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="bg-gray-800 text-white text-center py-4 mt-auto">
      <p class="text-sm">© {{ new Date().getFullYear() }} 北大獅子會 V7 測試版</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useNotificationsStore } from './stores/notifications';

/** 主導覽列單一資料源（桌面／手機共用；首頁固定為陣列第一筆 path === '/'） */
type AppNavItem = {
  name: string;
  path: string;
  icon: string;
  requiresAuth: boolean;
  /** 專屬帳單等需強調之項目 */
  emphasized?: boolean;
};

const navItems: AppNavItem[] = [
  { name: '首頁', path: '/', icon: '🏠', requiresAuth: false },
  { name: '會員名冊', path: '/members', icon: '👥', requiresAuth: true },
  { name: '活動管理', path: '/events', icon: '📅', requiresAuth: true },
  { name: '最新公告', path: '/announcements', icon: '📢', requiresAuth: true },
  { name: '捐款與繳費明細', path: '/donations', icon: '💰', requiresAuth: true },
  { name: '個人設定', path: '/profile', icon: '👤', requiresAuth: true },
  { name: '專屬帳單', path: '/billing', icon: '💳', requiresAuth: true, emphasized: true },
];

const homeNavItem = navItems[0];

const authStore = useAuthStore();
const notificationsStore = useNotificationsStore();
const router = useRouter();

const showNotifications = ref(false);
const showMobileMenu = ref(false);

const desktopNavItems = computed(() =>
  navItems.filter((item) => !item.requiresAuth || authStore.isAuthenticated)
);

const mobileAuthNavItems = computed(() => navItems.filter((item) => item.requiresAuth));

const closeMobileMenu = () => {
  showMobileMenu.value = false;
};

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
};

// 點擊外部關閉小鈴鐺或手機選單
const closeNotifications = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (showNotifications.value && !target.closest('.relative')) {
    showNotifications.value = false;
  }
  if (showMobileMenu.value && !target.closest('header')) {
    showMobileMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', closeNotifications);
});

onUnmounted(() => {
  document.removeEventListener('click', closeNotifications);
});

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

const handleNotificationClick = async (notif: any) => {
  if (!notif.isRead) {
    await notificationsStore.markAsRead(notif.id);
  }
  showNotifications.value = false;
  if (notif.actionUrl) {
    router.push(notif.actionUrl);
  }
};

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>
