<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import { db } from '../firebase';
import { useAuthStore } from '../stores/auth';
import type { BillingRecord } from 'shared';
import confetti from 'canvas-confetti';
import { compressImage } from '../utils/imageCompressor';

const authStore = useAuthStore();
const bills = ref<(BillingRecord & { id: string })[]>([]);
const loading = ref(true);

const fileInput = ref<HTMLInputElement | null>(null);
const activeBillId = ref('');
const isUploading = ref(false);
let _unsubscribeBilling: (() => void) | null = null;



onMounted(async () => {
    await fetchBills();
    setupLiveListener();
});

onUnmounted(() => {
    if (_unsubscribeBilling) {
        _unsubscribeBilling();
        _unsubscribeBilling = null;
    }
});

const setupLiveListener = () => {
    // 先關掉舊的監聽避免重疊洩漏
    if (_unsubscribeBilling) {
        _unsubscribeBilling();
        _unsubscribeBilling = null;
    }

    const memberId = authStore.user?.memberId;
    if (!memberId) return;

    const q = query(collection(db, 'billing_records'), where('memberId', '==', memberId));
    _unsubscribeBilling = onSnapshot(q, async (snap) => {
        // Fetch published campaigns to filter out drafts
        const cSnap = await getDocs(query(collection(db, 'billing_campaigns'), where('isPublished', '==', true)));
        const publishedIds = cSnap.docs.map(d => d.id);
        
        bills.value = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as BillingRecord & { id: string }))
                .filter(b => publishedIds.includes(b.campaignId))
                .sort((a, b) => {
                    if (a.status.status === 'pending' && b.status.status !== 'pending') return -1;
                    if (a.status.status !== 'pending' && b.status.status === 'pending') return 1;
                    return 0;
                });
    });
};

const fetchBills = async () => {
    loading.value = true;
    try {
        const memberId = authStore.user?.memberId;
        if (!memberId) return;

        const cSnap = await getDocs(query(collection(db, 'billing_campaigns'), where('isPublished', '==', true)));
        const publishedIds = cSnap.docs.map(d => d.id);
        
        const q = query(collection(db, 'billing_records'), where('memberId', '==', memberId));
        const snap = await getDocs(q);
        
        bills.value = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as BillingRecord & { id: string }))
            .filter(b => publishedIds.includes(b.campaignId))
            .sort((a, b) => {
                if (a.status.status === 'pending' && b.status.status !== 'pending') return -1;
                if (a.status.status !== 'pending' && b.status.status === 'pending') return 1;
                return 0;
            });
    } catch (error) {
        console.error("Failed to fetch bills:", error);
    } finally {
        loading.value = false;
    }
};

const triggerUpload = (billId: string) => {
    activeBillId.value = billId;
    fileInput.value?.click();
};

const handleFileUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !activeBillId.value) return;

    // ✅ [防呆] 非圖片格式攔截 (避免 browser-image-compression 崩潰)
    if (!file.type.startsWith('image/')) {
        alert(`🚨 格式錯誤！只能上傳圖片檔案（JPG/PNG），不支援「${file.type || '未知格式'}」。`);
        if (fileInput.value) fileInput.value.value = '';
        activeBillId.value = '';
        return;
    }

    const bill = bills.value.find(b => b.id === activeBillId.value);
    
    // 重複圖片防呆
    if (bill?.payment?.receipts?.some((r: any) => r.originalName === file.name && r.fileSize === String(file.size))) {
        if (!confirm('🚨 系統警告：您似乎已經上傳過這張相同的憑證圖片！確定要重複上傳進行疊加嗎？')) {
            activeBillId.value = '';
            if (fileInput.value) fileInput.value.value = '';
            return;
        }
    }

    isUploading.value = true;
    try {
        // 壓縮圖片
        const compressedFile = await compressImage(file);
        
        const storage = getStorage();
        const ext = file.name.split('.').pop();
        const timestamp = new Date().getTime();
        const sRef = storageRef(storage, `receipts/${authStore.user?.memberId}/${activeBillId.value}_${timestamp}.${ext}`);
        
        await uploadBytes(sRef, compressedFile, { 
            customMetadata: { 
                billId: activeBillId.value,
                recordType: 'billing',
                originalName: file.name,
                fileSize: String(file.size)
            } 
        });
        
        // Let the user know the AI is parsing. Function handles the rest via Storage Trigger.
        const recordRef = doc(db, 'billing_records', activeBillId.value);
        await updateDoc(recordRef, {
            'payment.reportMethod': 'web_image',
            'status.status': 'submitted' // optimistic update, AI might change it back to partial if needed
        });

        // 觸發多巴胺動畫
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        alert('✅ 送出成功！\n憑證已上傳，請靜候財務審核！(AI 會計助手正在為您進行初步對帳)');
    } catch (error) {
        console.error("Failed to upload receipt", error);
        alert('上傳失敗，請再試一次。');
    } finally {
        isUploading.value = false;
        activeBillId.value = '';
        if (fileInput.value) fileInput.value.value = '';
    }
};

