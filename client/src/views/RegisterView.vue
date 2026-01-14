
<template>
  <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
    <h2 class="text-2xl font-bold mb-6 text-center">新會員註冊</h2>
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">真實姓名 <span class="text-red-500">*</span></label>
        <input 
          type="text" 
          id="name" 
          v-model="form.name" 
          required 
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
          placeholder="請輸入您的真實姓名"
        />
      </div>

      <div>
        <label for="mobile" class="block text-sm font-medium text-gray-700">手機號碼 <span class="text-red-500">*</span></label>
        <input 
          type="tel" 
          id="mobile" 
          v-model="form.mobile" 
          required 
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
          placeholder="09xx-xxx-xxx"
        />
      </div>

      <div>
        <label for="company" class="block text-sm font-medium text-gray-700">公司名稱</label>
        <input 
          type="text" 
          id="company" 
          v-model="form.company" 
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
        />
      </div>

      <div>
        <label for="title" class="block text-sm font-medium text-gray-700">職稱</label>
        <input 
          type="text" 
          id="title" 
          v-model="form.title" 
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
        />
      </div>

      <div v-if="error" class="text-red-500 text-sm text-center">
        {{ error }}
      </div>

      <button 
        type="submit" 
        :disabled="loading"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        <span v-if="loading">註冊中...</span>
        <span v-else>送出資料</span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const route = useRoute();

const form = ref({
  name: userStore.currentUser?.name || '', // Pre-fill with LINE name if available
  mobile: '',
  company: '',
  title: ''
});

const loading = ref(false);
const error = ref('');

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';

  try {
    const registerMember = httpsCallable(functions, 'registerMember');
    await registerMember({
      name: form.value.name,
      mobile: form.value.mobile,
      company: form.value.company,
      title: form.value.title,
      lineId: route.query.lineId as string || undefined
    });

    // Refresh user profile to get the new 'active' status
    // Force initAuth to re-fetch or manually update store
    // Since initAuth listens to auth state, we might need to manually trigger a fetch or just reload.
    // A simple page reload is often easiest to ensure fresh state, but let's try to just navigate.
    // The user store watcher might not catch Firestore updates unless we listen to the doc.
    // For now, let's manually update the store logic or just reload.
    // Better UX: Trigger a fetch.
    
    // Simplest: Redirect to home, let the guard/store handle it.
    // But we might need to wait for store update.
    
    // Force reload to ensure fresh data from Firestore
    window.location.href = '/'; 

  } catch (e: any) {
    console.error(e);
    error.value = e.message || '註冊失敗，請稍後再試';
  } finally {
    loading.value = false;
  }
};
</script>
