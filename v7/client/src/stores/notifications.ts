import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuthStore } from './auth';
import type { AppNotification } from 'shared';

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<AppNotification[]>([]);
  const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length);
  const loading = ref(false);
  let unsubscribe: any = null;

  const authStore = useAuthStore();

  function startListening() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    
    if (!authStore.isAuthenticated || !authStore.user) {
      notifications.value = [];
      return;
    }

    const { uid } = authStore.user;
    const isPending = authStore.isPendingMember;
    const isAdmin = authStore.isAdmin;

    const targets = [uid];
    if (!isPending) targets.push('all');
    if (isAdmin) targets.push('admin');

    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', targets),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    loading.value = true;
    unsubscribe = onSnapshot(q, (snap) => {
      loading.value = false;
      const results: AppNotification[] = [];
      snap.forEach(docSnap => {
        results.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
      });
      notifications.value = results;
    }, (error) => {
      console.error('Error fetching notifications:', error);
      loading.value = false;
    });
  }

  function stopListening() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    notifications.value = [];
  }

  async function markAsRead(id: string) {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
      // 樂觀更新 UI
      const index = notifications.value.findIndex(n => n.id === id);
      if (index !== -1) {
        notifications.value[index].isRead = true;
      }
    } catch (e) {
      console.error('Failed to mark read:', e);
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.value.filter(n => !n.isRead).map(n => n.id);
    for (const id of unreadIds) {
      if (id) await markAsRead(id);
    }
  }

  // 監聽 Auth Store 狀態，自動啟動/關閉監聽
  watch(() => authStore.isAuthenticated, (newVal) => {
    if (newVal && authStore.isReady) {
      startListening();
    } else {
      stopListening();
    }
  }, { immediate: true });

  watch(() => authStore.isReady, (ready) => {
    if (ready && authStore.isAuthenticated) {
      startListening();
    }
  });

  return {
    notifications,
    unreadCount,
    loading,
    startListening,
    stopListening,
    markAsRead,
    markAllAsRead
  };
});
