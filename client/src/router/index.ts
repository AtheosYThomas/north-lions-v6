
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../stores/user';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/events',
      name: 'event-list',
      component: () => import('../views/EventListView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/events/:id',
      name: 'event-detail',
      component: () => import('../views/EventDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresAuth: true } 
    },
    {
      path: '/announcements',
      name: 'announcement-list',
      component: () => import('../views/AnnouncementListView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/announcements/:id',
      name: 'announcement-detail',
      component: () => import('../views/AnnouncementDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/donations',
      name: 'donation-list',
      component: () => import('../views/DonationListView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/donations/:id',
      name: 'donation-detail',
      component: () => import('../views/DonationDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/payments',
      name: 'payment-list',
      component: () => import('../views/PaymentListView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/events/new',
      name: 'admin-create-event',
      component: () => import('../views/admin/CreateEventView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/events/:id/registrations',
      name: 'admin-event-registrations',
      component: () => import('../views/admin/EventRegistrationsView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/announcements/new',
      name: 'admin-create-announcement',
      component: () => import('../views/admin/CreateAnnouncementView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/members',
      name: 'admin-member-list',
      component: () => import('../views/admin/MemberListView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/members/:id',
      name: 'admin-member-detail',
      component: () => import('../views/admin/AdminMemberDetailView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/donations/new',
      name: 'admin-create-donation',
      component: () => import('../views/admin/CreateDonationView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/payments/new',
      name: 'admin-create-payment',
      component: () => import('../views/admin/CreatePaymentView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/messages',
      name: 'admin-message-logs',
      component: () => import('../views/admin/MessageLogView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ]
});

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore();

  // 1. 確保初始化完成 (使用 any 檢查以避免 TS 型別錯誤)
  if (!(userStore as any).isInitialized) {
    await userStore.initAuth();
  }

  // 2. 認證與角色判斷
  const isAuthenticated = userStore.isAuthenticated;
  const userData = (userStore.profile || userStore.currentUser) as any;
  const isAdmin = userData?.role === 'admin' || userData?.system?.role === 'admin';

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);

  if (requiresAuth && !isAuthenticated) {
    next({ name: 'login' });
    return;
  }

  if (requiresAdmin && !isAdmin) {
    next({ name: 'dashboard' });
    return;
  }

  if (to.path === '/login' && isAuthenticated) {
    next({ name: 'dashboard' });
    return;
  }

  // 3. 檢查註冊狀態（使用 userStore，避免未定義的 store 變數）
  if (isAuthenticated) {
    const isPending = (userData?.status?.activeStatus) === 'pending_registration';

    if (isPending && to.name !== 'register') {
      next({ name: 'register' });
      return;
    }

    if (!isPending && to.name === 'register') {
      next({ name: 'dashboard' });
      return;
    }
  }

  next();
});

export default router;
