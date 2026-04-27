import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { onAuthStateChanged } from 'firebase/auth'
import App from './App.vue'
import router from './router'
import { auth } from './firebase'
import './style.css'

import liff from '@line/liff';

const pinia = createPinia()
const app = createApp(App)

const initApp = async () => {
  const LIFF_ID = import.meta.env.VITE_LIFF_ID || "";
  const allowLocalLiff = import.meta.env.VITE_LIFF_ALLOW_LOCAL === '1';
  const isLocalHost = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
  // 本機 / E2E 預設不 init LIFF，避免 endpoint URL 與 127.0.0.1 不符的警告；隧道除錯請設 VITE_LIFF_ALLOW_LOCAL=1
  if (LIFF_ID && (!isLocalHost || allowLocalLiff)) {
    try {
      // 關鍵！在 Vue Router 載入並改變網址之前，就先讓 LIFF 讀取網址列進行 OAuth Token 交換。
      await liff.init({ liffId: LIFF_ID });
      console.log('Global LIFF Init Success');
    } catch (err) {
      console.error('Global LIFF Init Failed:', err);
    }
  }

  app.use(pinia)
  app.use(router)

  // ✅ [新增] 全域 Vue 錯誤捕捉器
  // 攔截所有元件拋出的未處理例外，避免白畫面，並在 console 留下完整錯誤上下文
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[Client Global Error]', err, '\nVue Info:', info);
    // Firebase 斷線提示：未來可改為 Toast 通知
    if (String(err).includes('firestore') || String(err).includes('network')) {
      alert('網路或資料庫連線發生錯誤，請檢查網路後重新整理頁面。');
    }
  };

  // 監聽 Firebase Auth 登入狀態，並同步至 Pinia Store
  import('./stores/auth').then(({ useAuthStore }) => {
    const authStore = useAuthStore()

    // ── 關鍵：isFirstCall 旗標區分「首次初始化」與「後續狀態變更」──
    // 首次：需要 setLoader(true→false) 來解鎖 waitForAuth() 與 isReady
    // 後續（如登出）：只更新 user 狀態，不重置 loading/isReady，
    //   避免 Spinner 重新出現或 waitForAuth() Promise 永久卡死。
    let isFirstCall = true

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (isFirstCall) {
        // 首次初始化：設為 loading 狀態，拉取資料後解鎖
        authStore.setLoader(true)
        if (firebaseUser) {
          await authStore.setUser(firebaseUser)
        } else {
          await authStore.setUser(null)
        }
        // 首次完成：解除 loading，觸發 isReady=true 並 resolve waitForAuth()
        authStore.setLoader(false)
        isFirstCall = false
      } else {
        // 後續狀態變更（例如登出觸發的 null，或重新登入）：
        // 只更新 user 資料，isReady 保持 true，不重新觸發全螢幕 Spinner
        if (firebaseUser) {
          await authStore.setUser(firebaseUser)
        } else {
          await authStore.setUser(null)
        }
      }
    })
  })

  app.mount('#app')
};

initApp();
