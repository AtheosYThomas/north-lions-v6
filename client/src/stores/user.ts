
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { Member } from 'shared/types';

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<Member | null>(null);
  const isAuthenticated = ref(false);
  const isLoading = ref(true);

  function setUser(user: Member) {
    currentUser.value = user;
    isAuthenticated.value = true;
  }

  function clearUser() {
    currentUser.value = null;
    isAuthenticated.value = false;
  }

  const initPromise = ref<Promise<void> | null>(null);

  function initAuth() {
    if (initPromise.value) return initPromise.value;

    initPromise.value = new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        isLoading.value = true;
        if (user) {
          try {
            const docRef = doc(db, 'members', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setUser({ id: user.uid, ...docSnap.data() } as Member);
            } else {
              // Handle new user case where Firestore doc might be created by Functions slightly later
              // or just allow basic auth state but user needs to register
              console.warn('User authenticated but no member profile found yet.');
              // We keep the user logged in (isAuthenticated = true) but currentUser might be null or partial
              // However, current logic in setUser requires Member
              // Let's retry once if needed or just clear. 
              // Better: For now clear, but in production we might want a retry loop.
              clearUser();
            }
          } catch (error) {
            console.error('Error fetching member profile:', error);
            clearUser();
          }
        } else {
          clearUser();
        }
        isLoading.value = false;
        resolve();
        // We don't unsubscribe here because we want to listen for future changes
      });
    });
    return initPromise.value;
  }

  async function logout() {
    await signOut(auth);
    clearUser();
  }

  return { currentUser, isAuthenticated, isLoading, setUser, clearUser, initAuth, logout };
});
