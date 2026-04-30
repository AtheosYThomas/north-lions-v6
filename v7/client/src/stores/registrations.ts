import { defineStore } from 'pinia';
import { ref } from 'vue';
import { collection, getDocs, doc, query, where, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import type { Registration } from 'shared';

export const useRegistrationsStore = defineStore('registrations', () => {
  const registrations = ref<(Registration & { id: string })[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 取得特定活動的所有報名紀錄（僅幹部／管理端；一般會員請用 fetchRegistrationsByEventForMember）
  const fetchRegistrationsByEvent = async (eventId: string) => {
    loading.value = true;
    error.value = null;
    try {
      const q = query(collection(db, 'registrations'), where('info.eventId', '==', eventId));
      const snapshot = await getDocs(q);
      registrations.value = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Registration) }));
      return registrations.value;
    } catch (e: any) {
      console.error('[Firebase Error] fetchRegistrationsByEvent 發生錯誤:', e);
      error.value = e.message;
      return [];
    } finally {
      loading.value = false;
    }
  };

  /** 一般會員：僅能讀取自己在某活動下的報名（符合 Firestore rules） */
  const fetchRegistrationsByEventForMember = async (eventId: string, memberId: string) => {
    loading.value = true;
    error.value = null;
    try {
      const q = query(
        collection(db, 'registrations'),
        where('info.eventId', '==', eventId),
        where('info.memberId', '==', memberId),
      );
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Registration) }));
      registrations.value = rows;
      return rows;
    } catch (e: any) {
      console.error('[Firebase Error] fetchRegistrationsByEventForMember:', e);
      error.value = e.message;
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 取得特定使用者的所有報名紀錄 (給My Profile用)
  const fetchMyRegistrations = async (memberId: string) => {
    loading.value = true;
    try {
      const q = query(collection(db, 'registrations'), where('info.memberId', '==', memberId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Registration) }));
    } catch (e: any) {
      console.error(e);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 一鍵報名邏輯
  const createRegistration = async (eventId: string, memberId: string, adultCount: number = 1, childCount: number = 0) => {
    try {
      const data: Omit<Registration, 'id'> = {
        info: {
          memberId,
          eventId,
          timestamp: serverTimestamp() as any
        },
        details: {
          adultCount,
          childCount
        },
        status: {
          status: '已報名',
          paymentStatus: '未繳費'
        }
      };
      const docRef = await addDoc(collection(db, 'registrations'), data);
      const newReg = { id: docRef.id, ...data };
      registrations.value.push(newReg);
      return newReg;
    } catch (e: any) {
      console.error('Registration failed:', e);
      throw e;
    }
  };

  // 更新報名狀態 (取消報名等)
  const updateRegistrationStatus = async (regId: string, status: Registration['status']['status']) => {
    try {
      await updateDoc(doc(db, 'registrations', regId), {
        'status.status': status
      });
      const idx = registrations.value.findIndex(r => r.id === regId);
      if (idx !== -1) {
        registrations.value[idx].status.status = status;
      }
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  };

  // 更新報名細節（人數）
  const updateRegistrationCounts = async (regId: string, adultCount: number, childCount: number) => {
    try {
      await updateDoc(doc(db, 'registrations', regId), {
        'details.adultCount': adultCount,
        'details.childCount': childCount,
        'status.status': '已報名' // 若原本已取消，一併改回已報名
      });
      const idx = registrations.value.findIndex(r => r.id === regId);
      if (idx !== -1) {
        registrations.value[idx].details.adultCount = adultCount;
        registrations.value[idx].details.childCount = childCount;
        registrations.value[idx].status.status = '已報名';
      }
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  };

  // 報到邏輯
  const checkIn = async (eventId: string, memberId: string) => {
    try {
      const q = query(
        collection(db, 'registrations'), 
        where('info.eventId', '==', eventId), 
        where('info.memberId', '==', memberId)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error('找不到報名紀錄或您尚未報名此活動');
      }

      const docSnapshot = snapshot.docs[0];
      
      // 若已取消則不能報到
      if (docSnapshot.data().status.status === '已取消') {
         throw new Error('此報名已取消，無法報到');
      }

      await updateDoc(docSnapshot.ref, {
        'status.status': '已出席',
        'info.checkInTime': serverTimestamp()
      });

      // Update local state if the registration is currently loaded
      const idx = registrations.value.findIndex(r => r.id === docSnapshot.id);
      if (idx !== -1) {
        registrations.value[idx].status.status = '已出席' as any;
      }

      return true;
    } catch (e: any) {
      console.error('Checkin failed:', e);
      throw e;
    }
  };

  const submitManualPayment = async (regId: string, payload: {
    reportedAmount: number;
    reportedLast5: string;
    reportedDate: string;
    memo?: string;
  }) => {
    try {
      await updateDoc(doc(db, 'registrations', regId), {
        'status.status': '已上傳憑證',
        'status.paymentStatus': '審核中',
        'payment.reportMethod': 'web_manual',
        'payment.reportedAmount': payload.reportedAmount,
        'payment.reportedLast5': payload.reportedLast5,
        'payment.reportedDate': payload.reportedDate,
        'payment.memo': payload.memo || ''
      });
      const idx = registrations.value.findIndex(r => r.id === regId);
      if (idx !== -1) {
        registrations.value[idx].status.status = '已上傳憑證' as any;
        registrations.value[idx].status.paymentStatus = '審核中';
        if (!registrations.value[idx].payment) registrations.value[idx].payment = {};
        Object.assign(registrations.value[idx].payment!, {
          reportMethod: 'web_manual',
          ...payload
        });
      }
    } catch (e: any) {
      throw new Error('手動回報失敗：' + (e.message || '未知錯誤'));
    }
  };

  const uploadPaymentReceipt = async (regId: string, file: File) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('尚未登入，無法上傳憑證');
      const fileExt = file.name.split('.').pop() || '';
      const uniqueFileName = `${Date.now()}_${regId.substring(0,8)}.${fileExt}`;
      const fileRef = storageRef(storage, `members/${uid}/payment_receipts/${uniqueFileName}`);
      
      await uploadBytes(fileRef, file, {
        customMetadata: { regId }
      });
      const url = await getDownloadURL(fileRef);
      
      await updateDoc(doc(db, 'registrations', regId), {
        'status.status': '已上傳憑證',
        'status.paymentStatus': '審核中',
        'payment.reportMethod': 'web_image',
        'payment.screenshotUrl': url
      });
      
      const idx = registrations.value.findIndex(r => r.id === regId);
      if (idx !== -1) {
        registrations.value[idx].status.status = '已上傳憑證' as any;
        registrations.value[idx].status.paymentStatus = '審核中';
        if (!registrations.value[idx].payment) {
          registrations.value[idx].payment = {};
        }
        registrations.value[idx].payment!.screenshotUrl = url;
      }
      
      return url;
    } catch (e: any) {
      console.error('Failed to upload receipt:', e);
      throw new Error('上傳憑證失敗：' + (e.message || '未知錯誤'));
    }
  };

  return { 
    registrations, 
    loading, 
    error, 
    fetchRegistrationsByEvent, 
    fetchRegistrationsByEventForMember,
    fetchMyRegistrations, 
    createRegistration, 
    updateRegistrationStatus,
    updateRegistrationCounts,
    checkIn,
    uploadPaymentReceipt,
    submitManualPayment
  };
});
