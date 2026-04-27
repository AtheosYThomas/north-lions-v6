<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full min-h-[500px]">

    <!-- ✅ [新增] Toast 成功 / 錯誤提示栏 -->
    <transition name="toast">
      <div
        v-if="toast.show"
        class="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white font-semibold text-sm max-w-sm"
        :class="toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
      >
        <svg v-if="toast.type === 'success'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <svg v-else class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        {{ toast.message }}
      </div>
    </transition>

    <!-- ✅ [新增] 退回原因輸入 Modal -->
    <div v-if="rejectDialog.show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <h3 class="text-lg font-bold text-gray-800 mb-2">退回單據</h3>
        <p class="text-sm text-gray-500 mb-4">請輸入退回原因，會顯示於會員前台畫面中。</p>
        <textarea
          v-model="rejectDialog.reason"
          rows="3"
          placeholder="例：金額與應繳不符，請重新匯款 NT$1500 後再上傳憑證。"
          class="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-red-400 focus:ring-red-400 resize-none"
        ></textarea>
        <div class="flex justify-end gap-3 mt-5">
          <button @click="rejectDialog.show = false" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">取消</button>
          <button
            @click="confirmReject"
            :disabled="!rejectDialog.reason.trim() || loading"
            class="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg shadow transition"
          >🔙 確認退回</button>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6 pb-4 border-b">
      <div class="min-w-0">
        <h2 class="text-2xl font-bold text-gray-800">財務對帳系統</h2>
        <p class="text-sm text-gray-500 mt-1">選取付費活動進行人工對帳審核</p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center w-full lg:w-auto shrink-0">
        <button 
          v-if="selectedEventId && registrations.length > 0"
          @click="exportReconciliationCsv" 
          class="px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 text-sm shadow flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          匯出 CSV
        </button>
        <button 
          v-if="selectedEventId"
          @click="batchApprove" 
          :disabled="!hasApprovable"
          class="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50 text-sm shadow flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          一鍵批次核准綠燈
        </button>
        <Dropdown 
          v-model="selectedEventId" 
          :options="paidEvents" 
          optionLabel="name" 
          optionValue="id" 
          placeholder="切換付費活動..." 
          class="w-full sm:w-64 min-w-0"
          @change="loadRegistrations"
        />
      </div>
    </div>
    
    <div v-if="!selectedEventId" class="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
        <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        <p class="font-medium text-lg">請選擇右上方的活動以開始對帳</p>
    </div>
    
    <div v-else class="flex-1 min-w-0 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
        <DataTable :value="registrations" paginator :rows="10" :loading="loading" dataKey="id" class="p-datatable-sm min-w-[720px]">
            <template #empty>目前尚無任何報名紀錄。</template>
            <template #loading>載入報名紀錄中...</template>
            
            <Column field="memberName" header="會員姓名" style="min-width: 12rem">
                <template #body="{ data }">
                    <span class="font-bold text-gray-800">{{ getMemberName(data.info.memberId) }}</span>
                </template>
            </Column>
            
            <Column header="報名人數及總額">
                <template #body="{ data }">
                    <div class="text-sm">
                        {{ data.details.adultCount }} 大 {{ data.details.childCount }} 小
                    </div>
                    <div class="font-bold text-indigo-700">
                        NT$ {{ (currentEventCost * data.details.adultCount).toLocaleString() }}
                    </div>
                </template>
            </Column>
            
            <Column header="對帳狀態">
                <template #body="{ data }">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset"
                          :class="{
                              'bg-green-100 text-green-800 ring-green-600/20': data.status.paymentStatus === '已繳費',
                              'bg-yellow-100 text-yellow-800 ring-yellow-600/20': data.status.paymentStatus === '審核中',
                              'bg-red-100 text-red-800 ring-red-600/20': !['已繳費','審核中'].includes(data.status.paymentStatus)
                          }">
                        {{ data.status.paymentStatus }}
                    </span>
                </template>
            </Column>

            <!-- ✅ [新增] AI 對帳燈號視覺標籤 -->
            <Column header="AI 對帳燈號" style="min-width: 10rem">
                <template #body="{ data }">
                    <span v-if="!data.payment?.aiConfidence || data.payment.aiConfidence === 'pending'"
                          class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-400">⏳ 辨識中</span>
                    <span v-else-if="data.payment.aiConfidence === 'error'"
                          class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">🔴 解析異常</span>
                    <span v-else-if="!isAmountMatched(data)"
                          class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">🔴 金額不符 (應繳 {{ currentEventCost * data.details.adultCount }})</span>
                    <span v-else-if="data.payment.aiConfidence === 'low'"
                          class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700">🟡 模糊需人工複核</span>
                    <span v-else
                          class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">🟢 金額與帳號吸合</span>
                </template>
            </Column>
            
            <Column header="回報方式" style="min-width: 9rem">
                <template #body="{ data }">
                    <span v-if="data.payment?.reportMethod === 'web_image'"   class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">🟦 網頁截圖</span>
                    <span v-else-if="data.payment?.reportMethod === 'web_manual'" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">🟧 手動填寫</span>
                    <span v-else-if="data.payment?.reportMethod === 'line_image'"  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">🟩 LINE·AI</span>
                    <span v-else class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-500">⬜ 舊資料</span>
                </template>
            </Column>

            <Column header="憑證 / 填寫資料" style="min-width: 14rem">
                <template #body="{ data }">
                    <!-- 截圖上傳（web_image / line_image） -->
                    <div v-if="data.payment?.screenshotUrl">
                        <a :href="data.payment.screenshotUrl" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium flex items-center mb-2">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            檢視截圖
                        </a>
                        <!-- AI 解析結果 -->
                        <div v-if="data.payment?.accountLast5 !== undefined" class="text-xs space-y-0.5">
                            <div class="flex gap-1"><span class="text-gray-400">末五碼:</span><span class="font-mono font-bold text-gray-700">{{ data.payment.accountLast5 || '—' }}</span></div>
                            <div class="flex gap-1"><span class="text-gray-400">金額:</span><span class="font-bold text-indigo-700">{{ data.payment.amount ? `NT$ ${data.payment.amount.toLocaleString()}` : '—' }}</span></div>
                            <div v-if="data.payment.transferDate" class="flex gap-1"><span class="text-gray-400">日期:</span><span class="text-gray-700">{{ data.payment.transferDate }}</span></div>
                        </div>
                    </div>
                    <!-- 手動填寫（web_manual） -->
                    <div v-else-if="data.payment?.reportMethod === 'web_manual'" class="text-xs space-y-0.5">
                        <div class="flex gap-1"><span class="text-gray-400">日期:</span><span class="font-medium text-gray-700">{{ data.payment.reportedDate || '—' }}</span></div>
                        <div class="flex gap-1"><span class="text-gray-400">末五碼:</span><span class="font-mono font-bold text-gray-700">{{ data.payment.reportedLast5 || '—' }}</span></div>
                        <div class="flex gap-1"><span class="text-gray-400">金額:</span><span class="font-bold text-indigo-700">{{ data.payment.reportedAmount ? `NT$ ${data.payment.reportedAmount.toLocaleString()}` : '—' }}</span></div>
                        <div v-if="data.payment.memo" class="text-gray-500 italic">{{ data.payment.memo }}</div>
                    </div>
                    <span v-else class="text-gray-400 text-sm">—</span>
                </template>
            </Column>
            
            <Column header="財務人工審核" style="min-width: 14rem">
                <template #body="{ data }">
                    <div class="flex gap-2">
                        <button 
                            @click="approvePayment(data.id)" 
                            :disabled="data.status.paymentStatus === '已繳費'"
                            class="px-3 py-1.5 text-xs font-bold rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition shadow-sm"
                        >核准通過</button>
                        <!-- ✅ [修補] 退回按鈕改为開啟 Modal，允許輸入退回原因 -->
                        <button 
                            @click="openRejectDialog(data.id)" 
                            :disabled="!(['審核中','已繳費'].includes(data.status.paymentStatus))"
                            class="px-3 py-1.5 text-xs font-bold rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition shadow-sm"
                        >退回重置</button>
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
// @ts-ignore
import DataTable from 'primevue/datatable';
// @ts-ignore
import Column from 'primevue/column';
// @ts-ignore
import Dropdown from 'primevue/dropdown';
import { useEventsStore } from '../stores/events';
import { useRegistrationsStore } from '../stores/registrations';
import { useMembersStore } from '../stores/members';
// @ts-ignore
import type { Registration } from 'shared';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const eventsStore = useEventsStore();
const regStore = useRegistrationsStore();
const membersStore = useMembersStore();

