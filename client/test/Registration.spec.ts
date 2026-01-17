
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import RegisterView from '../src/views/RegisterView.vue';
import { useUserStore } from '../src/stores/user';

// Mock Firebase
vi.mock('../src/firebase', () => ({
  auth: {},
  db: {},
  functions: {}
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { success: true } })),
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
  useRoute: () => ({ query: {} }),
}));

describe('RegisterView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('pre-fills name from user store', () => {
    const userStore = useUserStore();
    userStore.currentUser = { name: 'Line User' } as any;

    const wrapper = mount(RegisterView);
    const nameInput = wrapper.find('#name').element as HTMLInputElement;
    expect(nameInput.value).toBe('Line User');
  });

  it('validates required fields', async () => {
    const wrapper = mount(RegisterView);
    await wrapper.find('form').trigger('submit.prevent');
    
    // HTML5 validation prevents submission, but jsdom/happy-dom might not fully enforce it like a browser
    // Here we check if the callable was called. It should strictly enforce validation in the component logic if we implemented manual checks,
    // but the component relies on "required" attribute.
    // Let's check if the button is disabled or if error is shown? 
    // The current implementation relies on browser validation for "required".
    // So let's check input attributes.
    expect(wrapper.find('#name').attributes('required')).toBeDefined();
    expect(wrapper.find('#mobile').attributes('required')).toBeDefined();
  });
});
