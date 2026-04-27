<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { collection, addDoc, writeBatch, doc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { BillingCampaign, BillingRecord } from 'shared';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

// @ts-ignore
import DataTable from 'primevue/datatable';
// @ts-ignore
import Column from 'primevue/column';

const router = useRouter();
const authStore = useAuthStore();
const fileInput = ref<HTMLInputElement | null>(null);
const csvData = ref<any[]>([]);
const campaignName = ref('');
const description = ref('');
const dueDate = ref('');
const isUploading = ref(false);
const uploadSuccess = ref(false);

const isCreateMode = ref(false);
const campaigns = ref<(BillingCampaign & { id: string })[]>([]);
const isFetching = ref(false);

const checkCampaigns = async () => {
    isFetching.value = true;
    try {
        const snap = await getDocs(collection(db, 'billing_campaigns'));
        campaigns.value = snap.docs.map(d => ({ id: d.id, ...d.data() as any } as BillingCampaign & { id: string }))
                                   .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (e) {
        console.error(e);
    } finally {
        isFetching.value = false;
    }
};

onMounted(() => {
    checkCampaigns();
});

const deleteCampaign = async (campaignId: string) => {
    if (!confirm('!!! 危險操作 !!!\n這將會刪除整個批次帳單，且所有會員有關的對帳紀錄皆被清空，確定刪除？')) return;
    
    try {
        // Cascade delete billing_records
        const q = query(collection(db, 'billing_records'), where('campaignId', '==', campaignId));
        const snap = await getDocs(q);
        
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
            batch.delete(d.ref);
        });
        await batch.commit();

        // Delete campaign
        await deleteDoc(doc(db, 'billing_campaigns', campaignId));
        
        campaigns.value = campaigns.value.filter(c => c.id !== campaignId);
        alert('刪除成功');
    } catch (e) {
        console.error(e);
        alert('刪除失敗，請查看主控台');
    }
};

const togglePublish = async (campaignId: string, currentStatus: boolean | undefined) => {
    const newVal = !currentStatus;
    if (!confirm(newVal ? '確定發布？發布後，會員即可於前台看見此批次帳單，系統也可開始對帳作業。' : '確定取消發布？收回後，前台會員將不再看見此帳單。')) return;
    
    try {
        await updateDoc(doc(db, 'billing_campaigns', campaignId), {
            isPublished: newVal
        });
        const idx = campaigns.value.findIndex(c => c.id === campaignId);
        if (idx !== -1) campaigns.value[idx].isPublished = newVal;
    } catch(e) {
        console.error(e);
        alert('切換狀態失敗');
    }
};

const goToReconciliation = (campaignId: string) => {
    router.push(`/billing/${campaignId}/reconciliation`);
};

const formatDate = (dateObj: any) => {
    if (!dateObj || !dateObj.seconds) return '—';
    return new Date(dateObj.seconds * 1000).toLocaleDateString('zh-TW');
};

const loadXlsx = async (): Promise<any> => {
  return new Promise((resolve) => {
    if ((window as any).XLSX) return resolve((window as any).XLSX);
    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-0.19.3/package/dist/xlsx.full.min.js";
    script.onload = () => resolve((window as any).XLSX);
    document.head.appendChild(script);
  });
};

