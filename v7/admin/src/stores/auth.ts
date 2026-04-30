import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '../firebase';
import type { Member } from 'shared';
import { hasManagementAccess } from 'shared/managementAccess';

// 與前台相同：首次 onAuthStateChanged 完成後一次性 resolve，供路由 await（不使用輪詢）
let _authReadyResolve: () => void;
const _authReadyPromise = new Promise<void>((resolve) => {
  _authReadyResolve = resolve;
});
let _authReadyResolved = false;

/** 等待 Firebase Auth 首次初始化完成 */
export const waitForAuth = () => _authReadyPromise;

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null);
  const isAuthenticated = ref(false);
  const loading = ref(true);
  const isReady = ref(false);

  /** 依目前 Firebase User 載入 members/{uid}（供 onAuthStateChanged 與登入流程立即使用） */
  async function hydrateFromFirebaseUser(firebaseUser: User | null) {
    if (!firebaseUser) {
      user.value = null;
      isAuthenticated.value = false;
      return;
    }
    try {
      const docRef = doc(db, 'members', firebaseUser.uid);
      const memberSnap = await getDoc(docRef);
      let memberData = null;
      if (memberSnap.exists()) {
        memberData = memberSnap.data() as Member;
      }
      user.value = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        memberData
      };
      isAuthenticated.value = true;
    } catch (e) {
      console.error('Failed to load admin profile', e);
      user.value = null;
      isAuthenticated.value = false;
    }
  }

  const init = () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      await hydrateFromFirebaseUser(firebaseUser);
      loading.value = false;
      isReady.value = true;
      if (!_authReadyResolved) {
        _authReadyResolved = true;
        _authReadyResolve();
      }
    });
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await hydrateFromFirebaseUser(cred.user);
    return cred.user;
  };

  const isAdmin = computed(() => {
    if (!user.value) return false;
    return hasManagementAccess(user.value.memberData);
  });

  const logout = async () => {
    try {
      await signOut(auth);
    } catch(e) {}
    user.value = null;
    isAuthenticated.value = false;
  };

  return { user, isAuthenticated, loading, isReady, isAdmin, init, loginWithEmail, logout, hydrateFromFirebaseUser };
});
