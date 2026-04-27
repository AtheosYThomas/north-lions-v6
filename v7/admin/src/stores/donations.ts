import { defineStore } from 'pinia';
import { ref } from 'vue';
import { collection, getDocs, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Donation } from 'shared';
import {
  DONATION_CATEGORIES,
  DONATIONS_COLLECTION,
  mapDonationSnapshot,
  queryAllDonationsRecent,
  queryDonationsForMember,
  withDefaultApprovedAudit,
} from 'shared/stores/donationsLogic';

export const useDonationsStore = defineStore('donations', () => {
  const donations = ref<(Donation & { id: string })[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAllDonations = async () => {
    loading.value = true;
    error.value = null;
    try {
      const snapshot = await getDocs(queryAllDonationsRecent(db));
      donations.value = mapDonationSnapshot(snapshot);
      return donations.value;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Firebase Error] fetchAllDonations 發生錯誤:', e);
      error.value = msg;
      return [];
    } finally {
      loading.value = false;
    }
  };

  const fetchMyDonations = async (memberId: string) => {
    loading.value = true;
    error.value = null;
    try {
      const snapshot = await getDocs(queryDonationsForMember(db, memberId));
      const myDonations = mapDonationSnapshot(snapshot);
      return myDonations;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Firebase Error] fetchMyDonations 發生錯誤:', e);
      error.value = msg;
      return [];
    } finally {
      loading.value = false;
    }
  };

  const createDonation = async (payload: Omit<Donation, 'id'>) => {
    loading.value = true;
    error.value = null;
    try {
      const dataToSave = withDefaultApprovedAudit(payload);
      const docRef = await addDoc(collection(db, DONATIONS_COLLECTION), dataToSave);
      const newDonation = { id: docRef.id, ...dataToSave };

      donations.value.unshift(newDonation as Donation & { id: string });
      return newDonation;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Create Donation Error:', e);
      error.value = msg;
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const deleteDonation = async (id: string) => {
    try {
      await deleteDoc(doc(db, DONATIONS_COLLECTION, id));
      donations.value = donations.value.filter((d) => d.id !== id);
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Delete Donation Error:', e);
      error.value = msg;
      return false;
    }
  };

  return {
    donations,
    loading,
    error,
    DONATION_CATEGORIES,
    fetchAllDonations,
    fetchMyDonations,
    createDonation,
    deleteDonation,
  };
});
