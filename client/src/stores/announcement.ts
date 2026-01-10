
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import type { Announcement } from 'shared/types';

export const useAnnouncementStore = defineStore('announcement', () => {
  const announcements = ref<Announcement[]>([]);
  const currentAnnouncement = ref<Announcement | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchAnnouncements() {
    loading.value = true;
    error.value = null;
    try {
      const getAnnouncements = httpsCallable<unknown, { announcements: Announcement[] }>(functions, 'getAnnouncements');
      const result = await getAnnouncements();
      announcements.value = result.data.announcements;
    } catch (e: any) {
      console.error('Failed to fetch announcements', e);
      error.value = e.message || 'Failed to fetch announcements';
    } finally {
      loading.value = false;
    }
  }

  async function fetchAnnouncement(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const getAnnouncement = httpsCallable<{ id: string }, { announcement: Announcement }>(functions, 'getAnnouncement');
      const result = await getAnnouncement({ id });
      currentAnnouncement.value = result.data.announcement;
    } catch (e: any) {
      console.error('Failed to fetch announcement', e);
      error.value = e.message || 'Failed to fetch announcement';
    } finally {
      loading.value = false;
    }
  }

  return {
    announcements,
    currentAnnouncement,
    loading,
    error,
    fetchAnnouncements,
    fetchAnnouncement
  };
});
