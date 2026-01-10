
<script setup lang="ts">
import { ref } from 'vue';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const error = ref('');

const form = ref({
  title: '',
  summary: '',
  body: '',
  category: 'system'
});

const handleCreate = async () => {
  loading.value = true;
  error.value = '';
  try {
    const createAnnouncement = httpsCallable(functions, 'createAnnouncement');
    
    await createAnnouncement({
        title: form.value.title,
        content: {
            summary: form.value.summary,
            body: form.value.body,
            date: new Date().toISOString()
        },
        category: form.value.category,
        status: {
            status: 'published',
            pushStatus: 'pending'
        },
        publishing: {
            targetAudience: ['all']
        },
        settings: {
            isPushEnabled: false,
            isPinned: false,
            deliveryMethod: 'line',
            replySetting: 'off'
        },
        related: {}
    });

    alert('公告發布成功！');
    router.push('/announcements');
  } catch (e: any) {
    error.value = e.message || '發布失敗';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-2xl mx-auto bg-white p-6 rounded shadow mt-6">
    <h1 class="text-2xl font-bold mb-6">發布新公告 (Admin)</h1>
    
    <form @submit.prevent="handleCreate" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">公告標題</label>
        <input type="text" v-model="form.title" required class="mt-1 block w-full border rounded p-2">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">分類</label>
        <select v-model="form.category" class="mt-1 block w-full border rounded p-2">
            <option value="system">系統公告</option>
            <option value="meeting">例會通知</option>
            <option value="activity_preview">活動預告</option>
        </select>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700">摘要</label>
        <input type="text" v-model="form.summary" required class="mt-1 block w-full border rounded p-2">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">內容</label>
        <textarea v-model="form.body" rows="6" required class="mt-1 block w-full border rounded p-2"></textarea>
      </div>

      <div v-if="error" class="text-red-500">{{ error }}</div>

      <button type="submit" :disabled="loading" class="w-full bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700 disabled:opacity-50">
        {{ loading ? '發布中...' : '發布公告' }}
      </button>
    </form>
  </div>
</template>
