
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useEventStore } from '../stores/event';
import { useRoute, useRouter } from 'vue-router';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

const store = useEventStore();
const route = useRoute();
const router = useRouter();

const eventId = route.params.id as string;
const showModal = ref(false);
const submitting = ref(false);
const submitError = ref('');
const registeredInfo = ref<any>(null); // To store registration info if already registered

const form = ref({
  adultCount: 1,
  childCount: 0,
  familyNames: '', // Split by comma
  shuttle: false,
  accommodation: false,
  remark: ''
});

onMounted(async () => {
  if (eventId) {
    await store.fetchEvent(eventId);
    checkRegistration();
  }
});

const checkRegistration = async () => {
  try {
    const getMyRegistrations = httpsCallable<unknown, { registrations: any[] }>(functions, 'getMyRegistrations');
    const result = await getMyRegistrations();
    // Check if current user is registered for this event
    const reg = result.data.registrations.find((r: any) => r.info.eventId === eventId && r.status.status !== 'cancelled');
    if (reg) {
      registeredInfo.value = reg;
    }
  } catch (e) {
    console.error('Failed to check registration', e);
  }
};

const formatDate = (dateInput: any) => {
  if (!dateInput) return '';
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  return date.toLocaleString();
};

const goBack = () => {
  router.push('/events');
};

const handleRegister = async () => {
  submitting.value = true;
  submitError.value = '';
  try {
    const familyNamesArray = form.value.familyNames.split(',').map(s => s.trim()).filter(Boolean);
    
    await store.registerEvent(eventId, {
      adultCount: form.value.adultCount,
      childCount: form.value.childCount,
      familyNames: familyNamesArray
    }, {
      shuttle: form.value.shuttle,
      accommodation: form.value.accommodation,
      remark: form.value.remark
    });

    showModal.value = false;
    await checkRegistration(); // Refresh status
    alert('報名成功！');
  } catch (e: any) {
    submitError.value = e.message || 'Registration failed';
  } finally {
    submitting.value = false;
  }
};

const handleCancel = async () => {
  if (!registeredInfo.value) return;
  if (!confirm('確定要取消報名嗎？')) return;

  submitting.value = true;
  try {
    await store.cancelRegistration(registeredInfo.value.id, eventId);
    registeredInfo.value = null;
    alert('已取消報名。');
    await checkRegistration(); // Refresh status
  } catch (e: any) {
    alert('取消失敗: ' + e.message);
  } finally {
    submitting.value = false;
  }
};

const isFull = computed(() => {
  if (!store.currentEvent) return false;
  return store.currentEvent.details.quota > 0 && store.currentEvent.stats.registeredCount >= store.currentEvent.details.quota;
});

const isDeadlinePassed = computed(() => {
    if (!store.currentEvent) return false;
    const deadline = store.currentEvent.time.deadline as any;
    const date = deadline.toDate ? deadline.toDate() : new Date(deadline);
    return new Date() > date;
});
</script>

<template>
  <div class="p-4 max-w-4xl mx-auto">
    <button @click="goBack" class="mb-4 text-blue-500 hover:underline">&larr; Back to List</button>

    <div v-if="store.loading && !store.currentEvent" class="text-gray-500">Loading...</div>
    <div v-else-if="store.error" class="text-red-500">{{ store.error }}</div>
    
    <div v-else-if="store.currentEvent" class="bg-white rounded-lg shadow p-6">
      <div class="h-64 bg-gray-200 rounded mb-6 flex items-center justify-center overflow-hidden">
         <img v-if="store.currentEvent.system.coverImage" :src="store.currentEvent.system.coverImage" alt="cover" class="h-full w-full object-cover" />
         <span v-else class="text-gray-400 text-2xl">No Cover Image</span>
      </div>

      <div class="flex justify-between items-start mb-4">
        <h1 class="text-3xl font-bold">{{ store.currentEvent.name }}</h1>
        <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{{ store.currentEvent.category }}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
            <h3 class="font-semibold text-gray-700">活動時間與地點</h3>
            <p><strong>日期:</strong> {{ formatDate(store.currentEvent.time.date) }}</p>
            <p><strong>時間:</strong> {{ formatDate(store.currentEvent.time.start) }} - {{ formatDate(store.currentEvent.time.end) }}</p>
            <p><strong>地點:</strong> {{ store.currentEvent.details.location }}</p>
            <p><strong>截止日期:</strong> {{ formatDate(store.currentEvent.time.deadline) }}</p>
        </div>
        <div>
            <h3 class="font-semibold text-gray-700">費用與名額</h3>
            <p><strong>費用:</strong> {{ store.currentEvent.details.isPaidEvent ? `$${store.currentEvent.details.cost}` : '免費' }}</p>
            <p><strong>名額限制:</strong> {{ store.currentEvent.details.quota }}</p>
            <p><strong>已報名人數:</strong> {{ store.currentEvent.stats.registeredCount }}</p>
        </div>
      </div>

      <div class="mb-8">
        <h3 class="font-semibold text-gray-700 mb-2">活動詳情</h3>
        <p class="whitespace-pre-wrap">{{ store.currentEvent.publishing.content }}</p>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-4 border-t pt-6">
        <div v-if="registeredInfo">
            <span class="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-md font-bold text-lg mr-4">
                ✓ 已報名
            </span>
            <button 
                @click="handleCancel" 
                :disabled="submitting"
                class="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 disabled:opacity-50"
            >
                {{ submitting ? '處理中...' : '取消報名' }}
            </button>
        </div>
        <div v-else>
            <button 
                v-if="!isFull && !isDeadlinePassed"
                @click="showModal = true" 
                class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 font-bold text-lg"
            >
                立即報名
            </button>
            <button 
                v-else 
                disabled 
                class="bg-gray-300 text-gray-500 px-6 py-2 rounded font-bold text-lg cursor-not-allowed"
            >
                {{ isFull ? '名額已滿' : '報名截止' }}
            </button>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center text-gray-500">
      Event not found.
    </div>

    <!-- Registration Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 class="text-2xl font-bold mb-4">活動報名</h2>
            
            <form @submit.prevent="handleRegister" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">大人人數</label>
                        <input type="number" v-model="form.adultCount" min="1" class="mt-1 block w-full rounded border-gray-300 border p-2" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">小孩人數</label>
                        <input type="number" v-model="form.childCount" min="0" class="mt-1 block w-full rounded border-gray-300 border p-2">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700">家屬姓名 (如有，請用逗號分隔)</label>
                    <input type="text" v-model="form.familyNames" class="mt-1 block w-full rounded border-gray-300 border p-2" placeholder="王小明, 陳小花">
                </div>

                <div class="flex gap-4">
                    <label class="flex items-center">
                        <input type="checkbox" v-model="form.shuttle" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                        <span class="ml-2 text-sm text-gray-700">需要接駁</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" v-model="form.accommodation" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                        <span class="ml-2 text-sm text-gray-700">需要住宿</span>
                    </label>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700">備註</label>
                    <textarea v-model="form.remark" class="mt-1 block w-full rounded border-gray-300 border p-2" rows="3"></textarea>
                </div>

                <div v-if="submitError" class="text-red-500 text-sm">{{ submitError }}</div>

                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" @click="showModal = false" class="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">取消</button>
                    <button type="submit" :disabled="submitting" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
                        {{ submitting ? '提交中...' : '確認報名' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
  </div>
</template>
