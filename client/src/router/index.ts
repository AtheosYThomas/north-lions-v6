
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

// 修正：移除未使用的 'from' 參數以滿足 noUnusedLocals
router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore() as any

  // 1. 確保初始化完成
  if (!userStore.isInitialized) {
    try {
      await userStore.initAuth()
    } catch (e) {
      console.error('Auth init failed', e)
    }
  }

  // 2. 取得認證與管理員狀態 (使用最寬鬆的讀取方式)
  const isAuthenticated = !!userStore.currentUser
  const profile = userStore.profile || {}
  const system = profile.system || {}
  const isAdmin = profile.role === 'admin' || system.role === 'admin'

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)

  // 3. 判斷邏輯
  if (requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (requiresAdmin && !isAdmin) {
    next('/')
  } else if (to.path === '/login' && isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router;
