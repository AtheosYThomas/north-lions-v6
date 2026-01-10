
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import AnnouncementListView from '../src/views/AnnouncementListView.vue';
import { useAnnouncementStore } from '../src/stores/announcement';

// Mock Firebase
vi.mock('../src/firebase', () => ({
  auth: {},
  db: {},
  functions: {}
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { announcements: [] } })),
  getFunctions: vi.fn()
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getFirestore: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('Announcement System', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches announcements on mount', () => {
    const store = useAnnouncementStore();
    const fetchSpy = vi.spyOn(store, 'fetchAnnouncements');
    
    mount(AnnouncementListView);
    expect(fetchSpy).toHaveBeenCalled();
  });
});
