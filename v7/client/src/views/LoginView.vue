<template>
  <div class="flex justify-center flex-col items-center h-[calc(100vh-140px)]">
    <div class="bg-white p-8 rounded-lg shadow-md w-96 text-center">
      <h2 class="text-xl font-bold mb-6 text-gray-800">系統登入</h2>
      
      <button 
        @click="loginWithLine" 
        :disabled="loading"
        class="w-full bg-[#00C300] text-white py-2 rounded font-bold hover:bg-[#00b300] transition flex justify-center items-center gap-2"
      >
        <span v-if="loading">驗證授權中...</span>
        <span v-else>LINE 登入</span>
      </button>

      <p v-if="errorMsg" class="mt-4 text-sm text-red-500 font-medium whitespace-pre-line">{{ errorMsg }}</p>

      <div class="mt-8 pt-4 border-t border-gray-200 text-left">
        <p class="text-xs text-gray-400 mb-2 text-center">開發人員登入通道</p>
        <div class="flex flex-col gap-2">
            <input v-model="adminAccount" type="text" placeholder="系統帳號" class="border border-gray-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-1 focus:ring-gray-500"/>
            <input v-model="adminPassword" type="password" placeholder="系統密碼" class="border border-gray-300 p-2 rounded text-sm w-full focus:outline-none focus:ring-1 focus:ring-gray-500"/>
            <button 
                @click="adminLoginHandler" 
                :disabled="loading"
                class="w-full bg-gray-600 text-white py-2 mt-1 rounded text-sm font-bold hover:bg-gray-700 transition disabled:opacity-50"
            >
            管理員登入
            </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { auth, functions } from '../firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import liff from '@line/liff';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const loading = ref(false);
const errorMsg = ref('');
const isLiffInitialized = ref(false);

const adminAccount = ref('');
const adminPassword = ref('');

const LIFF_ID = import.meta.env.VITE_LIFF_ID || "";

onMounted(async () => {
  // ✅ [防混淆] 已登入就直接跳轉首頁，不顯示登入頁
  if (authStore.isAuthenticated && authStore.isReady) {
    router.replace('/');
    return;
  }

  if (!LIFF_ID) {
    errorMsg.value = '尚未設定 LINE LIFF ID 環境變數。';
    return;
  }

  isLiffInitialized.value = true;

  // 須先由 main.ts 完成 liff.init；本機常略過 init，此時呼叫 isLoggedIn 會拋錯，改為略過 LINE 自動流程（仍可用管理員登入）
  try {
    if (liff.isLoggedIn()) {
      console.log('LIFF 已登入，準備跟 Firebase 換 Token...');
      const lineAccessToken = liff.getAccessToken();
      if (lineAccessToken) {
        await executeFirebaseLogin(lineAccessToken);
      } else {
        errorMsg.value = '無法取得 LINE Access Token，請重新點擊登入。';
        loading.value = false;
      }
    } else {
      loading.value = false;
    }
  } catch {
    loading.value = false;
  }
});

const executeFirebaseLogin = async (accessToken: string) => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const verifyLineToken = httpsCallable(functions, 'verifyLineToken');
    const result = await verifyLineToken({ lineAccessToken: accessToken });
    const { token, needsRegistration } = result.data as any;

    if (!token) throw new Error("後端未回傳 Custom Token");

    const userCredential = await signInWithCustomToken(auth, token);
    
    // 手動 setUser 確保最新資料先進入 store
    await authStore.setUser(userCredential.user);
    
    // 關鍵修改：跳轉前延遲一下，確實接住 needsRegistration 的註冊引導
    setTimeout(() => {
        const redirectPath = route.query.redirect ? String(route.query.redirect) : '/';
        if (needsRegistration) {
            router.push('/register');
        } else {
            router.push(redirectPath);
        }
    }, 300);

  } catch (error: any) {
    console.error("Firebase 登入失敗:", error);
    errorMsg.value = '連線至驗證伺服器失敗: ' + (error.message || '未知錯誤');
    loading.value = false; // 失敗了要把 loading 關掉
  }
};

const loginWithLine = () => {
  errorMsg.value = '';
  if (!isLiffInitialized.value) {
      errorMsg.value = 'LINE 環境尚未準備好，請稍後再試。';
      return;
  }

  if (!liff.isLoggedIn()) {
      // 記住使用者目前想去的網址（雖然現在只有 login，但未來好擴充）
      const redirectUri = window.location.origin + '/login'; 
      liff.login({ redirectUri });
  } else {
      const token = liff.getAccessToken();
      if(token) {
          executeFirebaseLogin(token);
      } else {
          // 例外狀況：說登入了卻沒 token，強制登出再來一次
          liff.logout();
          liff.login({ redirectUri: window.location.origin + '/login' });
      }
  }
};

const adminLoginHandler = async () => {
  if (!adminAccount.value || !adminPassword.value) {
      errorMsg.value = '請輸入帳號與密碼';
      return;
  }

  loading.value = true;
  errorMsg.value = '';
  try {
    const adminLoginFunc = httpsCallable(functions, 'adminLogin');
    const result = await adminLoginFunc({ account: adminAccount.value, password: adminPassword.value });
    const { token } = result.data as any;
    if (!token) throw new Error("無效的登入回傳");
    
    const userCredential = await signInWithCustomToken(auth, token);
    await authStore.setUser(userCredential.user);
    
    setTimeout(() => {
        router.push('/');
    }, 300);
  } catch (err: any) {
    console.error("管理員登入失敗:", err);
    errorMsg.value = '登入失敗：帳號或密碼錯誤';
  } finally {
    loading.value = false;
  }
};

</script>
