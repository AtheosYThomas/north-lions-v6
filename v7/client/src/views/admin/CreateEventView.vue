<template>
  <div class="min-h-screen bg-gray-50 pb-20 animate-fade-in relative text-left">
    <!-- 頁首導覽列 -->
    <div class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <router-link to="/events" class="text-gray-500 hover:text-gray-900 transition flex items-center p-2 -ml-2 rounded-full hover:bg-gray-100">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </router-link>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">發布新活動</h1>
        </div>
        <button
          @click="submit"
          :disabled="isSubmitting"
          id="submit-event-btn"
          class="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
        >
          {{ isSubmitting ? '發布中...' : '✓ 立即發布' }}
        </button>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      <div class="bg-white shadow-xl rounded-2xl overflow-hidden ring-1 ring-gray-900/5 p-8 sm:p-12 border-t-8 border-indigo-600">
        <form @submit.prevent="submit">
          <div class="space-y-10 divide-y divide-gray-200">

            <!-- ── 區塊 1：基本資訊 ───────────────────────────── -->
            <div class="space-y-6">
              <div>
                <h3 class="text-lg leading-6 font-semibold text-gray-900">基本活動資訊</h3>
                <p class="mt-1 text-sm text-gray-500">填寫活動的名稱、類別與日期時間等核心資料。</p>
              </div>

              <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <!-- 活動名稱 -->
                <div class="sm:col-span-6">
                  <label for="event-name" class="block text-sm font-medium text-gray-700 mb-1">
                    活動名稱 <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.name"
                    type="text"
                    id="event-name"
                    class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg border p-3 placeholder-gray-400"
                    placeholder="例如：第 35 屆例會暨頒獎典禮"
                  >
                </div>

                <!-- 分類 -->
                <div class="sm:col-span-3">
                  <label for="event-category" class="block text-sm font-medium text-gray-700 mb-1">活動分類</label>
                  <select
                    v-model="form.category"
                    id="event-category"
                    class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-3 bg-white"
                  >
                    <option value="例會">例會</option>
                    <option value="社會服務">社會服務</option>
                    <option value="年度活動">年度活動</option>
                    <option value="聯誼活動">聯誼活動</option>
                    <option value="其他">其他</option>
                  </select>
                </div>

                <!-- 報名截止日 -->
                <div class="sm:col-span-3">
                  <label for="event-deadline" class="block text-sm font-medium text-gray-700 mb-1">報名截止日期</label>
                  <input
                    v-model="form.time.deadline"
                    type="date"
                    id="event-deadline"
                    class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-3"
                  >
                </div>

                <!-- 活動日期 -->
                <div class="sm:col-span-2">
                  <label for="event-date" class="block text-sm font-medium text-gray-700 mb-1">
                    活動日期 <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.time.date"
                    type="date"
                    id="event-date"
                    class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-3"
                  >
                </div>

                <!-- 開始時間 -->
                <div class="sm:col-span-2">
                  <label for="event-start" class="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                  <input
                    v-model="form.time.start"
                    type="time"
                    id="event-start"
                    class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-3"
                  >
                </div>

                <!-- 結束時間 -->
                <div class="sm:col-span-2">
                  <label for="event-end" class="block text-sm font-medium text-gray-700 mb-1">結束時間</label>
                  <input
                    v-model="form.time.end"
                    type="time"
                    id="event-end"
                    class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-3"
                  >
                </div>
              </div>
            </div>

            <!-- ── 區塊 2：地點與費用 ─────────────────────────── -->
            <div class="pt-8 space-y-6">
              <div>
                <h3 class="text-lg leading-6 font-semibold text-gray-900">地點與費用設定</h3>
                <p class="mt-1 text-sm text-gray-500">填寫活動舉辦地點、名額上限與收費資訊。</p>
              </div>

              <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <!-- 活動地點 -->
                <div class="sm:col-span-6">
                  <label for="event-location" class="block text-sm font-medium text-gray-700 mb-1">活動地點</label>
                  <input
                    v-model="form.details.location"
                    type="text"
                    id="event-location"
                    class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-3 placeholder-gray-400"
                    placeholder="例如：台北市中山區某餐廳 2F"
                  >
                </div>

                <!-- 名額上限 -->
                <div class="sm:col-span-3">
                  <label for="event-quota" class="block text-sm font-medium text-gray-700 mb-1">名額上限 (0 為無限制)</label>
                  <input
                    v-model.number="form.details.quota"
                    type="number"
                    id="event-quota"
                    min="0"
                    class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-3"
                    placeholder="0"
                  >
                </div>

                <!-- 費用金額 -->
                <div class="sm:col-span-3">
                  <label for="event-cost" class="block text-sm font-medium text-gray-700 mb-1">費用金額 (元)</label>
                  <input
                    v-model.number="form.details.cost"
                    type="number"
                    id="event-cost"
                    min="0"
                    :disabled="!form.details.isPaidEvent"
                    class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-3 disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder="0"
                  >
                </div>

                <!-- 收費選項與推播選項 -->
                <div class="sm:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                    <label class="flex items-center text-sm font-medium text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        v-model="form.details.isPaidEvent"
                        id="event-is-paid"
                        class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                      >
                      <span>此為<strong class="text-indigo-700 mx-1">收費活動</strong>（勾選後填寫金額）</span>
                    </label>
                  </div>
                  
                  <div class="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                    <label class="flex items-center text-sm font-medium text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        v-model="form.enableAutoPush"
                        id="event-auto-push"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      >
                      <span>建立時<strong class="text-blue-700 mx-1">自動發送 LINE 推播</strong></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── 區塊 3：活動詳細說明 ───────────────────────── -->
            <div class="pt-8 space-y-4">
              <div>
                <h3 class="text-lg leading-6 font-semibold text-gray-900">活動詳細說明</h3>
                <p class="mt-1 text-sm text-gray-500">提供活動的完整介紹、注意事項或議程安排。</p>
              </div>
              <textarea
                v-model="form.description"
                id="event-description"
                rows="8"
                class="block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-4 placeholder-gray-400"
                placeholder="在此輸入活動詳細說明，例如：議程、注意事項、裝備要求等..."
              ></textarea>
            </div>

            <!-- ── 錯誤訊息 ────────────────────────────────────── -->
            <div v-if="errorMsg" class="pt-6">
              <div class="bg-red-50 text-red-600 border border-red-200 rounded-lg p-4 font-medium text-sm flex items-center gap-2">
                <svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ errorMsg }}
              </div>
            </div>

          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useEventsStore } from '../../stores/events';

