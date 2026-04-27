<template>
  <div class="max-w-md mx-auto mt-20 p-8 bg-white border border-gray-200 shadow-xl rounded-xl">
    <div class="text-center mb-8">
        <h2 class="text-3xl font-bold tracking-tight text-gray-900">管理後台登入</h2>
        <p class="text-sm text-gray-500 mt-2">請使用管理員帳號進行登入</p>
    </div>
    
    <div v-if="errorMsg" class="mb-4 bg-red-50 p-3 rounded text-red-600 text-sm font-medium border border-red-200">
      {{ errorMsg }}
    </div>
    
    <form @submit.prevent="handleLogin" class="space-y-6">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">管理者帳號 (Email)</label>
        <input v-model="email" type="email" required placeholder="admin@example.com" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition transition-all duration-200 bg-gray-50 focus:bg-white" />
      </div>
      <div>
         <label class="block text-sm font-semibold text-gray-700 mb-1">密碼</label>
        <input v-model="password" type="password" required placeholder="••••••••" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition transition-all duration-200 bg-gray-50 focus:bg-white" />
      </div>
      
      <button type="submit" :disabled="loading" class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 mt-2">
        {{ loading ? '驗證中...' : '安全登入' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
    loading.value = true;
    errorMsg.value = '';
    try {
        await authStore.loginWithEmail(email.value, password.value);
        if (!authStore.isAdmin) {
             errorMsg.value = '權限不足：此區域僅限管理員造訪。';
             await authStore.logout();
        } else {
             router.push('/');
        }
    } catch (e: any) {
        errorMsg.value = '登入失敗，請確認帳號密碼是否正確。';
    } finally {
        loading.value = false;
    }
};
</script>
