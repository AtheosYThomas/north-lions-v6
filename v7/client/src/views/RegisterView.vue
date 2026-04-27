<template>
  <div class="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
    <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-xl border border-gray-100">
      <div>
        <h2 class="mt-2 text-center text-3xl font-extrabold text-gray-900">
          完成獅友綁定註冊
        </h2>
        <p class="mt-4 text-center text-sm text-gray-600">
          系統偵測到您的 LINE 帳號尚未建立本會正式檔案。<br>請填妥以下基本資料以便為您綁定系統身分。
        </p>
      </div>
      
      <form class="mt-8 space-y-6" @submit.prevent="submitRegistration">
        <div class="rounded-md shadow-sm space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">真實姓名 <span class="text-red-500">*</span></label>
            <input id="name" name="name" type="text" required v-model="form.name" class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="例如：王小明">
          </div>
          <div>
            <label for="mobile" class="block text-sm font-medium text-gray-700">手機號碼 <span class="text-red-500">*</span></label>
            <input id="mobile" name="mobile" type="tel" required v-model="form.mobile" class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="例如：0912345678">
          </div>
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">電子信箱</label>
            <input id="email" name="email" type="email" v-model="form.email" class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="optional@example.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">LINE User ID (綁定識別碼)</label>
            <input type="text" disabled :value="authStore.user?.uid" class="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-md sm:text-sm cursor-not-allowed">
          </div>
        </div>

        <div>
          <button type="submit" :disabled="submitting" class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors">
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" v-if="!submitting">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
            </span>
            {{ submitting ? '資料建立中...' : '送出註冊並綁定' }}
          </button>
        </div>
        <p v-if="errorMsg" class="text-sm text-red-500 text-center font-medium">{{ errorMsg }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useMembersStore } from '../stores/members';

const router = useRouter();
const authStore = useAuthStore();
const membersStore = useMembersStore();

const form = ref({
  name: '',
  mobile: '',
  email: ''
});

const submitting = ref(false);
const errorMsg = ref('');

const submitRegistration = async () => {
  if (!authStore.user || !authStore.user.uid) {
    errorMsg.value = '發生錯誤：找不到有效的 LINE 授權紀錄，請重新登入。';
    return;
  }
  
  submitting.value = true;
  errorMsg.value = '';

  try {
    const newMemberData = {
      name: form.value.name,
      photoUrl: authStore.user.photoURL || '',
      organization: { role: '一般會員', title: '' },
      contact: {
        mobile: form.value.mobile,
        email: form.value.email,
        lineUserId: authStore.user.uid // 綁定 LINE!
      },
      status: {
        activeStatus: 'active' as const,
        membershipType: '潛在' as const // 預設為潛在，直到幹部審核改為正式
      },
      system: { 
        account: form.value.email || form.value.mobile,
        role: 'Member' as const, 
        accountStatus: 'active' as const,
        pushConsent: true
      }
    };

    // **更新**原本已經由後端預先建立好的 Member 紀錄，而不是新增 (addDoc)，因為 UID 相同
    const success = await membersStore.updateMember(authStore.user.uid, newMemberData);
    
    if (success) {
      // 成功後，強制重新加載 authStore
      await authStore.setUser({
        uid: authStore.user.uid,
        displayName: form.value.name,
        photoURL: authStore.user.photoURL,
        role: 'member'
      } as any);
      alert('註冊成功！歡迎加入北大獅子會系統。');
      router.push('/');
    } else {
      throw new Error('權限不足或伺服器無回應');
    }
  } catch (err: any) {
    errorMsg.value = '註冊失敗：' + err.message;
  } finally {
    submitting.value = false;
  }
};
</script>