const router = useRouter();
const eventsStore = useEventsStore();

const isSubmitting = ref(false);
const errorMsg = ref('');

const form = ref({
  name: '',
  category: '例會',
  description: '',
  time: {
    date: '',
    start: '',
    end: '',
    deadline: ''
  },
  details: {
    location: '',
    cost: 0,
    quota: 0,
    isPaidEvent: false
  },
  status: {
    eventStatus: 'published',
    registrationStatus: '即將開放'
  },
  enableAutoPush: false
});

const submit = async () => {
  errorMsg.value = '';

  // ── 防呆驗證 ──
  if (!form.value.name.trim()) {
    errorMsg.value = '請填寫活動名稱';
    return;
  }
  if (!form.value.time.date) {
    errorMsg.value = '請選擇活動日期';
    return;
  }
  // 收費活動但費用未設定或為 0 時提醒
  if (form.value.details.isPaidEvent && form.value.details.cost <= 0) {
    errorMsg.value = '已勾選收費活動，請填寫大於 0 的費用金額';
    return;
  }

  isSubmitting.value = true;
  try {
    const newId = await eventsStore.createEvent({
      name: form.value.name.trim(),
      category: form.value.category,
      description: form.value.description.trim(),
      time: {
        date: form.value.time.date,
        start: form.value.time.start,
        end: form.value.time.end,
        deadline: form.value.time.deadline
      },
      details: {
        location: form.value.details.location.trim(),
        cost: form.value.details.isPaidEvent ? form.value.details.cost : 0,
        quota: form.value.details.quota,
        isPaidEvent: form.value.details.isPaidEvent
      },
      status: {
        eventStatus: 'published',
        registrationStatus: form.value.status.registrationStatus
      },
      enableAutoPush: form.value.enableAutoPush
    });

    if (newId) {
      router.push('/events');
    }
  } catch (err: any) {
    errorMsg.value = err.message || '發布失敗，請稍後再試';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
