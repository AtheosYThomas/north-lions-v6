import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore, waitForAuth } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/members',
      name: 'members',
      component: () => import('../views/MembersView.vue')
    },
    {
      path: '/members/:id',
      name: 'member-detail',
      component: () => import('../views/MemberDetailView.vue')
    },
    {
      path: '/events',
      name: 'events',
      component: () => import('../views/EventsView.vue')
    },
    {
      path: '/events/create',
      name: 'create-event',
      component: () => import('../views/admin/CreateEventView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/events/:id',
      name: 'event-detail',
      component: () => import('../views/EventDetailView.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue')
    },
    {
      path: '/billing',
      name: 'billing',
      component: () => import('../views/BillingView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/announcements',
      name: 'announcements',
      component: () => import('../views/AnnouncementsView.vue')
    },
    {
      path: '/announcements/create',
      name: 'create-announcement',
      component: () => import('../views/admin/CreateAnnouncementView.vue')
    },
    {
      path: '/announcements/:id/edit',
      name: 'edit-announcement',
      component: () => import('../views/admin/EditAnnouncementView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/announcements/:id',
      name: 'announcement-detail',
      component: () => import('../views/AnnouncementDetailView.vue')
    },
    {
      path: '/donations',
      name: 'donations',
      component: () => import('../views/DonationsView.vue')
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('../views/NotificationsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/checkin',
      name: 'checkin',
      component: () => import('../views/CheckinView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
});

router.beforeEach(async (to, _from) => {
  // ── Step 1：LINE LIFF state 清洗 ──────────────────────────────────────────
  // liff.init 已在 main.ts 執行完畢，此處安全清洗 liff.state query，
  // 避免 redirect mismatch 迴圈。
  const liffState = to.query['liff.state'] as string;
  if (liffState && typeof liffState === 'string' && liffState.includes('login') && to.path !== '/login') {
    return '/login';
  }

  // Intercept QR Code checkin action
  if (to.query.action === 'checkin' && to.path !== '/checkin') {
    return { path: '/checkin', query: { eventId: to.query.eventId } };
  }

  // ── Step 2：等待 Firebase Auth 初始化完成 ─────────────────────────────────
  // waitForAuth() 是一個只 resolve 一次的 Promise。
  // 它在 main.ts 的 onAuthStateChanged 首次回調（含 Firestore 會員資料拉取）
  // 完成後才解鎖。await 確保後續的 isAdmin / isAuthenticated 是絕對正確的
  // 最終值，不會有「loading 期間誤放行」的 Race Condition。
  await waitForAuth();

  const authStore = useAuthStore();

  // ── Step 3：管理員專屬路由守衛 ────────────────────────────────────────────
  if (to.meta.requiresAdmin || to.path === '/announcements/create' || to.path.includes('/admin/')) {
    if (!authStore.isAdmin) {
      return '/';
    }
  }

  // ── Step 3.5：已登入用戶不得進入純訪客頁面（防止在登入頁看到混亂狀態）────
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return '/';
  }

  // ── Step 4：登入者可存取的保護路由（含會員名冊）──────────────────────────
  if (to.meta.requiresAuth || to.path.startsWith('/members') || to.path === '/profile' || to.path === '/donations' || to.path.startsWith('/events') || to.path.startsWith('/announcements')) {
    if (!authStore.isAuthenticated) {
      return '/login';
    }
  }

  // ── Step 5：潛在會員越權防護 ────────────────────────────────────────────
  // 如果是潛在會員，除了 /profile 和首頁，不得進入其他保護頁面
  if (authStore.isPendingMember) {
    const allowedForPending = ['/', '/login', '/profile', '/checkin'];
    if (!allowedForPending.includes(to.path) && !to.path.startsWith('/checkin')) {
      return '/';
    }
  }

  return true;
});

export default router;