const parseCSVLine = (line: string) => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i+1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (file.name.toLowerCase().endsWith('.csv')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        alert('CSV 格式錯誤，長度過短');
        return;
      }
      let headerLine = lines[0].trim();
      if (headerLine.charCodeAt(0) === 0xFEFF) {
        headerLine = headerLine.slice(1);
      }
      const headers = parseCSVLine(headerLine).map(h => h.trim());
      
      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i].trim());
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = vals[idx]?.trim() || '';
        });
        parsed.push(row);
      }
      csvData.value = parsed;
      if (!campaignName.value) {
        campaignName.value = file.name.replace(/\.csv$/i, '') + ' - 批次帳單';
      }
    };
    reader.readAsText(file);
  } else if (file.name.toLowerCase().endsWith('.xlsx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      
      if (rows.length < 2) {
        alert('Excel 格式錯誤，長度過短');
        return;
      }
      const headers = (rows[0] as any[]).map(h => (h || '').toString().trim());
      const parsed = [];
      for (let i = 1; i < rows.length; i++) {
        const rowData = rows[i] as any[];
        if (!rowData || rowData.length === 0) continue;
        
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = rowData[idx]?.toString().trim() || '';
        });
        parsed.push(row);
      }
      csvData.value = parsed;
      if (!campaignName.value) {
        campaignName.value = file.name.replace(/\.xlsx$/i, '') + ' - 批次帳單';
      }
    } catch (err) {
      console.error("XLSX parsing error:", err);
      alert("Excel 解析失敗，請確認檔案格式");
    }
  } else {
    alert("不支援的檔案格式，請上傳 CSV 或 XLSX");
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const submitCampaign = async () => {
  if (!campaignName.value || csvData.value.length === 0) {
    alert('請填寫批次名稱並上傳名冊。');
    return;
  }
  isUploading.value = true;
  uploadSuccess.value = false;

  try {
    const membersSnap = await getDocs(collection(db, 'members'));
    const membersList = membersSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    const findMemberId = (name: string, lineId: string, mobile: string) => {
      let match = membersList.find(m => lineId && m.contact?.lineUserId === lineId);
      if (!match) match = membersList.find(m => mobile && m.contact?.mobile === mobile);
      if (!match) match = membersList.find(m => name && m.name === name);
      return match ? match.id : '';
    };

    const campaignRef = await addDoc(collection(db, 'billing_campaigns'), {
      name: campaignName.value,
      createdAt: new Date(),
      createdBy: authStore.user?.uid || 'admin',
      status: 'active',
      isPublished: true, // Auto publish by default on creation for simplicity, or we can set it to false
      details: {
        description: description.value,
        dueDate: dueDate.value ? new Date(dueDate.value) : null
      }
    } as BillingCampaign);

    const batch = writeBatch(db);
    csvData.value.forEach((row) => {
      const recordRef = doc(collection(db, 'billing_records'));
      
      const rName = row['會員姓名'] || row['姓名'] || row['中文名字'] || '未知';
      const rLineId = row['LineID'] || row['lineUserId'] || '';
      const rMobile = row['Phone'] || row['手機'] || '';
      const rTitle = row['職稱'] || '一般會員';
      const parsedAmountStr = row['應繳總額'] || row['總額'] || row['合計'] || '0';
      const parsedAmount = parseInt(parsedAmountStr.toString().replace(/,/g, ''), 10);

      const standardHeaders = ['會員姓名', '姓名', '中文名字', 'LineID', 'lineUserId', 'Phone', '手機', '職稱', '應繳總額', '總額', '合計', 'NO.', '已繳費', '實收金額'];
      const breakdownItems: { item: string, amount: number }[] = [];
      Object.keys(row).forEach(k => {
        if (!standardHeaders.includes(k) && row[k]) {
          const amt = parseInt((row[k] || '0').toString().replace(/,/g, ''), 10);
          if (!isNaN(amt) && amt > 0) {
            breakdownItems.push({ item: k, amount: amt });
          }
        }
      });

      const mappedMemberId = findMemberId(rName, rLineId, rMobile);

      const record: BillingRecord = {
        campaignId: campaignRef.id,
        memberId: mappedMemberId,
        memberInfo: {
          name: rName,
          title: rTitle,
          mobile: rMobile,
          lineUserId: rLineId
        },
        billing: {
          expectedAmount: isNaN(parsedAmount) ? 0 : parsedAmount,
          dueDate: dueDate.value ? new Date(dueDate.value) : null
        },
        status: {
          status: 'pending'
        }
      };
      
      if (breakdownItems.length > 0) {
          record.billing.breakdown = breakdownItems;
      }
      
      batch.set(recordRef, record);
    });

    await batch.commit();
    uploadSuccess.value = true;
    csvData.value = [];
    campaignName.value = '';
    description.value = '';
    dueDate.value = '';
    
    // Refresh campaigns list and switch back to dashboard mode
    await checkCampaigns();
    setTimeout(() => {
        isCreateMode.value = false;
        uploadSuccess.value = false;
    }, 1500);

  } catch (error) {
    console.error("Error batch importing:", error);
    alert('匯入失敗，請查看主控台。');
  } finally {
    isUploading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        
        <!-- Header -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div class="min-w-0">
                <h2 class="text-2xl font-bold text-gray-800 mb-1">會費及費用批次管理 (Campaigns)</h2>
                <p class="text-gray-500 text-sm">管理所有會員帳單匯入批次，並進行獨立對帳與發布設定。</p>
            </div>
            <button 
                @click="isCreateMode = !isCreateMode"
                class="w-full sm:w-auto shrink-0 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition flex items-center justify-center gap-2"
            >
                <span v-if="!isCreateMode">+ 建立新批次</span>
                <span v-else>← 返回清單</span>
            </button>
        </div>

        <div v-if="isCreateMode">
            <div class="border-t pt-6"></div>
            <h3 class="text-lg font-bold text-gray-800 mb-4">上傳建立新帳單參數</h3>
            <div v-if="uploadSuccess" class="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-medium">
              ✅ 批次帳單已成功建立並發布！
            </div>

            <form @submit.prevent="submitCampaign" class="space-y-6 border rounded-xl p-6 bg-gray-50/50">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">批次名稱 *</label>
                  <input v-model="campaignName" type="text" class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" placeholder="例：2026年度常年會費" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">繳費期限 (選填)</label>
                  <input v-model="dueDate" type="date" class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border">
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">說明備註</label>
                  <textarea v-model="description" rows="2" class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" placeholder="輸入相關備註事項..."></textarea>
                </div>
                
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">上傳名冊 (CSV / XLSX) *</label>
                  <div 
                    @click="triggerFileInput" 
                    class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-indigo-200 border-dashed rounded-xl bg-white hover:bg-indigo-50 cursor-pointer transition"
                  >
                    <div class="space-y-1 text-center">
                      <svg class="mx-auto h-12 w-12 text-indigo-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      <div class="flex text-sm text-gray-600 justify-center">
                        <span class="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                          選擇檔案 (.csv / .xlsx)
                        </span>
                      </div>
                      <p class="text-xs text-gray-500">系統將自動分析特殊「費用明細」欄位</p>
                    </div>
                  </div>
                  <input ref="fileInput" type="file" class="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" @change="handleFileUpload">
                </div>
              </div>

              <div v-if="csvData.length > 0" class="mt-4 border rounded-lg overflow-hidden">
                <div class="bg-gray-50 px-4 py-2 border-b font-medium text-gray-700 flex justify-between items-center">
                  <span>預覽資料 (共 {{ csvData.length }} 筆)</span>
                  <button @click.prevent="csvData = []" class="text-red-500 hover:text-red-700 text-sm">清除重新選擇</button>
                </div>
                <div class="max-h-60 overflow-y-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-white sticky top-0 shadow-sm">
                      <tr>
                        <th v-for="key in Object.keys(csvData[0] || {})" :key="key" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {{ key }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      <tr v-for="(row, idx) in csvData" :key="idx" class="hover:bg-gray-50">
                        <td v-for="(val, key) in row" :key="key" class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {{ val }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="flex justify-end pt-4 border-t">
                <button 
                  type="submit" 
                  :disabled="isUploading || csvData.length === 0"
                  class="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg v-if="isUploading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {{ isUploading ? '建立中...' : '確認上傳並發送' }}
                </button>
              </div>
            </form>
        </div>

        <div v-else class="min-w-0 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
            <DataTable :value="campaigns" paginator :rows="10" :loading="isFetching" class="p-datatable-sm min-w-[640px]" dataKey="id">
                <template #empty>目前尚無任何帳單批次。</template>
                <template #loading>載入批次清單中...</template>
                
                <Column field="name" header="批次名稱" style="min-width: 16rem">
                    <template #body="{ data }">
                        <div class="font-bold text-gray-900 group-hover:text-indigo-600 cursor-pointer" @click="goToReconciliation(data.id)">
                            {{ data.name }}
                        </div>
                        <div v-if="data.details?.description" class="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{{ data.details.description }}</div>
                    </template>
                </Column>
                
                <Column header="建立日期">
                    <template #body="{ data }">
                        <span class="text-sm font-medium text-gray-600">{{ formatDate(data.createdAt) }}</span>
                    </template>
                </Column>

                <Column header="發布狀態" style="width: 8rem">
                    <template #body="{ data }">
                        <button 
                            @click="togglePublish(data.id, data.isPublished)"
                            class="px-2.5 py-1 text-xs font-bold rounded-full transition-colors border"
                            :class="data.isPublished ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'"
                        >
                            {{ data.isPublished ? '已發布 (公開)' : '草稿 (私藏)' }}
                        </button>
                    </template>
                </Column>
                
                <Column header="操作管理" style="min-width: 14rem">
                    <template #body="{ data }">
                        <div class="flex gap-2 items-center">
                            <button 
                                @click="goToReconciliation(data.id)"
                                class="px-3 py-1.5 text-xs font-bold rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition shadow-sm border border-indigo-100 flex items-center gap-1"
                            >
                                進入對帳明細 ↗
                            </button>
                            <button 
                                @click="deleteCampaign(data.id)"
                                class="p-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                title="刪除整個批次與其對帳紀錄"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
        
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
