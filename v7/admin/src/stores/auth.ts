import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import type { Member } from 'shared';

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

  const init = () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (firebaseUser.uid === 'dev-admin') {
          user.value = {
            uid: 'dev-admin',
            email: 'dev-admin@example.com',
            memberData: { name: '開發測試管理員', system: { role: 'Admin' } }
          };
          isAuthenticated.value = true;
          loading.value = false;
          isReady.value = true;
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
          console.error("Failed to load admin profile", e);
          user.value = null;
          isAuthenticated.value = false;
        }
      } else {
        user.value = null;
        isAuthenticated.value = false;
      }
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
      return cred.user;
  };

  const isAdmin = computed(() => {
    if (!user.value) return false;
    if (user.value.uid === 'dev-admin') return true;

    const sysRole = user.value.memberData?.system?.role;
    const baseRole = user.value.memberData?.role;
    const memberPosition = user.value.memberData?.position;

    return String(sysRole).toLowerCase() === 'admin' || 
           String(baseRole).toLowerCase() === 'admin' || 
           user.value.email === 'admin@example.com' ||
           (memberPosition && (memberPosition.includes('會長') || memberPosition.includes('秘書') || memberPosition.includes('財務')));
  });

  const logout = async () => {
    try {
      await signOut(auth);
    } catch(e) {}
    user.value = null;
    isAuthenticated.value = false;
  };

  return { user, isAuthenticated, loading, isReady, isAdmin, init, loginWithEmail, logout };
});
