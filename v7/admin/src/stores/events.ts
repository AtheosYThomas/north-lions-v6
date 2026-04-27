import { defineStore } from 'pinia';
import { ref } from 'vue';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Event } from 'shared';

export const useEventsStore = defineStore('events', () => {
  const events = ref<(Event & { id: string })[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchEvents = async () => {
    loading.value = true;
    error.value = null;
    try {
      const q = query(collection(db, 'events'));
      const snapshot = await getDocs(q);
      events.value = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Event) }));
    } catch (e: any) {
      error.value = e.message;
      console.error(e);
    } finally {
      loading.value = false;
    }
  };

  const getEventById = async (id: string) => {
    try {
      const docRef = doc(db, 'events', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...(docSnap.data() as Event) };
      }
      return null;
    } catch (e: any) {
      console.error(e);
      return null;
    }
  };

  const createEvent = async (data: Omit<Event, 'id'>) => {
    try {
      // 自動帶入建立時間與確保 status 有預設值
      const payload = {
        ...data,
        createdAt: serverTimestamp(),
        status: {
          eventStatus: data.status?.eventStatus || 'published',
          registrationStatus: data.status?.registrationStatus || '即將開放',
        }
      };
      const docRef = await addDoc(collection(db, 'events'), payload);
      events.value.push({ id: docRef.id, ...data });
      return docRef.id;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  const updateEvent = async (id: string, data: Partial<Event>) => {
    try {
      const docRef = doc(db, 'events', id);
      await updateDoc(docRef, data);

      const index = events.value.findIndex(e => e.id === id);
      if (index !== -1) {
        events.value[index] = { ...events.value[index], ...data };
      }
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
      events.value = events.value.filter(e => e.id !== id);
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  };

  return { events, loading, error, fetchEvents, getEventById, createEvent, updateEvent, deleteEvent };
});