const removeReceipt = async (billId: string, idx: number) => {
    const bill = bills.value.find(b => b.id === billId);
    if (!bill || !bill.payment || !bill.payment.receipts) return;
    
    if (!confirm('確定要作廢並移除這張憑證嗎？這筆款項將會自動從總額中扣除。')) return;
    
    // Get the receipt to remove
    const rcptToRemove = bill.payment.receipts[idx];
    const amountToDeduct = rcptToRemove.aiAmount || 0;
    
    // Create new array
    const newReceipts = [...bill.payment.receipts];
    newReceipts.splice(idx, 1);
    
    // Calculate new total
    const newTotal = Math.max(0, (bill.payment.totalPaidAmount || 0) - amountToDeduct);
    
    // Determine new status
    let newStatus = bill.status.status;
    if (newStatus === 'submitted' && newTotal < bill.billing.expectedAmount) {
        newStatus = newTotal > 0 ? 'partial_paid' : 'pending';
    } else if (newStatus === 'partial_paid' && newTotal === 0) {
        newStatus = 'pending';
    }
    
    // Keep 'rejected' as is, it's manually set by admin
    
    try {
        await updateDoc(doc(db, 'billing_records', billId), {
            'payment.receipts': newReceipts,
            'payment.totalPaidAmount': newTotal,
            'status.status': newStatus
        });
        
        // Local update handled by onSnapshot
    } catch(e) {
        console.error("Failed to remove receipt:", e);
        alert('作廢憑證失敗！');
    }
};

const formatDate = (dateNum: any) => {
    if (!dateNum || !dateNum.seconds) return '無期限';
    return new Date(dateNum.seconds * 1000).toLocaleDateString('zh-TW');
};