const selectedEventId = ref<string | null>(null);
const loading = ref(false);

// ✅ [新增] Toast 通知系統
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' });
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string, type: 'success' | 'error' = 'success', durationMs = 3500) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.value = { show: true, message, type };
  toastTimer = setTimeout(() => { toast.value.show = false; }, durationMs);
}

// ✅ [新增] 退回原因 Modal 狀態
const rejectDialog = ref({ show: false, regId: '', reason: '' });

function openRejectDialog(regId: string) {
  rejectDialog.value = { show: true, regId, reason: '' };
}

async function confirmReject() {
  const { regId, reason } = rejectDialog.value;
  if (!regId || !reason.trim()) return;
  loading.value = true;
  try {
    await updateDoc(doc(db, 'registrations', regId), {
      'status.status': '已報名',
      'status.paymentStatus': '未繳費',
      'payment.screenshotUrl': null,
      'payment.rejectReason': reason.trim(),   // ← 寫入退回原因，前台可讀取
    });
    const idx = regStore.registrations.findIndex(r => r.id === regId);
    if (idx !== -1) {
      regStore.registrations[idx].status.status = '已報名';
      regStore.registrations[idx].status.paymentStatus = '未繳費';
      if (regStore.registrations[idx].payment) {
        regStore.registrations[idx].payment!.screenshotUrl = undefined;
      }
    }
    rejectDialog.value.show = false;
    showToast('已退回憑證，退回原因已通知會員。', 'success');
  } catch (e: any) {
    showToast('退回操作失敗：' + e.message, 'error');
  } finally {
    loading.value = false;
  }
}

