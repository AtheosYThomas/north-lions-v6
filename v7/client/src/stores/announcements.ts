import { defineStore } from 'pinia';
import { ref } from 'vue';
import { collection, query, orderBy, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Announcement } from 'shared';

export const useAnnouncementsStore = defineStore('announcements', () => {
  const announcements = ref<Announcement[]>([]);
  const loading = ref(false);
  const error = ref('');

  async function fetchAnnouncements() {
    loading.value = true;
    error.value = '';
    try {
      const q = query(collection(db, 'announcements'), orderBy('content.date', 'desc'));
      const querySnapshot = await getDocs(q);
      const items: Announcement[] = [];
      querySnapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Announcement);
      });
      announcements.value = items;
    } catch (err: any) {
      console.error('Failed to fetch announcements:', err);
      error.value = err.message || '無法取得公告資料';
    } finally {
      loading.value = false;
    }
  }

  async function fetchAnnouncementById(id: string): Promise<Announcement | null> {
    try {
      const docRef = doc(db, 'announcements', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Announcement;
      }
      return null;
    } catch (err) {
      console.error(`Failed to fetch announcement ${id}:`, err);
      return null;
    }
  }

  async function createAnnouncement(data: Partial<Announcement>): Promise<string> {
    try {
      // 解構 Vue Reactive Object (Proxy) 以避免 Firebase SDK 發生序列化卡死的問題
      const payload: any = {
        title: data.title,
        category: data.category,
        content: {
          body: data.content?.body || '',
          summary: data.content?.summary || '',
          date: serverTimestamp(),
        },
        publishing: {
          targetAudience: data.publishing?.targetAudience || ['all'],
          publisherId: data.publishing?.publisherId || 'system',
          publishTime: serverTimestamp(),
        },
        status: {
          status: data.status?.status || 'draft',
          pushStatus: data.status?.pushStatus || 'none',
        },
        settings: {
          isPushEnabled: data.settings?.isPushEnabled || false,
          isPinned: data.settings?.isPinned || false,
          deliveryMethod: data.settings?.deliveryMethod || 'none',
          replySetting: data.settings?.replySetting || 'none',
        },
        enableAutoPush: data.enableAutoPush || false
      };

      if (data.content?.attachments) {
        payload.content.attachments = data.content.attachments.map(a => ({
          name: a.name,
          url: a.url,
          size: a.size
        }));
      }

      const docRef = await addDoc(collection(db, 'announcements'), payload);
      await fetchAnnouncements(); // 重新拉取更新後的清單
      return docRef.id;
    } catch (err: any) {
      console.error('Failed to create announcement:', err);
      throw new Error(err.message || '新增公告失敗');
    }
  }

  async function updateAnnouncement(id: string, data: Partial<Announcement>): Promise<boolean> {
    try {
      const { updateDoc } = await import('firebase/firestore');
      const payload: any = {
        title: data.title,
        category: data.category,
        'content.body': data.content?.body || '',
        'content.summary': data.content?.summary || '',
        'status.status': data.status?.status || 'draft',
        'settings.isPinned': data.settings?.isPinned || false,
        enableAutoPush: data.enableAutoPush || false
      };

      if (data.content?.attachments) {
        payload['content.attachments'] = data.content.attachments.map((a: any) => ({
          name: a.name,
          url: a.url,
          size: a.size
        }));
      }

      const docRef = doc(db, 'announcements', id);
      await updateDoc(docRef, payload);
      
      const idx = announcements.value.findIndex(a => a.id === id);
      if (idx !== -1) {
         Object.assign(announcements.value[idx], data);
         announcements.value[idx].enableAutoPush = data.enableAutoPush || false;
      }
      
      return true;
    } catch (err: any) {
      console.error('Failed to update announcement:', err);
      throw new Error(err.message || '更新公告失敗');
    }
  }

  return { announcements, loading, error, fetchAnnouncements, fetchAnnouncementById, createAnnouncement, updateAnnouncement };
});
