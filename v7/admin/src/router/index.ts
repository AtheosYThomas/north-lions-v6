import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore, waitForAuth } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/reconciliation',
      name: 'reconciliation',
      component: () => import('../views/ReconciliationView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/billing',
      name: 'billing',
      component: () => import('../views/BillingView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/billing/:id/reconciliation',
      name: 'billing-reconciliation',
      component: () => import('../views/BillingReconciliationView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/donations',
      name: 'donations',
      component: () => import('../views/DonationsView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/donations/new',
      name: 'donations-new',
      component: () => import('../views/CreateDonationView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/feedbacks',
      name: 'feedbacks',
      component: () => import('../views/FeedbacksView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/chat-logs',
      name: 'chat-logs',
      component: () => import('../views/ChatLogsView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ]
});

router.onError((error, to) => {
  const message = String((error as any)?.message || error || '');
  const chunkLoadFailed =
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message);
  if (!chunkLoadFailed || typeof window === 'undefined') return;

  // Prevent infinite reload loops if the new build is unavailable.
  const guardKey = `admin:chunk-reload:${to.fullPath}`;
  if (window.sessionStorage.getItem(guardKey)) return;
  window.sessionStorage.setItem(guardKey, '1');
  window.location.replace(to.fullPath);
});

router.beforeEach(async (to, _from, next) => {
  const liffState = to.query['liff.state'] as string;
  if (liffState && typeof liffState === 'string' && liffState.includes('login') && to.path !== '/login') {
    next({ path: '/login', query: { ...to.query } });
    return;
  }

  await waitForAuth();
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.user) {
    next({ name: 'login' });
  } else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    alert('您沒有管理權限，無法存取此頁面。');
    next({ name: 'dashboard' });
  } else if (to.meta.requiresGuest && authStore.user) {
    next({ name: 'dashboard' });
  } else {
    next();
  }
});

export default router;
