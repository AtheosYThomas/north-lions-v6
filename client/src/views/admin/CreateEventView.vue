
<script setup lang="ts">
import { ref } from 'vue';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const error = ref('');

const form = ref({
  name: '',
  date: '',
  start: '',
  end: '',
  deadline: '',
  location: '',
  cost: 0,
  quota: 0,
  content: '',
  category: 'meeting'
});

const handleCreate = async () => {
  loading.value = true;
  error.value = '';
  try {
    const createEvent = httpsCallable(functions, 'createEvent');
    
    // Construct Event Object
    const eventData = {
        name: form.value.name,
        time: {
            date: new Date(form.value.date).toISOString(),
            start: new Date(`${form.value.date}T${form.value.start}`).toISOString(),
            end: new Date(`${form.value.date}T${form.value.end}`).toISOString(),
            deadline: new Date(form.value.deadline).toISOString(),
        },
        details: {
            location: form.value.location,
            cost: form.value.cost,
            quota: form.value.quota,
            isPaidEvent: form.value.cost > 0
        },
        publishing: {
            content: form.value.content,
            target: ['all']
        },
        category: form.value.category,
        status: {
            eventStatus: 'published',
            registrationStatus: 'open',
            pushStatus: 'pending'
        },
        stats: { registeredCount: 0 },
        system: { code: 'AUTO-' + Date.now() },
        related: {}
    };

    await createEvent({ event: eventData });
    alert('活動建立成功！');
    router.push('/events');
  } catch (e: any) {
    error.value = e.message || '建立失敗';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-2xl mx-auto bg-white p-6 rounded shadow mt-6">
    <h1 class="text-2xl font-bold mb-6">建立新活動 (Admin)</h1>
    
    <form @submit.prevent="handleCreate" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">活動名稱</label>
        <input type="text" v-model="form.name" required class="mt-1 block w-full border rounded p-2">
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
            <label class="block text-sm font-medium text-gray-700">日期</label>
            <input type="date" v-model="form.date" required class="mt-1 block w-full border rounded p-2">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">分類</label>
            <select v-model="form.category" class="mt-1 block w-full border rounded p-2">
                <option value="meeting">例會</option>
                <option value="act">ACT</option>
                <option value="travel">旅遊</option>
                <option value="training">研習</option>
                <option value="board_meeting">理監事會</option>
            </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
            <label class="block text-sm font-medium text-gray-700">開始時間</label>
            <input type="time" v-model="form.start" required class="mt-1 block w-full border rounded p-2">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">結束時間</label>
            <input type="time" v-model="form.end" required class="mt-1 block w-full border rounded p-2">
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">報名截止日期</label>
        <input type="datetime-local" v-model="form.deadline" required class="mt-1 block w-full border rounded p-2">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">地點</label>
        <input type="text" v-model="form.location" required class="mt-1 block w-full border rounded p-2">
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
            <label class="block text-sm font-medium text-gray-700">費用</label>
            <input type="number" v-model="form.cost" min="0" class="mt-1 block w-full border rounded p-2">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">名額限制 (0為不限)</label>
            <input type="number" v-model="form.quota" min="0" class="mt-1 block w-full border rounded p-2">
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">活動內容說明</label>
        <textarea v-model="form.content" rows="4" class="mt-1 block w-full border rounded p-2"></textarea>
      </div>

      <div v-if="error" class="text-red-500">{{ error }}</div>

      <button type="submit" :disabled="loading" class="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50">
        {{ loading ? '建立中...' : '建立活動' }}
      </button>
    </form>
  </div>
</template>
