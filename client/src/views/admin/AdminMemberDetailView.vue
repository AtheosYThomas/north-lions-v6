
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

const route = useRoute();
const member = ref<any>(null);
const loading = ref(true);
const error = ref('');
const success = ref('');

const memberId = route.params.id as string;

const form = ref({
    activeStatus: '',
    role: '',
    membershipType: ''
});

const fetchMember = async () => {
  try {
    // We don't have a specific getMember(id) function for admin, but we can iterate from getMembers list locally or strictly implement getMember.
    // However, since we are admin, we can likely just use the client SDK to fetch document directly if rules allow, or implement getMember.
    // But `getMembers` returns all. Let's use `getMembers` for now and find the one. 
    // In a real app with pagination, we'd need a specific endpoint.
    // Better: let's quickly add a simple getMemberById or just rely on Firestore client SDK if rules allow admin read.
    // The current firestore.rules (implied) might allow admin read.
    // Let's try to reuse getMembers and filter for now as it's implemented.
    
    const getMembers = httpsCallable(functions, 'getMembers');
    const result = await getMembers();
    // @ts-ignore
    const allMembers = result.data.members;
    member.value = allMembers.find((m: any) => m.id === memberId);
    
    if (member.value) {
        form.value.activeStatus = member.value.status?.activeStatus || 'active';
        form.value.role = member.value.system?.role || 'member';
        form.value.membershipType = member.value.status?.membershipType || 'regular';
    } else {
        error.value = 'Member not found';
    }
  } catch (e: any) {
    error.value = e.message || '無法取得會員資料';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchMember();
});

const handleUpdate = async () => {
    loading.value = true;
    error.value = '';
    success.value = '';
    try {
        const updateMemberStatus = httpsCallable(functions, 'updateMemberStatus');
        await updateMemberStatus({
            memberId,
            status: {
                activeStatus: form.value.activeStatus,
                membershipType: form.value.membershipType
            },
            role: form.value.role
        });
        success.value = '更新成功';
        // Refresh
        await fetchMember();
    } catch (e: any) {
        error.value = e.message || '更新失敗';
    } finally {
        loading.value = false;
    }
};
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="sm:flex sm:items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-gray-900">會員詳細資料 (Admin)</h1>
      <button type="button" @click="$router.back()" class="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
          返回
      </button>
    </div>

    <div v-if="loading" class="text-center py-4">載入中...</div>
    <div v-else-if="error" class="text-center py-4 text-red-600">{{ error }}</div>
    
    <div v-else-if="member" class="bg-white shadow overflow-hidden sm:rounded-lg">
      <div class="px-4 py-5 sm:px-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">{{ member.name }}</h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500">{{ member.organization?.title }} | {{ member.id }}</p>
      </div>
      
      <div class="border-t border-gray-200 px-4 py-5 sm:p-0">
         <dl class="sm:divide-y sm:divide-gray-200">
            <!-- Read-only info -->
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">手機</dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ member.contact?.mobile }}</dd>
            </div>
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">Email</dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ member.contact?.email }}</dd>
            </div>
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">統計</dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    捐款總額: {{ member.stats?.totalDonation || 0 }} ({{ member.stats?.donationCount || 0 }}次)
                </dd>
            </div>

            <!-- Editable Fields -->
            <div class="py-4 sm:py-5 sm:px-6 bg-gray-50">
                <h4 class="text-md font-medium text-gray-900 mb-4">狀態管理</h4>
                <form @submit.prevent="handleUpdate" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">會員狀態</label>
                            <select v-model="form.activeStatus" class="mt-1 block w-full border rounded p-2">
                                <option value="active">活躍 (Active)</option>
                                <option value="suspended">休會 (Suspended)</option>
                                <option value="resigned">退會 (Resigned)</option>
                                <option value="pending_registration">註冊中 (Pending)</option>
                            </select>
                        </div>
                         <div>
                            <label class="block text-sm font-medium text-gray-700">身分別</label>
                            <select v-model="form.membershipType" class="mt-1 block w-full border rounded p-2">
                                <option value="regular">正式會員</option>
                                <option value="charter">創會會員</option>
                                <option value="honorary">榮譽會員</option>
                                <option value="potential">潛在會員</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">系統權限 (Role)</label>
                        <select v-model="form.role" class="mt-1 block w-full border rounded p-2">
                            <option value="member">一般會員 (Member)</option>
                            <option value="admin">管理員 (Admin)</option>
                        </select>
                    </div>

                    <div v-if="success" class="text-green-600 text-sm">{{ success }}</div>

                    <button type="submit" :disabled="loading" class="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50">
                        {{ loading ? '更新中...' : '儲存變更' }}
                    </button>
                </form>
            </div>
         </dl>
      </div>
    </div>
  </div>
</template>
