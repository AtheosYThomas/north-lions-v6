
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import liff from '@line/liff';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { useRouter } from 'vue-router';
// import { useUserStore } from '../stores/user'; // TODO: Update store after login

const loading = ref(false);
const error = ref('');
const router = useRouter();

const LIFF_ID = import.meta.env.VITE_LIFF_ID;

const initLiff = async () => {
  if (!LIFF_ID) {
    console.warn('LIFF ID not set in .env');
    return;
  }
  try {
    await liff.init({ liffId: LIFF_ID });
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
      liff.login();
      return;
    }

    const accessToken = liff.getAccessToken();
    if (!accessToken) {
      throw new Error('No Access Token');
    }

    const functions = getFunctions();
    const verifyLineToken = httpsCallable(functions, 'verifyLineToken');
    const result = await verifyLineToken({ lineAccessToken: accessToken });
    
    // isNewUser can be used to redirect to onboarding
    const { token, isNewUser } = result.data as { token: string, isNewUser: boolean };

    const auth = getAuth();
    await signInWithCustomToken(auth, token);

    if (isNewUser) {
      router.push('/register');
    } else {
      router.push('/');
    }
    
  } catch (err: any) {
    console.error(err);
    error.value = err.message || '登入失敗';
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
