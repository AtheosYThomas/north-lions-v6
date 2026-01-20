
<template>
  <div class="login-container">
    <div class="p-8 bg-white rounded-lg shadow-md w-96">
      <h1 class="text-2xl font-bold mb-6 text-center text-gray-800">會員登入</h1>
      <button 
        @click="handleLineLogin" 
        :disabled="loading"
        class="w-full bg-[#00C300] text-white font-bold py-2 px-4 rounded hover:bg-[#00b300] transition-colors flex items-center justify-center gap-2"
      >
        <span v-if="loading">處理中...</span>
        <span v-else>LINE 登入</span>
      </button>
      <p v-if="error" class="text-red-500 mt-4 text-center text-sm">{{ error }}</p>

      <!-- Dev Login -->
      <div v-if="showDevLogin" class="mt-8 border-t pt-4">
        <h2 class="text-sm font-bold text-gray-500 mb-2 text-center">開發者登入 (Local Only)</h2>
        <input v-model="devEmail" type="email" placeholder="Email" class="w-full mb-2 px-3 py-2 border rounded text-sm" />
        <input v-model="devPassword" type="password" placeholder="Password" class="w-full mb-2 px-3 py-2 border rounded text-sm" />
        <button 
          @click="handleDevLogin" 
          class="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded hover:bg-gray-700 text-sm"
        >
          Email 登入
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import liff from '@line/liff';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithCustomToken, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';

const loading = ref(false);
const error = ref('');
const router = useRouter();
const userStore = useUserStore();

// Dev Login
const showDevLogin = import.meta.env.DEV;
const devEmail = ref('admin@example.com');
const devPassword = ref('password123');

const LIFF_ID = import.meta.env.VITE_LIFF_ID;
const LINE_LOGIN_CHANNEL_ID = import.meta.env.VITE_LINE_LOGIN_CHANNEL_ID;

// 1. 在任何邏輯執行前，先搶救 URL 上的 Code
// 避免 LIFF 初始化過程中清洗掉 URL 參數
const rawUrl = new URL(window.location.href);
const capturedCode = rawUrl.searchParams.get('code');

const initLiff = async () => {
  if (!LIFF_ID) {
    error.value = '系統設定錯誤 (Missing LIFF ID)';
    return;
  }
  try {
    // 這裡不使用 withLoginOnExternalBrowser: true，避免自動跳轉干擾我們手動處理 Code
    await liff.init({ liffId: LIFF_ID });

    // 自動登入判斷：
    // 情況 A: 有 Code -> 優先處理 Code
    if (capturedCode) {
      console.log('Detected Auth Code, starting verification...');
      await handleLineLogin();
    }
    // 情況 B: 沒 Code 但 LIFF 認為已登入 -> 處理 Token
    else if (liff.isLoggedIn()) {
      console.log('LIFF is logged in, auto-verifying...');
      await handleLineLogin();
    }
  } catch (err) {
    console.error('LIFF Init Error', err);
    error.value = 'LINE 初始化失敗';
  }
};

onMounted(() => {
  initLiff();
});

const handleLineLogin = async () => {
  loading.value = true;
  error.value = '';

  try {
    // 準備傳送給後端的資料
    let payload: any = {
      lineLoginChannelId: LINE_LOGIN_CHANNEL_ID,
      redirectUri: window.location.origin + window.location.pathname // 必須與 LINE Console 設定完全一致
    };

    // 策略一：優先使用 Auth Code (最強健的方式)
    if (capturedCode) {
      console.log('Using captured Auth Code flow');
      payload.lineAuthCode = capturedCode;
    }
    // 策略二：使用 LIFF Access Token (備援)
    else if (liff.isLoggedIn()) {
      console.log('Using LIFF Access Token flow');
      const accessToken = liff.getAccessToken();
      const idToken = liff.getIDToken();
      if (!accessToken) throw new Error('LIFF says logged in but no token found');
      payload.lineAccessToken = accessToken;
      payload.lineIdToken = idToken;
    }
    // 策略三：都沒登入 -> 觸發登入跳轉
    else {
      console.log('No credentials found, redirecting to LINE Login...');
      // 這裡務必指定 redirectUri 為當前頁面，確保回來能抓到 Code
      liff.login({ redirectUri: window.location.href });
      return;
    }

    // 呼叫後端
    const functions = getFunctions();
    const verifyLineToken = httpsCallable(functions, 'verifyLineToken');
    const result = await verifyLineToken(payload);

    const { token, isNewUser } = result.data as { token: string, isNewUser: boolean };

    // Firebase 登入
    const auth = getAuth();
    await signInWithCustomToken(auth, token);

    // 清除網址參數 (美觀與安全)
    window.history.replaceState({}, document.title, window.location.pathname);

    // 初始化使用者資料
    try {
      await userStore.initAuth();
    } catch (e) {
      console.warn('initAuth failed', e);
    }

    // 路由跳轉
    router.push(isNewUser ? '/register' : '/');

  } catch (err: any) {
    console.error('Login Error:', err);
    error.value = err.message || '登入失敗';

    // 如果是用 Token 失敗，可能 Token 過期，嘗試登出
    if (liff.isLoggedIn() && !capturedCode) {
      liff.logout();
    }
  } finally {
    loading.value = false;
  }
};

const handleDevLogin = async () => {
    // ... (保持原樣) ...
    loading.value = true;
    try {
        const auth = getAuth();
        await signInWithEmailAndPassword(auth, devEmail.value, devPassword.value);
        await userStore.initAuth();
        router.push('/');
    } catch (e: any) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f3f4f6;
}
</style>
