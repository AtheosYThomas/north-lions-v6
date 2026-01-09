
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock Firebase module BEFORE importing router or store
vi.mock('../src/firebase', () => ({
  auth: {},
  db: {},
}));

// Mock Firebase Auth and Firestore
// Important: Make onAuthStateChanged trigger immediately
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback(null); // Simulate "Not Logged In" by default
    return () => {}; // Unsubscribe function
  }),
  signOut: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getFirestore: vi.fn(),
}));

// Mock Components
vi.mock('../src/views/DashboardView.vue', () => ({ default: { template: '<div>Dashboard</div>' } })); 
vi.mock('../src/views/LoginView.vue', () => ({ default: { template: '<div>Login</div>' } }));
vi.mock('../src/views/EventListView.vue', () => ({ default: { template: '<div>Events</div>' } }));
vi.mock('../src/views/EventDetailView.vue', () => ({ default: { template: '<div>Event Detail</div>' } }));

// Import router and store AFTER mocks
import router from '../src/router';
import { useUserStore } from '../src/stores/user';

describe('Navigation Guard', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    
    // Reset router to initial state if possible, or just push to a neutral route
    // Note: In real app, initAuth calls onAuthStateChanged. 
    // Since our mock calls callback(null) immediately, the promise should resolve.
    
    router.push('/login'); // Start at login to avoid triggering guard immediately in beforeEach
    await router.isReady();
  });

  it('redirects to login if trying to access protected route (events) without auth', async () => {
    const store = useUserStore();
    // store.initAuth() will be called by router guard
    
    await router.push('/events');
    expect(router.currentRoute.value.name).toBe('login');
  });

  it('redirects to login if trying to access dashboard without auth', async () => {
    await router.push('/');
    expect(router.currentRoute.value.name).toBe('login');
  });

  it('allows access to protected route if authenticated', async () => {
    const store = useUserStore();
    store.isAuthenticated = true; // Manually set auth state
    store.isLoading = false;      // Ensure loading is false to bypass the await initAuth check in guard

    // We need to bypass the real initAuth logic in the guard if we manually set state
    // Or we mock onAuthStateChanged to return a user.
    // Let's rely on the store state since the guard checks !store.isAuthenticated
    
    // However, the guard does: if (store.isLoading) await store.initAuth();
    // So we must ensure store.initAuth() resolves.
    // With our mock, it resolves immediately with null user (clearing user).
    // So we need to be careful.
    
    // Better approach: Mock initAuth on the store instance itself? No, that's hard with Pinia.
    // Let's just set isLoading = false. 
    // If isLoading is false, the guard skips await store.initAuth().
    
    await router.push('/');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });
});
