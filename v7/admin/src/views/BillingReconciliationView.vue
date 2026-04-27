<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
// @ts-ignore
import DataTable from 'primevue/datatable';
// @ts-ignore
import Column from 'primevue/column';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { BillingCampaign, BillingRecord } from 'shared';

const route = useRoute();
const router = useRouter();
const campaignId = route.params.id as string;

const loading = ref(true);
const campaign = ref<BillingCampaign | null>(null);
const records = ref<(BillingRecord & { id: string })[]>([]);

// Toast Notification
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' });
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(message: string, type: 'success' | 'error' = 'success', durationMs = 3500) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.value = { show: true, message, type };
  toastTimer = setTimeout(() => { toast.value.show = false; }, durationMs);
}

// Edit Amount Dialog
const editDialog = ref({ show: false, recordId: '', breakdown: [] as {item: string, amount: number}[] });
// Reject Dialog
const rejectDialog = ref({ show: false, recordId: '', reason: '' });

const loadData = async () => {
    loading.value = true;
    try {
        const cSnap = await getDoc(doc(db, 'billing_campaigns', campaignId));
        if (cSnap.exists()) {
            campaign.value = cSnap.data() as BillingCampaign;
        } else {
            alert('找不到該批次！');
            router.push('/billing');
            return;
        }

        const q = query(collection(db, 'billing_records'), where('campaignId', '==', campaignId));
        const rSnap = await getDocs(q);
        records.value = rSnap.docs.map(d => ({ id: d.id, ...d.data() } as (BillingRecord & { id: string })));
    } catch (e) {
        console.error(e);
        showToast('載入資料失敗', 'error');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadData();
});

const openEditDialog = (record: BillingRecord & { id: string }) => {
    if (record.payment?.receipts?.length || record.status.status === 'approved') return; // Cannot edit if locked
    editDialog.value = { 
        show: true, 
        recordId: record.id, 
        breakdown: record.billing.breakdown ? JSON.parse(JSON.stringify(record.billing.breakdown)) : [{ item: '應繳款項', amount: record.billing.expectedAmount }]
    };
};

const addBreakdownItem = () => {
    editDialog.value.breakdown.push({ item: '', amount: 0 });
};

const removeBreakdownItem = (idx: number) => {
    editDialog.value.breakdown.splice(idx, 1);
};

const confirmEdit = async () => {
    const { recordId, breakdown } = editDialog.value;
    if (!recordId) return;

    // Filter out valid items and calc total
    const validBreakdown = breakdown.map(b => ({ item: b.item.trim(), amount: Number(b.amount) || 0 }))
                                    .filter(b => b.item && b.amount > 0);
    const newExpectedAmount = validBreakdown.reduce((sum, b) => sum + b.amount, 0);

    const record = records.value.find(r => r.id === recordId);
    if (!record) return;

    const totalPaid = record.payment?.totalPaidAmount || 0;
    let newStatus = record.status.status;
    
    // Recalculate status if it's not approved or rejected
    if (newStatus !== 'approved' && newStatus !== 'rejected') {
        if (totalPaid >= newExpectedAmount && newExpectedAmount > 0) {
            newStatus = 'submitted';
        } else if (totalPaid > 0) {
            newStatus = 'partial_paid';
        } else {
            newStatus = 'pending';
        }
    }

    loading.value = true;
    try {
        await updateDoc(doc(db, 'billing_records', recordId), {
            'billing.breakdown': validBreakdown,
            'billing.expectedAmount': newExpectedAmount,
            'status.status': newStatus
        });
        const idx = records.value.findIndex(r => r.id === recordId);
        if (idx !== -1) {
            records.value[idx].billing.breakdown = validBreakdown;
            records.value[idx].billing.expectedAmount = newExpectedAmount;
            records.value[idx].status.status = newStatus;
        }
        showToast('成功修改明細與應繳金額！');
        editDialog.value.show = false;
    } catch (e) {
        console.error(e);
        showToast('修改失敗', 'error');
    } finally {
        loading.value = false;
    }
};

const openRejectDialog = (recordId: string) => {
    rejectDialog.value = { show: true, recordId, reason: '' };
};

