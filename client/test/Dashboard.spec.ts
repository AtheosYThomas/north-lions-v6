
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from '../src/stores/user';
import { useEventStore } from '../src/stores/event';
import { mount } from '@vue/test-utils';
import DashboardView from '../src/views/DashboardView.vue';

// Mock Firebase
vi.mock('../src/firebase', () => ({
  auth: {},
  db: {},
  functions: {} // Add functions mock for event store
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

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { events: [] } })),
  getFunctions: vi.fn()
}));

// Mock Router
const push = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  RouterLink: { template: '<a><slot /></a>' }
}));

describe('DashboardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders user information', async () => {
    const userStore = useUserStore();
    userStore.currentUser = {
      name: 'Test Member',
      organization: { title: 'President' },
      status: { activeStatus: 'active' }
    } as any;
    userStore.isAuthenticated = true;

    const wrapper = mount(DashboardView);
    
    expect(wrapper.text()).toContain('Test Member');
    expect(wrapper.text()).toContain('President');
    expect(wrapper.text()).toContain('active');
  });

  it('fetches events on mount', () => {
    const userStore = useUserStore();
    userStore.isAuthenticated = true;
    const eventStore = useEventStore();
    const fetchSpy = vi.spyOn(eventStore, 'fetchEvents');

    mount(DashboardView);

    expect(fetchSpy).toHaveBeenCalled();
  });
});
