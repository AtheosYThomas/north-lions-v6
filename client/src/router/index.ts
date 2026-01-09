
import { createRouter, createWebHistory } from 'vue-router';
import HelloWorld from '../components/HelloWorld.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HelloWorld
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/events',
      name: 'event-list',
      component: () => import('../views/EventListView.vue')
    },
    {
      path: '/events/:id',
      name: 'event-detail',
      component: () => import('../views/EventDetailView.vue')
    }
  ]
});

export default router;
