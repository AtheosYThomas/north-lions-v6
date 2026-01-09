
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import type { Event } from 'shared/types';

export const useEventStore = defineStore('event', () => {
  const events = ref<Event[]>([]);
  const currentEvent = ref<Event | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchEvents() {
    loading.value = true;
    error.value = null;
    try {
      const getEvents = httpsCallable<unknown, { events: Event[] }>(functions, 'getEvents');
      const result = await getEvents();
      events.value = result.data.events;
    } catch (e: any) {
      console.error('Failed to fetch events', e);
      error.value = e.message || 'Failed to fetch events';
    } finally {
      loading.value = false;
    }
  }

  async function fetchEvent(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const getEvent = httpsCallable<{ eventId: string }, { event: Event }>(functions, 'getEvent');
      const result = await getEvent({ eventId: id });
      currentEvent.value = result.data.event;
    } catch (e: any) {
      console.error('Failed to fetch event', e);
      error.value = e.message || 'Failed to fetch event';
    } finally {
      loading.value = false;
    }
  }

  return {
    events,
    currentEvent,
    loading,
    error,
    fetchEvents,
    fetchEvent
  };
});
