
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

const userStore = useUserStore();
const loading = ref(false);
const error = ref('');
const success = ref('');

// Fields that the user is allowed to edit
const form = ref({
  mobile: '',
  email: '',
  address: '', // Assuming address might be added to schema or reused from existing fields if available, checking DESIGN.md again...
  // DESIGN.md only lists contact: { mobile, email, lineUserId } and emergency contact.
  // Let's stick to what's in DESIGN.md: contact.mobile, contact.email, emergency.*
  
  emergencyContactName: '',
  emergencyRelationship: '',
  emergencyPhone: ''
});

onMounted(() => {
  if (userStore.currentUser) {
    const user = userStore.currentUser;
    form.value.mobile = user.contact?.mobile || '';
    form.value.email = user.contact?.email || '';
    
    form.value.emergencyContactName = user.emergency?.contactName || '';
    form.value.emergencyRelationship = user.emergency?.relationship || '';
    form.value.emergencyPhone = user.emergency?.phone || '';
  }
});

const handleUpdate = async () => {
  loading.value = true;
  error.value = '';
  success.value = '';
  
  try {
    // We need to implement updateMember or use an existing one?
    // Let's assume we need to call a function. 
    // Usually 'registerMember' was for initial registration. 
    // We might need an 'updateProfile' function in backend.
    
    // For now, I'll assume we can use a generic update function or I need to create one.
    // Let's create 'updateProfile' in the backend first or in this step if not present.
    // Actually, I should check if there is an update mechanism.
    // DESIGN.md doesn't explicitly specify an update profile function for self, but 'members' collection exists.
    // I will implement a callable 'updateProfile' in backend as part of this step (modifying members.ts if needed or just adding it).
    
    const updateProfile = httpsCallable(functions, 'updateProfile');
    await updateProfile({
        contact: {
            mobile: form.value.mobile,
            email: form.value.email
        },
        emergency: {
            contactName: form.value.emergencyContactName,
            relationship: form.value.emergencyRelationship,
            phone: form.value.emergencyPhone
        }
    });

    // Refresh local user store
    await userStore.initAuth();
    success.value = '個人資料更新成功';
  } catch (e: any) {
    error.value = e.message || '更新失敗';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="md:grid md:grid-cols-3 md:gap-6">
      <div class="md:col-span-1">
        <div class="px-4 sm:px-0">
          <h3 class="text-lg font-medium leading-6 text-gray-900">個人資料</h3>
          <p class="mt-1 text-sm text-gray-600">
            維護您的聯絡資訊與緊急聯絡人。
          </p>
        </div>
      </div>
      <div class="mt-5 md:mt-0 md:col-span-2">
        <form @submit.prevent="handleUpdate">
          <div class="shadow sm:rounded-md sm:overflow-hidden">
            <div class="px-4 py-5 bg-white space-y-6 sm:p-6">
              
              <!-- Contact Info -->
              <div>
                <h4 class="text-md font-medium text-gray-900 mb-4">聯絡資訊</h4>
                <div class="grid grid-cols-6 gap-6">
                  <div class="col-span-6 sm:col-span-3">
                    <label for="mobile" class="block text-sm font-medium text-gray-700">手機號碼</label>
                    <input type="tel" v-model="form.mobile" id="mobile" class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                  </div>

                  <div class="col-span-6 sm:col-span-3">
                    <label for="email" class="block text-sm font-medium text-gray-700">電子郵件</label>
                    <input type="email" v-model="form.email" id="email" class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                  </div>
                </div>
              </div>

              <div class="border-t border-gray-200 pt-6">
                 <h4 class="text-md font-medium text-gray-900 mb-4">緊急聯絡人</h4>
                 <div class="grid grid-cols-6 gap-6">
                    <div class="col-span-6 sm:col-span-2">
                        <label for="emergencyName" class="block text-sm font-medium text-gray-700">姓名</label>
                        <input type="text" v-model="form.emergencyContactName" id="emergencyName" class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                    </div>
                    <div class="col-span-6 sm:col-span-2">
                        <label for="emergencyRel" class="block text-sm font-medium text-gray-700">關係</label>
                        <input type="text" v-model="form.emergencyRelationship" id="emergencyRel" class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                    </div>
                    <div class="col-span-6 sm:col-span-2">
                        <label for="emergencyPhone" class="block text-sm font-medium text-gray-700">電話</label>
                        <input type="tel" v-model="form.emergencyPhone" id="emergencyPhone" class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md">
                    </div>
                 </div>
              </div>

            </div>
            
            <div v-if="error" class="px-4 py-3 bg-red-50 text-red-600 text-sm text-center">
                {{ error }}
            </div>
            <div v-if="success" class="px-4 py-3 bg-green-50 text-green-600 text-sm text-center">
                {{ success }}
            </div>

            <div class="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <button type="submit" :disabled="loading" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                {{ loading ? '儲存中...' : '儲存變更' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
