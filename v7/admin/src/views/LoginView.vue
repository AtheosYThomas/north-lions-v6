<template>
  <div class="max-w-md mx-auto mt-20 p-8 bg-white border border-gray-200 shadow-xl rounded-xl">
    <div class="text-center mb-8">
        <h2 class="text-3xl font-bold tracking-tight text-gray-900">管理後台登入</h2>
        <p class="text-sm text-gray-500 mt-2">請使用管理員帳號進行登入</p>
    </div>
    
    <div v-if="errorMsg" class="mb-4 bg-red-50 p-3 rounded text-red-600 text-sm font-medium border border-red-200">
      {{ errorMsg }}
    </div>

    <div class="mb-8 space-y-3">
      <button
        type="button"
        :disabled="loading || !liffId"
        class="w-full bg-[#00C300] hover:bg-[#00b300] text-white py-3 rounded-lg font-bold transition flex justify-center items-center gap-2 disabled:opacity-50"
        @click="loginWithLine"
      >
        {{ loading ? '驗證授權中...' : 'LINE 登入' }}
      </button>
      <p v-if="!liffId" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
        尚未設定 LIFF ID。請在 LINE Developers 建立一支 <strong>Endpoint 為本後台網址</strong> 的 LIFF，並將 ID 寫入環境變數 <code class="bg-amber-100 px-1 rounded">VITE_ADMIN_LIFF_ID</code>（與前台 LIFF 分開）。同一 Channel 的 LINE Login「Callback URL」也須包含登入完成後要導回的網址（見下方說明）。
      </p>
      <p v-else class="text-xs text-gray-500 leading-relaxed">
        與會員前台相同流程：以 LINE 授權後由雲端函式換取 Firebase 登入。請在 LINE Developers 同一 Channel 的「Callback URL」加入與本頁一致的網址（預設為 <code class="bg-gray-100 px-1 rounded">{{ adminRedirectHint }}</code>，亦可設環境變數 <code class="bg-gray-100 px-1 rounded">VITE_ADMIN_LIFF_REDIRECT_URI</code> 與後台登記完全一致）。
      </p>
    </div>

    <form @submit.prevent="handleEmailLogin" class="space-y-6">
      <p class="text-xs text-gray-500 leading-relaxed">
        以下為 <strong>Firebase Email 帳號</strong> 登入：必須已在 Firebase Authentication 建立該 Email／密碼，且會員資料具管理權限。
      </p>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">管理者帳號 (Email)</label>
        <input v-model="email" type="email" autocomplete="username" placeholder="admin@example.com" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition transition-all duration-200 bg-gray-50 focus:bg-white" />
      </div>
      <div>
         <label class="block text-sm font-semibold text-gray-700 mb-1">密碼</label>
        <input v-model="password" type="password" autocomplete="current-password" placeholder="••••••••" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition transition-all duration-200 bg-gray-50 focus:bg-white" />
      </div>

      <button type="submit" :disabled="loading" class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 mt-2">
        {{ loading ? '驗證中...' : '以 Email 登入' }}
      </button>
    </form>

    <div class="mt-10 pt-6 border-t border-gray-200">
      <p class="text-xs text-gray-400 mb-3 text-center">系統管理員通道（與前台「開發人員登入」相同）</p>
      <div class="flex flex-col gap-2">
        <input v-model="sysAccount" type="text" autocomplete="off" placeholder="系統帳號（例如 ADMIN）" class="border border-gray-300 px-4 py-3 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-300" />
        <input v-model="sysPassword" type="password" autocomplete="off" placeholder="系統密碼" class="border border-gray-300 px-4 py-3 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-300" />
        <button
          type="button"
          :disabled="loading"
          class="w-full py-3 px-4 bg-gray-700 hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition disabled:opacity-50"
          @click="handleSysAdminLogin"
        >
          {{ loading ? '驗證中...' : '系統管理員登入' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore, waitForAuth } from '../stores/auth';
import { useRouter } from 'vue-router';
import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import liff from '@line/liff';
import { getAdminLiffId, getAdminLiffRedirectUri } from '../lib/liffConfig';

const email = ref('');
const password = ref('');
const sysAccount = ref('');
const sysPassword = ref('');
const loading = ref(false);
const errorMsg = ref('');

const authStore = useAuthStore();
const router = useRouter();

const liffId = getAdminLiffId();

const adminRedirectHint = computed(() => {
  const baked = String(import.meta.env.VITE_ADMIN_LIFF_REDIRECT_URI || '').trim();
  if (baked) return baked;
  const member = String(import.meta.env.VITE_LIFF_REDIRECT_URI || '').trim();
  if (member && typeof window !== 'undefined') {
    try {
      if (new URL(member).origin === window.location.origin) return member;
    } catch {
      /* ignore */
    }
  }
  return typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login';
});

const afterAuthSuccess = async () => {
  if (!authStore.isAdmin) {
    errorMsg.value = '權限不足：此區域僅限會務幹部或指定管理員造訪。';
    await authStore.logout();
    return;
  }
  await router.push('/');
};

const handleEmailLogin = async () => {
  if (!email.value.trim() || !password.value) {
    errorMsg.value = '請輸入 Email 與密碼。';
    return;
  }
  loading.value = true;
  errorMsg.value = '';
  try {
    await authStore.loginWithEmail(email.value.trim(), password.value);
    await afterAuthSuccess();
  } catch (e: any) {
    const code = e?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      errorMsg.value = '登入失敗：此 Email 可能尚未在 Firebase 建立密碼登入，或密碼錯誤。可改試下方「系統管理員登入」。';
    } else {
      errorMsg.value = '登入失敗：' + (e?.message || '請稍後再試。');
    }
  } finally {
    loading.value = false;
  }
};

