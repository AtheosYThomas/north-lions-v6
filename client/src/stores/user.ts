
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
  const isInitialized = ref(false);

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
          // Mark as authenticated as soon as Firebase auth reports a user
          isAuthenticated.value = true;
          try {
            const docRef = doc(db, 'members', user.uid);
            // Try a few times because backend Functions may create the profile shortly after auth
            let docSnap = await getDoc(docRef);
            let attempts = 0;
            while (!docSnap.exists() && attempts < 3) {
              // small backoff
              await new Promise(r => setTimeout(r, 500));
              docSnap = await getDoc(docRef);
              attempts++;
            }

            if (docSnap.exists()) {
              setUser({ id: user.uid, ...docSnap.data() } as Member);
            } else {
              // Member profile still not found. Keep the auth state (isAuthenticated=true)
              // but leave currentUser null so UI can treat this as a user that needs registration.
              console.warn('User authenticated but no member profile found after retries.');
            }
          } catch (error) {
            console.error('Error fetching member profile:', error);
            // Don't clear overall auth; keep user authenticated but without profile
          }
        } else {
          // User signed out
          clearUser();
        }
        isLoading.value = false;
        isInitialized.value = true;
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

  return { currentUser, isAuthenticated, isLoading, isInitialized, setUser, clearUser, initAuth, logout };
});
