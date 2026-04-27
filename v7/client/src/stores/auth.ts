import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import type { Member } from 'shared';

// ─── Auth Ready Promise ───────────────────────────────────────────────────────
// 在 store 模組層級建立一次性 Promise，讓 router.beforeEach 可以 await 等待
// Firebase onAuthStateChanged 的首次回調（含 Firestore 會員資料拉取）確實完成。
let _authReadyResolve: () => void;
const _authReadyPromise = new Promise<void>((resolve) => {
  _authReadyResolve = resolve;
});

/** 等待 Firebase Auth 初始化完成（只在第一次 onAuthStateChanged 回調後 resolve） */
export const waitForAuth = () => _authReadyPromise;

export const useAuthStore = defineStore('auth', () => {
  const cachedUser = sessionStorage.getItem('devUser');
  const user = ref<any>(cachedUser ? JSON.parse(cachedUser) : null);
  const isAuthenticated = ref(!!user.value);
  const loading = ref(true);
  /** true = onAuthStateChanged 首次回調已完成，isAdmin / isAuthenticated 均已確定 */
  const isReady = ref(false);

  async function setUser(firebaseUser: any) {
    if (!firebaseUser) {
      user.value = null;
      isAuthenticated.value = false;
      sessionStorage.removeItem('devUser');
      return;
    }

    // 如果是開發測試帳號，直接模擬具備管理員權限的會員
    if (firebaseUser.uid === 'dev-admin') {
      const devProfile = {
        uid: 'dev-admin',
        displayName: firebaseUser.displayName || '開發測試管理員',
        memberId: 'DEV_ADMIN_ID',
        memberData: {
          name: '開發測試管理員',
          system: { role: 'Admin' }
        }
      };
      user.value = devProfile;
      isAuthenticated.value = true;
      sessionStorage.setItem('devUser', JSON.stringify(devProfile));
      return;
    }

    // 正常 LINE 登入流程：後端發行的 Custom Token，其 uid 已經精確對應到 Firestore 的 memberId
    try {
      const docRef = doc(db, 'members', firebaseUser.uid);
      const memberSnap = await getDoc(docRef);

      let memberId = null;
      let memberData = null;

      if (memberSnap.exists()) {
        memberId = memberSnap.id;
        memberData = memberSnap.data() as Member;
      }

      user.value = {
        uid: firebaseUser.uid,
        displayName: memberData?.name || firebaseUser.displayName || '未綁定獅友',
        memberId: memberId,
        memberData: memberData
      };
      isAuthenticated.value = true;
    } catch (err) {
      console.error('Failed to bind Member profile:', err);
      // Fallback：至少保留基本登入狀態
      user.value = { uid: firebaseUser.uid, displayName: firebaseUser.displayName };
      isAuthenticated.value = true;
    }
  }

  /**
   * 由 main.ts 的 onAuthStateChanged 首次回調呼叫。
   * - setLoader(true)：標記為載入中（僅在 isReady 為 false 時有效，避免誤觸重置）
   * - setLoader(false)：首次初始化完成，設 isReady=true 並 resolve waitForAuth()，
   *   解鎖路由守衛與 UI。後續重複呼叫為 no-op（Promise 只 resolve 一次）。
   */
  function setLoader(state: boolean) {
    // ── 防護閘：isReady 一旦為 true，setLoader(true) 不再生效 ──
    // main.ts 的 isFirstCall 旗標是第一道防線；這裡是最後一道保險，
    // 防止任何意外路徑重置 loading，讓 Loading Spinner 消失後不再復現。
    if (state && isReady.value) return;

    loading.value = state;
    if (!state) {
      // 首次初始化完成：解鎖路由守衛與 UI
      isReady.value = true;
      _authReadyResolve(); // Promise 只 resolve 一次，重複呼叫為 no-op
    }
  }

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

  const isPendingMember = computed(() => {
    if (!user.value) return false;
    return !isAdmin.value && user.value.memberData?.status?.membershipType === '潛在';
  });

  async function logout() {
    // 先清除本地狀態
    user.value = null;
    isAuthenticated.value = false;
    sessionStorage.removeItem('devUser');
    // 注意：isReady 不重置 —— 它代表「Auth 系統已初始化過」，登出後依然成立。
    // 重置 isReady 會讓 waitForAuth() 的 Promise 永遠無法再 resolve，造成 Spinner 卡死。
    // 呼叫 Firebase signOut()，正確觸發 onAuthStateChanged(null) 以同步後端狀態
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut error (ignored):', err);
    }
  }

  return { user, isAuthenticated, loading, isReady, isAdmin, isPendingMember, setUser, setLoader, logout };
});