const executeLineFirebaseLogin = async (lineAccessToken: string) => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const verifyLineToken = httpsCallable(functions, 'verifyLineToken');
    const result = await verifyLineToken({ lineAccessToken });
    const { token, needsRegistration } = result.data as { token?: string; needsRegistration?: boolean };
    if (!token) throw new Error('後端未回傳 Custom Token');
    if (needsRegistration) {
      errorMsg.value = '此 LINE 帳號尚未完成會員註冊，請先至會員前台完成註冊後再登入管理後台。';
      loading.value = false;
      return;
    }
    const cred = await signInWithCustomToken(auth, token);
    await authStore.hydrateFromFirebaseUser(cred.user);
    await afterAuthSuccess();
  } catch (e: any) {
    console.error('LINE 登入失敗', e);
    errorMsg.value = 'LINE 登入失敗：' + (e?.message || '請確認網路與雲端函式後再試。');
  } finally {
    loading.value = false;
  }
};

const loginWithLine = () => {
  errorMsg.value = '';
  if (!liffId) {
    errorMsg.value = '未設定 LIFF ID，無法使用 LINE 登入。';
    return;
  }
  try {
    if (!liff.isLoggedIn()) {
      const redirectUri = getAdminLiffRedirectUri();
      liff.login({ redirectUri });
      return;
    }
    const token = liff.getAccessToken();
    if (token) {
      void executeLineFirebaseLogin(token);
    } else {
      liff.logout();
      liff.login({ redirectUri: getAdminLiffRedirectUri() });
    }
  } catch (e: any) {
    errorMsg.value = 'LIFF 狀態異常：' + (e?.message || '請重新整理後再試。');
  }
};

onMounted(async () => {
  await waitForAuth();
  if (authStore.isAuthenticated && authStore.isAdmin) {
    await router.replace('/');
    return;
  }
  if (!liffId) return;
  try {
    if (liff.isLoggedIn()) {
      const lineAccessToken = liff.getAccessToken();
      if (lineAccessToken) {
        await executeLineFirebaseLogin(lineAccessToken);
      }
    }
  } catch {
    /* 本機未 init LIFF 等情境略過 */
  }
});

const handleSysAdminLogin = async () => {
  if (!sysAccount.value.trim() || !sysPassword.value) {
    errorMsg.value = '請輸入系統帳號與密碼。';
    return;
  }
  loading.value = true;
  errorMsg.value = '';
  try {
    const adminLoginFunc = httpsCallable(functions, 'adminLogin');
    const result = await adminLoginFunc({ account: sysAccount.value.trim(), password: sysPassword.value });
    const { token } = result.data as { token?: string };
    if (!token) throw new Error('後端未回傳 token');
    const cred = await signInWithCustomToken(auth, token);
    await authStore.hydrateFromFirebaseUser(cred.user);
    await afterAuthSuccess();
  } catch (e: any) {
    console.error('adminLogin', e);
    errorMsg.value = '系統管理員登入失敗：帳號或密碼錯誤，或雲端函式無法連線。';
  } finally {
    loading.value = false;
  }
};
</script>
