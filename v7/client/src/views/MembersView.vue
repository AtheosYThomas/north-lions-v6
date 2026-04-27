<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
    <div class="sm:flex sm:items-center sm:justify-between mb-8">
      <div>
        <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">會員名冊</h1>
        <p class="mt-2 text-sm text-gray-600">管理與瀏覽北大獅子會所有會員名單，並支援狀態與權限狀態指派。</p>
      </div>
      <div class="mt-4 sm:mt-0">
        <router-link to="/" class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center">
          回首頁
        </router-link>
      </div>
    </div>
    
    <div class="bg-white/70 backdrop-blur-lg shadow-xl ring-1 ring-black/5 rounded-2xl overflow-x-auto">
      <div v-if="membersStore.error" class="p-4 bg-red-50 text-red-600 text-sm">
        無法載入資料 ({{ membersStore.error }})，請確認 Firestore 權限。
      </div>
      <div v-if="membersStore.loading" class="p-8 text-center text-gray-500 animate-pulse">
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        載入最高機密名單中...
      </div>
      <div v-else>
        <div class="sm:hidden p-4 space-y-3">
          <div
            v-for="member in membersStore.members"
            :key="member.id"
            class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div class="flex items-center gap-3 mb-3">
              <div class="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shadow-inner overflow-hidden">
                <img v-if="member?.photoUrl" :src="member.photoUrl" class="h-full w-full object-cover" />
                <span v-else>{{ member?.name ? member.name.charAt(0) : '獅' }}</span>
              </div>
              <div class="min-w-0">
                <div class="font-medium text-gray-900 truncate">{{ member?.name || '未命名' }}</div>
                <div class="text-xs text-gray-500">{{ member?.status?.membershipType || '未知' }}</div>
              </div>
            </div>
            <div class="space-y-1.5 text-sm">
              <div v-if="isGuarded(member.id)" class="text-gray-400 italic flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                僅正式會員可見
              </div>
              <template v-else>
                <div class="text-gray-900">手機：{{ member?.contact?.mobile || '無提供' }}</div>
                <div class="text-xs text-gray-500 break-all">Email：{{ member?.contact?.email || '無提供' }}</div>
              </template>
              <div class="flex items-center gap-2 pt-1">
                <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {{ member?.organization?.role || '一般會員' }}
                </span>
                <span :class="[
                  member?.status?.activeStatus === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-red-50 text-red-700 ring-red-600/20',
                  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset'
                ]">
                  {{ member?.status?.activeStatus === 'active' ? '活躍' : '停用' }}
                </span>
              </div>
              <div class="text-xs text-gray-500">權限: {{ member?.system?.role || 'Guest' }}</div>
            </div>
            <router-link
              :to="`/members/${member.id}`"
              class="mt-3 inline-flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              檢視資料
            </router-link>
          </div>
          <div v-if="membersStore.members.length === 0" class="py-10 text-center text-gray-500">
            目前資料庫中沒有任何會員資料。<br>請嘗試透過 LINE 登入自己來自動建立一筆！
          </div>
        </div>

        <div class="hidden sm:block overflow-x-auto">
          <table class="min-w-[640px] w-full divide-y divide-gray-200/50">
            <thead class="bg-gray-50/80 backdrop-blur-sm">
              <tr>
                <th class="py-4 pl-6 pr-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">會員姓名</th>
                <th class="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">聯絡方式</th>
                <th class="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">職務與頭銜</th>
                <th class="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">系統狀態</th>
                <th class="relative py-4 pl-3 pr-6">
                  <span class="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-transparent">
              <tr
                v-for="member in membersStore.members"
                :key="member.id"
                class="hover:bg-gray-50/50 transition-colors duration-150 cursor-pointer"
                @click="goToMember(member.id)"
              >
                <td class="py-4 pl-6 pr-3 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shadow-inner overflow-hidden">
                      <img v-if="member?.photoUrl" :src="member.photoUrl" class="h-full w-full object-cover" />
                      <span v-else>{{ member?.name ? member.name.charAt(0) : '獅' }}</span>
                    </div>
                    <div class="ml-4">
                      <div class="font-medium text-gray-900">{{ member?.name || '未命名' }}</div>
                      <div class="text-xs text-gray-500">{{ member?.status?.membershipType || '未知' }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-4 whitespace-nowrap">
                  <template v-if="isGuarded(member.id)">
                    <div class="text-sm text-gray-400 italic flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                      僅正式會員可見
                    </div>
                  </template>
                  <template v-else>
                    <div class="text-sm text-gray-900">{{ member?.contact?.mobile || '無提供' }}</div>
                    <div class="text-xs text-gray-500">{{ member?.contact?.email || '無提供' }}</div>
                  </template>
                </td>
                <td class="px-3 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mb-1">
                    {{ member?.organization?.role || '一般會員' }}
                  </span>
                  <div class="text-xs text-gray-500">{{ member?.organization?.title || '' }}</div>
                </td>
                <td class="px-3 py-4 whitespace-nowrap">
                  <span :class="[
                      member?.status?.activeStatus === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-red-50 text-red-700 ring-red-600/20',
                      'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset'
                    ]">
                    {{ member?.status?.activeStatus === 'active' ? '活躍' : '停用' }}
                  </span>
                  <div class="text-xs text-gray-500 mt-1">權限: {{ member?.system?.role || 'Guest' }}</div>
                </td>
                <td class="py-4 pl-3 pr-6 whitespace-nowrap text-right text-sm font-medium">
                  <router-link :to="`/members/${member.id}`" class="text-indigo-600 hover:text-indigo-900 font-semibold hover:underline" @click.stop>
                    檢視資料<span class="sr-only">, {{ member.name }}</span>
                  </router-link>
                </td>
              </tr>
              <tr v-if="membersStore.members.length === 0 && !membersStore.loading">
                <td colspan="5" class="py-12 text-center text-gray-500">目前資料庫中沒有任何會員資料。<br>請嘗試透過 LINE 登入自己來自動建立一筆！</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMembersStore } from '../stores/members';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const membersStore = useMembersStore();
const authStore = useAuthStore();

const goToMember = (id: string) => {
  router.push(`/members/${id}`);
};

const isGuarded = (memberId: string) => {
  return authStore.isPendingMember && 
         memberId !== authStore.user?.memberId && 
         memberId !== authStore.user?.uid;
};

onMounted(() => {
  membersStore.fetchMembers();
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