const confirmReject = async () => {
    const { recordId, reason } = rejectDialog.value;
    if (!recordId || !reason.trim()) return;
    loading.value = true;
    try {
        await updateDoc(doc(db, 'billing_records', recordId), {
            'status.status': 'rejected',
            'payment.rejectReason': reason.trim(),
            'payment.receipts': [],
            'payment.totalPaidAmount': 0
        });
        const idx = records.value.findIndex(r => r.id === recordId);
        if (idx !== -1) {
            records.value[idx].status.status = 'rejected';
            if (!records.value[idx].payment) records.value[idx].payment = {};
            records.value[idx].payment!.rejectReason = reason.trim();
            records.value[idx].payment!.receipts = [];
            records.value[idx].payment!.totalPaidAmount = 0;
        }
        rejectDialog.value.show = false;
        showToast('已退回憑證並記錄原因。');
    } catch(e) {
         showToast('退回失敗', 'error');
    } finally {
        loading.value = false;
    }
};

const approvePayment = async (recordId: string) => {
    if (!confirm('確認核准此會員的所有帳單款項無誤？')) return;
    loading.value = true;
    try {
        await updateDoc(doc(db, 'billing_records', recordId), {
            'status.status': 'approved'
        });
        const idx = records.value.findIndex(r => r.id === recordId);
        if (idx !== -1) records.value[idx].status.status = 'approved';
        showToast('✅ 成功核准！');
    } catch(e) {
        showToast('核准失敗', 'error');
    } finally {
        loading.value = false;
    }
};

const batchApprove = async () => {
    const targets = records.value.filter(r => 
        r.status.status === 'submitted' &&
        (r.payment?.totalPaidAmount || 0) >= r.billing.expectedAmount
    );
    if (targets.length === 0) return;
    if (!confirm(`系統內偵測到 ${targets.length} 筆已繳足額的帳款等待審核，確定要一鍵批次「核准通過」嗎？`)) return;
    
    loading.value = true;
    try {
        for (const t of targets) {
            await updateDoc(doc(db, 'billing_records', t.id), { 'status.status': 'approved' });
            const idx = records.value.findIndex(r => r.id === t.id);
            if (idx !== -1) records.value[idx].status.status = 'approved';
        }
        showToast(`✅ 批次核准成功！共核准 ${targets.length} 筆。`);
    } catch (e: any) {
        showToast('批次操作發生錯誤', 'error');
    } finally {
        loading.value = false;
    }
};

const hasApprovable = computed(() => {
    return records.value.some(r => 
        r.status.status === 'submitted' &&
        (r.payment?.totalPaidAmount || 0) >= r.billing.expectedAmount
    );
});

const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending': return 'bg-gray-100 text-gray-600';
        case 'partial_paid': return 'bg-amber-100 text-amber-700';
        case 'submitted': return 'bg-blue-100 text-blue-700';
        case 'approved': return 'bg-green-100 text-green-700';
        case 'rejected': return 'bg-red-100 text-red-700';
        case 'overdue': return 'bg-purple-100 text-purple-700';
        default: return 'bg-gray-100 text-gray-600';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'pending': return '待繳納';
        case 'partial_paid': return '部分繳納中';
        case 'submitted': return '審核中(足額)';
        case 'approved': return '已核准';
        case 'rejected': return '已退回';
        case 'overdue': return '已逾期';
        default: return status;
    }
};

const viewImage = (url: string) => {
    window.open(url, '_blank');
};

