
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

// 初始化 LIFF 並檢查是否需要自動登入
const initLiff = async () => {
  if (!LIFF_ID) {
    console.warn('LIFF ID not set in .env');
    error.value = '系統設定錯誤 (Missing LIFF ID)';
    return;
  }
  try {
    await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true });

    // [新增] 自動登入偵測：如果 LIFF 已經是登入狀態，直接執行後端驗證
    if (liff.isLoggedIn()) {
      console.log('LIFF already logged in, auto-verifying...');
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
    if (!liff.isLoggedIn()) {
      // [修正] 強制指定 redirectUri 為當前的 /login 頁面
      // 這樣可以避免跳回首頁被 Guard 攔截導致參數遺失
      liff.login({ redirectUri: window.location.href });
      return;
    }

    const accessToken = liff.getAccessToken();
    const idToken = liff.getIDToken();
    const authCode = new URL(window.location.href).searchParams.get('code');
    if (!accessToken && !idToken && !authCode) {
      console.warn('Missing LIFF tokens', {
        isLoggedIn: liff.isLoggedIn(),
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken,
        url: window.location.href
      });
      if (liff.isLoggedIn()) {
        liff.logout();
      }
      liff.login({ redirectUri: window.location.href });
      return;
    }

    const functions = getFunctions();
    const verifyLineToken = httpsCallable(functions, 'verifyLineToken');
    const result = await verifyLineToken({
      lineAccessToken: accessToken,
      lineIdToken: idToken,
      lineAuthCode: authCode,
      lineLoginChannelId: LINE_LOGIN_CHANNEL_ID,
      redirectUri: window.location.origin + window.location.pathname
    });

    const { token, isNewUser } = result.data as { token: string, isNewUser: boolean };

    const auth = getAuth();
    await signInWithCustomToken(auth, token);

    // 等待 user store 初始化 (抓取 Profile)
    try {
      await userStore.initAuth();
    } catch (e) {
      console.warn('initAuth failed after login', e);
    }

    if (isNewUser) {
      router.push('/register');
    } else {
      router.push('/');
    }

  } catch (err: any) {
    console.error(err);
    // 若後端驗證失敗 (例如 500)，顯示錯誤並登出 LIFF 以便重試
    error.value = err.message || '登入失敗';
    if (liff.isLoggedIn()) {
      liff.logout();
    }
  } finally {
    loading.value = false;
  }
};

const handleDevLogin = async () => {
    loading.value = true;
    error.value = '';
    try {
        const auth = getAuth();
        await signInWithEmailAndPassword(auth, devEmail.value, devPassword.value);

        try {
          await userStore.initAuth();
        } catch (e) {
          console.warn('initAuth failed after dev login', e);
        }
        router.push('/');
    } catch (err: any) {
        console.error(err);
        error.value = err.message || '開發者登入失敗';
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
