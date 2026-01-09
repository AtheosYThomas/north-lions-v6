
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from '../src/stores/user';
import { auth } from '../src/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Mock Firebase
vi.mock('../src/firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initAuth should setup auth listener', () => {
    const store = useUserStore();
    store.initAuth();
    expect(onAuthStateChanged).toHaveBeenCalledWith(auth, expect.any(Function));
  });

  it('isLoading should default to true', () => {
    const store = useUserStore();
    expect(store.isLoading).toBe(true); // Based on implementation
  });
});