const paidEvents = computed(() => {
    return eventsStore.events.filter(e => e.details.isPaidEvent);
});

const currentEventCost = computed(() => {
    if (!selectedEventId.value) return 0;
    const evt = eventsStore.events.find(e => e.id === selectedEventId.value);
    return evt?.details?.cost || 0;
});

const registrations = computed(() => {
    return regStore.registrations.filter(r => r.status.status !== '已取消');
});

const getMemberName = (id: string) => {
    const m = membersStore.members.find(m => m.id === id || m.contact?.lineUserId === id);
    return m?.name || '未知獅友';
};

const loadRegistrations = async () => {
    if (!selectedEventId.value) return;
    loading.value = true;
    try {
        await regStore.fetchRegistrationsByEvent(selectedEventId.value);
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const approvePayment = async (regId: string) => {
    if (!confirm('確認核准此筆款項？')) return;
    loading.value = true;
    try {
        await updateDoc(doc(db, 'registrations', regId), {
            'status.paymentStatus': '已繳費'
        });
        const idx = regStore.registrations.findIndex(r => r.id === regId);
        if (idx !== -1) regStore.registrations[idx].status.paymentStatus = '已繳費';
        showToast('✅ 已核准！', 'success');
    } catch (e: any) {
        showToast('操作失敗：' + e.message, 'error');
    } finally {
        loading.value = false;
    }
};

const isAmountMatched = (regData: any) => {
    const expected = currentEventCost.value * (regData.details?.adultCount || 1);
    if (regData.payment?.amount) return regData.payment.amount === expected;
    if (regData.payment?.reportedAmount) return regData.payment.reportedAmount === expected;
    return false;
};

const hasApprovable = computed(() => {
    return registrations.value.some(r => 
        r.status.paymentStatus === '審核中' && 
        isAmountMatched(r) && 
        (r.payment?.aiConfidence === 'high' || r.payment?.reportMethod === 'web_manual')
    );
});

const batchApprove = async () => {
    const targets = registrations.value.filter(r => 
        r.status.paymentStatus === '審核中' && 
        isAmountMatched(r) && 
        (r.payment?.aiConfidence === 'high' || r.payment?.reportMethod === 'web_manual')
    );
    if (targets.length === 0) return;
    if (!confirm(`系統倵測到 ${targets.length} 筆綠燈比對無誤的單據，確定要一鍵批次「核准通過」嗎？`)) return;
    
    loading.value = true;
    try {
        for (const t of targets) {
            await updateDoc(doc(db, 'registrations', t.id!), { 'status.paymentStatus': '已繳費' });
            const idx = regStore.registrations.findIndex(r => r.id === t.id);
            if (idx !== -1) regStore.registrations[idx].status.paymentStatus = '已繳費';
        }
        showToast(`✅ 批次核准成功！共 ${targets.length} 筆項目已處理。`, 'success');
    } catch (e: any) {
        showToast('批次操作發生錯誤：' + e.message, 'error');
    } finally {
        loading.value = false;
    }
};

const exportReconciliationCsv = () => {
    let csvContent = '\uFEFF會員姓名,大(人數),小(人數),應繳總額,對帳狀態,AI對帳燈號,回報方式,末五碼(截圖/填寫),匯款金額(截圖/填寫),轉帳日期\n';
    registrations.value.forEach(r => {
        const name = getMemberName(r.info.memberId) || '';
        const adultCount = r.details?.adultCount || 0;
        const childCount = r.details?.childCount || 0;
        const expected = currentEventCost.value * adultCount;
        const status = r.status.paymentStatus || '';
        
        let aiLight = '辨識中';
        if (r.payment?.aiConfidence === 'error') aiLight = '解析異常';
        else if (!isAmountMatched(r)) aiLight = '金額不符';
        else if (r.payment?.aiConfidence === 'low') aiLight = '模糊需人工複核';
        else if (r.payment?.aiConfidence === 'high') aiLight = '金額與帳號吸合';

        let method = '舊資料';
        if (r.payment?.reportMethod === 'web_image') method = '網頁截圖';
        else if (r.payment?.reportMethod === 'web_manual') method = '手動填寫';
        else if (r.payment?.reportMethod === 'line_image') method = 'LINE·AI';

        const last5 = r.payment?.accountLast5 || r.payment?.reportedLast5 || '—';
        const amount = r.payment?.amount || r.payment?.reportedAmount || '—';
        const date = (r.payment as any)?.transferDate || r.payment?.reportedDate || '—';
        
        csvContent += `"${name}","${adultCount}","${childCount}","${expected}","${status}","${aiLight}","${method}","${last5}","${amount}","${date}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const eventName = eventsStore.events.find(e => e.id === selectedEventId.value)?.name || '活動對帳';
    link.setAttribute("download", `${eventName}_對帳報表.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

onMounted(async () => {
    await eventsStore.fetchEvents();
    if (membersStore.members.length === 0) {
        await membersStore.fetchMembers();
    }
});
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.35s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(30px); }
</style>
