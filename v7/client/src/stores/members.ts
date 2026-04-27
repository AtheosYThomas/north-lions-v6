import { defineStore } from 'pinia';
import { ref } from 'vue';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Member } from 'shared';

export const useMembersStore = defineStore('members', () => {
  const members = ref<(Member & { id: string })[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchMembers = async () => {
    loading.value = true;
    error.value = null;
    try {
      const q = query(collection(db, 'members'), orderBy('system.role'));
      const snapshot = await getDocs(q);
      members.value = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Member) }));
    } catch (e: any) {
      error.value = e.message;
      console.error(e);
    } finally {
      loading.value = false;
    }
  };

  const getMemberById = async (id: string) => {
    try {
      const docRef = doc(db, 'members', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...(docSnap.data() as Member) };
      }
      return null;
    } catch (e: any) {
      console.error(e);
      return null;
    }
  };

  const updateMember = async (id: string, data: Partial<Member>) => {
    try {
      const docRef = doc(db, 'members', id);
      await updateDoc(docRef, data);
      
      const index = members.value.findIndex(m => m.id === id);
      if (index !== -1) {
        members.value[index] = { ...members.value[index], ...data };
      }
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  };

  const createMember = async (data: Omit<Member, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'members'), data);
      members.value.push({ id: docRef.id, ...(data as Member) });
      return docRef.id;
    } catch (e: any) {
      console.error('Error creating member:', e);
      return null;
    }
  };

  return { members, loading, error, fetchMembers, getMemberById, updateMember, createMember };
});
