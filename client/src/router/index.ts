
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
    }
  ]
});

router.beforeEach(async (to, _from, next) => {
  const store = useUserStore();
  
  // Wait for initial auth check to complete
  if (store.isLoading) {
    await store.initAuth();
  }

  if (to.meta.requiresAuth && !store.isAuthenticated) {
    next({ name: 'login' });
    return;
  }

  // Check registration status
  if (store.isAuthenticated) {
    const isPending = store.currentUser?.status?.activeStatus === 'pending_registration';
    
    // If pending and not going to register page, redirect to register
    if (isPending && to.name !== 'register') {
      next({ name: 'register' });
      return;
    }

    // If active and trying to go to register page, redirect to home
    if (!isPending && to.name === 'register') {
      next({ name: 'dashboard' });
      return;
    }
  }

  next();
});

export default router;
