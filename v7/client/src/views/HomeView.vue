<template>
  <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-left animate-fade-in">
    <div class="mb-10">
      <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight">歡迎來到北大獅子會系統 V7</h1>
      <p class="mt-4 text-lg text-gray-600">
        <span v-if="authStore.loading">🔄 確認身分中...</span>
        <span v-else-if="authStore.user">已登入為: <span class="font-bold text-indigo-700">{{ authStore.user.displayName || '會員' }}</span></span>
        <span v-else>⚠️ 尚未登入系統，請前往<router-link to="/login" class="text-indigo-600 underline px-1">登入頁面</router-link></span>
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- 會員系統 -->
      <div v-if="authStore.isAuthenticated" class="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-8 transition-all hover:shadow-md hover:-translate-y-1">
        <div class="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">會員名冊</h2>
        <p class="text-gray-500 text-sm mb-6">瀏覽北大獅子會所有會員資料（管理員可編輯）。</p>
        <router-link to="/members" class="text-indigo-600 font-semibold hover:text-indigo-800 text-sm flex items-center">
          進入模組 <svg class="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
        </router-link>
      </div>

      <!-- 活動報名 -->
      <div class="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-8 transition-all hover:shadow-md hover:-translate-y-1">
        <div class="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">活動報名</h2>
        <p class="text-gray-500 text-sm mb-6">檢視例會與活動並進行線上報名。</p>
        <router-link to="/events" class="text-emerald-600 font-semibold hover:text-emerald-800 text-sm flex items-center">
          進入模組 <svg class="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
        </router-link>
      </div>

      <!-- 最新公告 -->
      <div class="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-8 transition-all hover:shadow-md hover:-translate-y-1">
        <div class="h-12 w-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">最新公告</h2>
        <p class="text-gray-500 text-sm mb-6">查看系統與獅子會內重要公告事項。</p>
        <router-link to="/announcements" class="text-amber-600 font-semibold hover:text-amber-800 text-sm flex items-center">
          進入模組 <svg class="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
        </router-link>
      </div>

      <!-- 個人設定 -->
      <div class="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-8 transition-all hover:shadow-md hover:-translate-y-1">
        <div class="h-12 w-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center mb-6">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">個人設定</h2>
        <p class="text-gray-500 text-sm mb-6">修改基本資料、聯絡方式與檢視統計。</p>
        <router-link to="/profile" class="text-teal-600 font-semibold hover:text-teal-800 text-sm flex items-center">
          進入模組 <svg class="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
        </router-link>
      </div>

      <!-- 專屬帳單 -->
      <div v-if="authStore.isAuthenticated" class="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 border-l-4 border-orange-500 p-8 transition-all hover:shadow-md hover:-translate-y-1">
        <div class="h-12 w-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-6">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">專屬帳單</h2>
        <p class="text-gray-500 text-sm mb-6">檢視並繳納個人專屬會費及各項費用。</p>
        <router-link to="/billing" class="text-orange-600 font-semibold hover:text-orange-800 text-sm flex items-center">
          查看帳單 <svg class="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
        </router-link>
      </div>

      <!-- 財務對帳/管理後台 (僅限管理員) -->
      <div v-if="authStore.isAdmin" class="bg-indigo-900 rounded-2xl shadow-sm ring-1 ring-black/5 p-8 transition-all hover:shadow-lg hover:-translate-y-1 relative overflow-hidden">
        <div class="h-12 w-12 bg-white/20 text-white rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 class="text-xl font-bold text-white mb-2">管理後台 (Admin)</h2>
        <p class="text-indigo-200 text-sm mb-6">財務對帳與系統進階設定中心。</p>
        <a href="/admin/?refresh=1" class="text-white font-semibold hover:text-indigo-100 text-sm flex items-center">
          進入對帳中心 <svg class="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth';
const authStore = useAuthStore();
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
