import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore, waitForAuth } from '../stores/auth';

const router = createRouter({
  history: createWebHistory('/admin/'), // Base path for admin
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
    }
  ]
});

router.beforeEach(async (to, _from, next) => {
  await waitForAuth();
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.user) {
    next({ name: 'login' });
  } else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    alert('Access denied. Admin only.');
    authStore.logout();
    next({ name: 'login' });
  } else if (to.meta.requiresGuest && authStore.user) {
    next({ name: 'dashboard' });
  } else {
    next();
  }
});

export default router;
