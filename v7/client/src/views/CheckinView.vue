<template>
  <div class="min-h-[80vh] flex flex-col items-center justify-center p-4">
    <div v-if="loading" class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
      <p class="text-gray-500 text-lg">系統報到處理中，請稍候...</p>
    </div>

    <div v-else-if="success" class="text-center bg-green-50 p-8 rounded-xl shadow-sm border border-green-100 max-w-sm w-full">
      <div class="text-6xl mb-4">✅</div>
      <h1 class="text-3xl font-bold text-green-700 mb-2">報到成功</h1>
      <p class="text-green-600">很高興您的參與！將為您導向活動詳情...</p>
    </div>

    <div v-else class="text-center bg-red-50 p-8 rounded-xl shadow-sm border border-red-100 max-w-sm w-full">
      <div class="text-6xl mb-4">⚠️</div>
      <h1 class="text-2xl font-bold text-red-700 mb-2">報到失敗</h1>
      <p class="text-red-600 mb-6">{{ errorMsg }}</p>
      <button @click="goHome" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition">
        回首頁
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useRegistrationsStore } from '../stores/registrations';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const regStore = useRegistrationsStore();

const loading = ref(true);
const success = ref(false);
const errorMsg = ref('');

const checkIn = async () => {
  const eventId = route.query.eventId as string;
  if (!eventId) {
    loading.value = false;
    errorMsg.value = '無效的活動連結（缺少活動參數）';
    return;
  }

  const memberId = authStore.user?.memberId || authStore.user?.uid;
  if (!memberId) {
    loading.value = false;
    errorMsg.value = '無法取得會員身分，請確認您已登入並綁定 LINE。';
    return;
  }

  try {
    await regStore.checkIn(eventId, memberId);
    success.value = true;
    loading.value = false;
    
    // 成功後延遲導向至活動詳情
    setTimeout(() => {
      router.replace(`/events/${eventId}`);
    }, 2500);
  } catch (err: any) {
    loading.value = false;
    errorMsg.value = err.message || '您尚未報名此活動或發生錯誤';
  }
};

onMounted(() => {
  if (authStore.isReady) {
    checkIn();
  } else {
    // 假如剛掛載時 LIFF Auth 還沒準備好，則等待 isReady 變為 true
    const unwatch = watch(() => authStore.isReady, (ready) => {
      if (ready) {
        checkIn();
        unwatch();
      }
    });
  }
});

const goHome = () => {
  router.replace('/');
};
</script>