const escapeCsv = (str: any) => str == null ? '""' : '"' + String(str).replace(/"/g, '""') + '"';

const exportBillingCsv = () => {
    let csvContent = '\uFEFF姓名,職稱,應繳總額,已繳金額,對帳狀態,回報摘要\n';
    records.value.forEach(r => {
        const name = r.memberInfo?.name || '';
        const title = r.memberInfo?.title || '';
        const expected = r.billing.expectedAmount || 0;
        const paid = r.payment?.totalPaidAmount || 0;
        
        let status = '待繳納';
        if (r.status.status === 'approved') status = '已核准';
        else if (r.status.status === 'submitted') status = '審核中';
        else if (r.status.status === 'partial_paid') status = '部分繳費';
        else if (r.status.status === 'rejected') status = '已退回';
        else if (r.status.status === 'overdue') status = '已逾期';

        const receiptsStr = (r.payment?.receipts || []).map(rect => {
            const amt = rect.aiAmount || 0;
            const cf = rect.aiConfidence === 'high' ? '高' : (rect.aiConfidence === 'low' ? '低' : (rect.aiConfidence === 'error' ? '誤' : '-'));
            return `NT$${amt} (AI:${cf})`;
        }).join(' | ');
        
        csvContent += `${escapeCsv(name)},${escapeCsv(title)},${expected},${paid},${escapeCsv(status)},${escapeCsv(receiptsStr)}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const cName = campaign.value?.name || '批次帳單';
    link.setAttribute("download", `${cName}_對帳報表.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full min-h-[500px]">

    <!-- Toast Notification -->
    <transition name="toast">
      <div v-if="toast.show" class="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white font-semibold text-sm max-w-sm" :class="toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'">
        <svg v-if="toast.type === 'success'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <svg v-else class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        {{ toast.message }}
      </div>
    </transition>

    <!-- Reject Modal -->
    <div v-if="rejectDialog.show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <h3 class="text-lg font-bold text-gray-800 mb-2">退回憑證</h3>
        <p class="text-sm text-gray-500 mb-4">輸入退回原因，通知會員並開放重新上傳。</p>
        <textarea v-model="rejectDialog.reason" rows="3" class="w-full rounded-lg border-gray-300 p-3 text-sm focus:border-red-400 focus:ring-red-400 resize-none"></textarea>
        <div class="flex justify-end gap-3 mt-5">
          <button @click="rejectDialog.show = false" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">取消</button>
          <button @click="confirmReject" :disabled="!rejectDialog.reason.trim() || loading" class="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg shadow transition">🔙 確認退回</button>
        </div>
      </div>
    </div>

    <!-- Edit Amount Modal -->
    <div v-if="editDialog.show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4">
        <h3 class="text-lg font-bold text-gray-800 mb-2">修正費用明細</h3>
        <p class="text-sm text-gray-500 mb-4">您可以逐項增減此會員的費用明細，系統將自動重算總額。僅能在未繳費狀態下修改。</p>
        
        <div class="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
            <div v-for="(b, idx) in editDialog.breakdown" :key="idx" class="flex gap-2 items-center">
                <input type="text" v-model="b.item" placeholder="項目名稱" class="flex-1 rounded-lg border-gray-300 p-2 text-sm focus:border-indigo-400 focus:ring-indigo-400" />
                <input type="number" v-model="b.amount" placeholder="金額" class="w-32 rounded-lg border-gray-300 p-2 text-sm focus:border-indigo-400 focus:ring-indigo-400" />
                <button @click="removeBreakdownItem(idx)" class="text-red-500 hover:text-red-700 px-2 text-xl font-bold" title="移除項目">&times;</button>
            </div>
            <button @click="addBreakdownItem" class="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center mt-2 px-1">
                + 新增費用項目
            </button>
        </div>

        <div class="flex justify-between items-center border-t pt-4">
          <div class="text-gray-700 font-bold">新計算總額: <span class="text-xl text-indigo-700 ml-1">NT$ {{ editDialog.breakdown.reduce((sum, b) => sum + (Number(b.amount) || 0), 0).toLocaleString() }}</span></div>
        </div>

        <div class="flex justify-end gap-3 mt-5">
          <button @click="editDialog.show = false" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">取消</button>
          <button @click="confirmEdit" :disabled="loading" class="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow transition">💾 儲存修改</button>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6 pb-4 border-b">
      <div class="min-w-0">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button @click="router.push('/billing')" class="p-1 px-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded w-fit">← 返回清單</button>
          <h2 class="text-2xl font-bold text-gray-800 break-words">{{ campaign?.name || '對帳明細' }}</h2>
        </div>
        <p class="text-sm text-gray-500 mt-2">{{ campaign?.details.description || '動態費用明細對帳' }}</p>
      </div>
      <div class="w-full lg:w-auto shrink-0">
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
          <button 
            v-if="records.length > 0"
            @click="exportBillingCsv" 
            class="px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 text-sm shadow flex items-center justify-center gap-1 w-full sm:w-auto"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            匯出 CSV
          </button>
          <button 
          @click="batchApprove" 
          :disabled="!hasApprovable"
          class="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50 text-sm shadow flex items-center justify-center gap-1 w-full sm:w-auto"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          一鍵批次核准足額紀錄
        </button>
        </div>
      </div>
    </div>
    
    <div class="flex-1 min-w-0 overflow-x-auto">
        <DataTable :value="records" paginator :rows="15" :loading="loading" dataKey="id" class="p-datatable-sm w-full min-w-[720px]">
            <template #empty>此批次目前沒有任何會員帳單。</template>
            <template #loading>載入資料中...</template>
            
            <Column field="memberInfo.name" header="會員資訊" style="min-width: 12rem">
                <template #body="{ data }">
                    <div class="font-bold text-gray-800 text-base">{{ data.memberInfo.name }}</div>
                    <div class="text-xs text-gray-500">{{ data.memberInfo.title }}</div>
                </template>
            </Column>
            
            <Column header="帳單款項進度" style="min-width: 14rem">
                <template #body="{ data }">
                    <div class="flex items-center justify-between text-sm mb-1">
                        <span class="text-gray-500">應繳總額:</span>
                        <div class="flex items-center gap-1">
                          <span class="font-bold text-gray-800">NT$ {{ data.billing.expectedAmount.toLocaleString() }}</span>
                          <button 
                            @click="openEditDialog(data)" 
                            v-if="!data.payment?.receipts?.length && data.status.status !== 'approved'"
                            class="text-indigo-500 hover:text-indigo-700" title="修改金額"
                          >✎</button>
                          <span v-else class="text-gray-300 text-xs" title="已鎖定">🔒</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-500">已累計付款:</span>
                        <span class="font-bold text-indigo-600">NT$ {{ (data.payment?.totalPaidAmount || 0).toLocaleString() }}</span>
                    </div>
                    <!-- Progress Bar -->
                    <div class="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div class="h-1.5 rounded-full" 
                           :class="((data.payment?.totalPaidAmount || 0) >= data.billing.expectedAmount && data.billing.expectedAmount > 0) ? 'bg-green-500' : 'bg-indigo-500'" 
                           :style="{ width: Math.min(((data.payment?.totalPaidAmount || 0) / (data.billing.expectedAmount || 1)) * 100, 100) + '%' }"></div>
                    </div>
                </template>
            </Column>
            
            <Column header="狀態" style="width: 8rem">
                <template #body="{ data }">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold" :class="getStatusColor(data.status.status)">
                        {{ getStatusLabel(data.status.status) }}
                    </span>
                    <!-- AI Confidence Indicator -->
                    <div v-if="data.payment?.receipts?.length" class="mt-1">
                        <span v-if="data.payment.receipts.some((r: any) => r.aiConfidence === 'error')" class="text-[10px] text-red-600 font-bold">🔴 辨識異常</span>
                        <span v-else-if="data.payment.receipts.some((r: any) => r.aiConfidence === 'low')" class="text-[10px] text-amber-600 font-bold">🟡 模糊影像</span>
                    </div>
                </template>
            </Column>

            <Column header="上傳憑證群 (點擊檢視)" style="min-width: 14rem">
                <template #body="{ data }">
                    <div v-if="data.payment?.receipts && data.payment.receipts.length > 0" class="flex flex-wrap gap-2">
                        <div v-for="(rcpt, i) in data.payment.receipts" :key="i" class="relative group cursor-pointer w-10 h-10 border border-gray-200 rounded overflow-hidden" @click="viewImage(rcpt.url)">
                            <img :src="rcpt.url" class="w-full h-full object-cover">
                            <div class="absolute inset-0 flex items-center justify-center bg-black/45 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <span class="text-[10px] text-white">🔍</span>
                            </div>
                        </div>
                    </div>
                    <div v-else-if="data.payment?.screenshotUrl" class="relative group cursor-pointer w-10 h-10 border border-gray-200 rounded overflow-hidden" @click="viewImage(data.payment.screenshotUrl)">
                        <img :src="data.payment.screenshotUrl" class="w-full h-full object-cover">
                        <div class="absolute inset-0 flex items-center justify-center bg-black/45 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <span class="text-[10px] text-white">🔍</span>
                        </div>
                    </div>
                    <span v-else class="text-xs text-gray-400">—</span>
                </template>
            </Column>
            
            <Column header="操作管理" style="min-width: 12rem">
                <template #body="{ data }">
                    <div class="flex gap-2">
                        <button 
                            @click="approvePayment(data.id)" 
                            :disabled="data.status.status === 'approved' || data.status.status === 'pending'"
                            class="px-3 py-1.5 text-xs font-bold rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition shadow-sm"
                        >核准通過</button>
                        <button 
                            @click="openRejectDialog(data.id)" 
                            :disabled="data.status.status === 'pending'"
                            class="px-3 py-1.5 text-xs font-bold rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition shadow-sm"
                        >重置/退回</button>
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.35s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(30px); }
</style>