const openReceipt = (url: string) => {
    window.open(url, '_blank');
};
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
    <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
          <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">會費及各項款項</h1>
          <p class="mt-2 text-sm text-gray-600">管理您的專屬帳單，支援分次匯款與多張上傳。</p>
      </div>
      <router-link to="/" class="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 items-center w-full sm:w-auto shrink-0">
        回首頁
      </router-link>
    </div>

    <!-- Hidden File Input -->
    <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileUpload" />

    <div v-if="loading" class="flex justify-center my-12 text-gray-500">
        <svg class="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        載入帳單中...
    </div>
    
    <div v-else-if="bills.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
            <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-1">目前沒有未繳納的帳單</h3>
        <p class="text-sm text-gray-500">您所有的會費皆已結清或系統尚未派發任何新帳單。</p>
    </div>

    <div v-else class="space-y-6">
        <!-- Billing Card -->
        <div v-for="bill in bills" :key="bill.id" class="bg-white/70 backdrop-blur-lg rounded-xl shadow-lg ring-1 ring-black/5 overflow-hidden border-l-4" :class="[bill.status.status === 'pending' || bill.status.status === 'partial_paid' ? 'border-orange-500' : bill.status.status === 'approved' ? 'border-green-500' : 'border-indigo-500']">
            <div class="p-6 sm:p-8 md:flex md:items-start md:justify-between">
                <div class="mb-5 md:mb-0 md:flex-1 md:pr-6">
                    <div class="flex flex-wrap items-center gap-3 mb-2">
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-medium border" :class="{
                            'bg-orange-50 text-orange-700 border-orange-200': bill.status.status === 'pending',
                            'bg-amber-50 text-amber-700 border-amber-200': bill.status.status === 'partial_paid',
                            'bg-blue-50 text-blue-700 border-blue-200': bill.status.status === 'submitted',
                            'bg-green-50 text-green-700 border-green-200': bill.status.status === 'approved',
                            'bg-red-50 text-red-700 border-red-200': bill.status.status === 'rejected'
                        }">
                            {{ bill.status.status === 'pending' ? '🔴 待繳費' : bill.status.status === 'partial_paid' ? '🔵 部分繳納 (審核中)' : bill.status.status === 'submitted' ? '⏳ 已足額上傳 (待秘書核准)' : bill.status.status === 'approved' ? '✅ 繳費完成 (完全結清)' : '⚠️ 退回補件' }}
                        </span>
                    </div>
                    
                    <h3 class="text-xl font-bold text-gray-900">{{ bill.memberInfo.name }} 獅友，您好！</h3>
                    <p class="text-base text-gray-700 mt-2">您的職稱為 <span class="font-bold text-indigo-700 mx-1">[{{ bill.memberInfo.title }}]</span>，</p>
                    
                    <div v-if="bill.billing.breakdown && bill.billing.breakdown.length > 0" class="mt-4 mb-4 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                        <h4 class="text-sm font-semibold text-gray-600 mb-2 border-b border-gray-100 pb-2 flex justify-between">
                            <span>費用項目</span>
                            <span>金額明細</span>
                        </h4>
                        <ul class="space-y-1.5">
                            <li v-for="(item, idx) in bill.billing.breakdown" :key="idx" class="flex justify-between text-sm text-gray-600 font-medium">
                                <span>{{ item.item }}</span>
                                <span>NT$ {{ item.amount.toLocaleString() }}</span>
                            </li>
                        </ul>
                    </div>

                    <!-- 財務結算區塊 (非常明顯的設計) -->
                    <div class="mt-4 bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-inner">
                        <div class="flex flex-col sm:flex-row justify-between mb-4 pb-4 border-b border-gray-200">
                            <div>
                                <h4 class="text-sm text-gray-500 font-medium mb-1">應繳納總額</h4>
                                <div class="text-2xl font-extrabold text-gray-800">NT$ {{ bill.billing.expectedAmount.toLocaleString() }}</div>
                            </div>
                            <div class="mt-3 sm:mt-0 sm:text-right">
                                <h4 class="text-sm text-gray-500 font-medium mb-1">AI 累算已結清金額</h4>
                                <div class="text-2xl font-extrabold text-green-600">NT$ {{ (bill.payment?.totalPaidAmount || 0).toLocaleString() }}</div>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                          <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                               :class="{ 'bg-green-500': (bill.payment?.totalPaidAmount || 0) >= bill.billing.expectedAmount }"
                               :style="{ width: Math.min(((bill.payment?.totalPaidAmount || 0) / (bill.billing.expectedAmount || 1)) * 100, 100) + '%' }"></div>
                        </div>

                        <div class="flex justify-between text-sm font-bold">
                            <span class="text-orange-600" v-if="(bill.billing.expectedAmount - (bill.payment?.totalPaidAmount || 0)) > 0">
                                尚欠餘額：NT$ {{ (bill.billing.expectedAmount - (bill.payment?.totalPaidAmount || 0)).toLocaleString() }}
                            </span>
                            <span class="text-blue-600" v-else-if="bill.status.status !== 'approved'">
                                ⏳ 款項充足，等待官方核准入帳
                            </span>
                            <span class="text-emerald-600" v-else>
                                ✅ 款項已入帳 (完全結清)
                            </span>
                        </div>
                    </div>

                    <div v-if="bill.status.status === 'rejected'" class="mt-4 p-3 bg-red-50 text-red-700 text-sm font-medium border border-red-200 rounded-md">
                        <div class="font-bold mb-1">🚨 您的上筆憑證已被秘書退回，請確認金額與帳號後重新上傳。</div>
                        <div v-if="bill.payment?.rejectReason">退回原因：{{ bill.payment.rejectReason }}</div>
                    </div>

                    <p class="text-sm text-gray-500 mt-4 flex items-center">
                        <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        繳費期限：{{ formatDate(bill.billing.dueDate) }}
                    </p>
                </div>
                
                <div class="flex flex-col space-y-3 sm:min-w-[200px] mt-6 md:mt-0">
                    
                    <!-- Multiple Receipts Display -->
                    <div v-if="bill.payment?.receipts && bill.payment.receipts.length > 0" class="mb-2">
                        <p class="text-xs font-bold text-gray-500 mb-2">已上傳之憑證紀錄 ({{ bill.payment.receipts.length }}筆)</p>
                        <div class="grid grid-cols-2 gap-2">
                            <div v-for="(rcpt, i) in bill.payment.receipts" :key="i" class="relative group border border-gray-200 rounded-lg overflow-hidden h-20 bg-gray-50">
                                <img :src="rcpt.url" class="w-full h-full object-cover cursor-pointer" @click="openReceipt(rcpt.url)" />
                                <div class="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/65 py-0.5 pointer-events-none sm:inset-0 sm:py-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <span class="text-white text-[10px] font-medium leading-tight">+ NT$ {{ (rcpt.aiAmount || 0).toLocaleString() }}</span>
                                </div>
                                <button v-if="bill.status.status !== 'approved'" @click="removeReceipt(bill.id, i)" class="absolute top-1 right-1 w-5 h-5 bg-red-600/90 text-white rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition z-10" title="移除作廢此憑證">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    <!-- Legacy Fallback Display -->
                    <div v-else-if="bill.payment?.screenshotUrl" class="rounded-lg overflow-hidden border border-gray-200 h-24 w-full bg-gray-50 mb-2 relative group cursor-pointer" @click="openReceipt(bill.payment.screenshotUrl)">
                        <img :src="bill.payment.screenshotUrl" class="w-full h-full object-cover" />
                    </div>
                    
                    <button 
                        v-if="(bill.billing.expectedAmount - (bill.payment?.totalPaidAmount || 0)) > 0 && bill.status.status !== 'approved'"
                        @click="triggerUpload(bill.id)" 
                        :disabled="isUploading"
                        class="w-full inline-flex justify-center py-2.5 px-4 border border-transparent shadow-md text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                        {{ isUploading && activeBillId === bill.id ? '憑證傳輸中...' : '上傳憑證截圖 (補足餘額)' }}
                    </button>
                    
                    <div v-else-if="bill.status.status === 'submitted'" class="text-sm font-medium text-center text-blue-600 bg-blue-50 py-2 rounded-lg border border-blue-100 shadow-sm mt-auto">
                        ⏳ 待秘書手動核准入帳
                    </div>
                    <div v-else-if="bill.status.status === 'approved'" class="text-sm font-bold text-center text-green-700 bg-green-50 py-2 rounded-lg border border-green-200 shadow-sm mt-auto">
                        ✅ 繳費完成 (完全結清)
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
