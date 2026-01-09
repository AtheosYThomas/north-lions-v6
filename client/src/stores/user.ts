
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Member } from 'shared/types';

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<Member | null>(null);
  const isAuthenticated = ref(false);

  function setUser(user: Member) {
    currentUser.value = user;
    isAuthenticated.value = true;
  }

  function clearUser() {
    currentUser.value = null;
    isAuthenticated.value = false;
  }

  return { currentUser, isAuthenticated, setUser, clearUser };
});
