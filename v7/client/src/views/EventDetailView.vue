<template>
  <div class="max-w-4xl mx-auto px-4 py-8" v-if="event">
    <div class="flex items-center gap-4 mb-6">
      <router-link to="/events" class="text-gray-500 hover:text-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </router-link>
      <h1 class="text-3xl font-bold text-gray-900">{{ authStore.isAdmin ? '編輯活動' : '活動詳情' }}：{{ event.name }}</h1>
    </div>

    <!-- Error Banner -->
    <div v-if="saveError" class="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-red-700 rounded">
      {{ saveError }}
    </div>

    <!-- QR Code 顯示區塊 (Admin Only) -->
    <div v-if="authStore.isAdmin" class="mb-6 bg-white shadow-sm rounded-lg border border-gray-200 p-6 flex flex-col items-center justify-center">
      <h3 class="text-xl font-bold text-gray-900 mb-2">📍 現場報到專用 QR Code</h3>
      <p class="text-gray-500 mb-6 text-sm text-center">請讓參與者使用手機掃描此 QR Code，即可快速完成報到登錄。<br>（需透過 LINE 掃碼，將自動驗證與登記）</p>
      
      <div v-if="showQrCode" class="p-4 bg-white border rounded-lg shadow-sm transition-all">
        <qrcode-vue :value="qrCodeUrl" :size="250" level="H" />
      </div>

      <button 
        @click="showQrCode = !showQrCode" 
        class="mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2 px-6 rounded-lg border border-indigo-200 transition shadow-sm"
      >
        {{ showQrCode ? '隱藏 QR Code' : '顯示報到 QR Code' }}
      </button>
    </div>

    <!-- 管理員編輯表單 -->
    <form v-if="authStore.isAdmin" @submit.prevent="saveEvent" class="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
      <!-- 基本資訊 -->
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4 border-b pb-2">基本資訊</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700">活動名稱</label>
            <input v-model="event.name" type="text" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">分類</label>
            <select v-model="event.category" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border">
              <option value="例會通知">例會通知</option>
              <option value="活動預告">活動預告</option>
              <option value="會員大會">會員大會</option>
              <option value="理監事會">理監事會</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">活動狀態</label>
            <select v-model="event.status.eventStatus" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border">
              <option value="籌備中">籌備中</option>
              <option value="報名中">報名中</option>
              <option value="已結束">已結束</option>
              <option value="已取消">已取消</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 時間地點 -->
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4 border-b pb-2">時間地點</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-700">日期</label>
            <input v-model="event.time.date" type="date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border">
          </div>
          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-700">地點</label>
            <input v-model="event.details.location" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">開始時間</label>
            <input v-model="event.time.start" type="time" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">結束時間</label>
            <input v-model="event.time.end" type="time" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border">
          </div>
        </div>
      </div>

      <!-- 報名設定 -->
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4 border-b pb-2">報名設定</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700">報名人數上限 (0代表無上限)</label>
            <input v-model.number="event.details.quota" type="number" min="0" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">報名截止日期</label>
            <input v-model="event.time.deadline" type="date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">活動費用金額</label>
            <input v-model.number="event.details.cost" type="number" min="0" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border">
          </div>
          <div class="flex items-center mt-6">
            <input v-model="event.details.isPaidEvent" id="isPaid" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary">
            <label for="isPaid" class="ml-2 block text-sm text-gray-900">需要收費 (勾選後將產生繳費條目)</label>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t mt-8">
        <button type="button" @click="confirmDelete" class="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2 px-4 border border-red-200 rounded shadow-sm transition">
          刪除活動
        </button>
        <button type="submit" :disabled="saving" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded shadow-sm transition disabled:opacity-50">
          {{ saving ? '儲存中...' : '儲存變更' }}
        </button>
      </div>
    </form>

    <!-- 一般會員唯讀展示區塊 -->
    <div v-else class="bg-white shadow-sm rounded-lg border border-gray-200 p-8 space-y-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-2">
            {{ event.category }}
          </span>
          <h2 class="text-2xl font-bold text-gray-900">{{ event.name }}</h2>
        </div>
        <span class="px-4 py-2 rounded-lg text-sm font-bold bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
          {{ event.status.eventStatus }}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 py-2">
        <div>
          <h4 class="text-sm font-semibold text-gray-500 mb-1">📅 日期與時間</h4>
          <p class="text-lg text-gray-800 font-medium whitespace-nowrap">{{ event.time.date || '未定' }} {{ event.time.start ? `${event.time.start} - ${event.time.end}` : '' }}</p>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-gray-500 mb-1">📍 舉辦地點</h4>
          <p class="text-lg text-gray-800 font-medium">{{ event.details.location || '未定' }}</p>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-gray-500 mb-1">👥 報名限制</h4>
          <p class="text-lg text-gray-800 font-medium">
            名額上限：{{ event.details.quota ? `${event.details.quota} 人` : '無上限' }}<br>
            <span class="text-sm text-gray-500">截止日：{{ event.time.deadline || '未定' }}</span>
          </p>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-gray-500 mb-1">💰 活動費用</h4>
          <p class="text-lg text-gray-800 font-medium">
            {{ event.details.isPaidEvent ? `NT$ ${event.details.cost}` : '免費活動' }}
          </p>
        </div>
      </div>
    </div>

    <!-- 報名名單與報名操作 -->
    <div class="mt-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6">
      <h3 class="text-xl font-bold text-gray-900 mb-4 border-b pb-2">活動報名管理</h3>
      
      <!-- 會員自我報名區塊 (所有身分共用) -->
      <div class="bg-indigo-50 border border-indigo-100 rounded-lg p-6 mb-8 flex flex-col items-center justify-between gap-4">
        <!-- 如果已經報名/曾報名過 -->
        <div class="w-full" v-if="myRegistration">
          <div class="flex flex-col lg:flex-row justify-between items-center w-full gap-4">
            <div>
              <h4 class="font-bold text-indigo-900 text-lg">✅ 您的報名資料</h4>
              <p class="text-sm text-indigo-700 mt-1">
                目前的狀態：
                <span class="font-semibold" :class="myRegistration.status.status === '已取消' ? 'text-red-500' : 'text-green-600'">
                  {{ myRegistration.status.status }}
                </span>
                （您可以修改下方參與人數來重新提交）
              </p>
            </div>
            
            <div class="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-100 w-full lg:w-auto justify-center">
              <div class="flex items-center gap-2">
                <label class="text-sm font-medium text-gray-700 whitespace-nowrap">大人</label>
                <input type="number" v-model.number="editAdults" min="1" class="w-16 rounded-md border-gray-300 shadow-sm text-sm p-1">
              </div>
              <div class="flex items-center gap-2">
                <label class="text-sm font-medium text-gray-700 whitespace-nowrap">小孩</label>
                <input type="number" v-model.number="editChildren" min="0" class="w-16 rounded-md border-gray-300 shadow-sm text-sm p-1">
              </div>
              <div class="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                <button @click="handleUpdateReg" :disabled="registering" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-4 rounded shadow transition disabled:opacity-50 text-sm whitespace-nowrap w-full sm:w-auto">
                  {{ registering ? '處理中' : '儲存修改' }}
                </button>
                <button v-if="myRegistration.status.status !== '已取消'" @click="cancelReg(myRegistration.id)" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 px-4 rounded shadow transition text-sm whitespace-nowrap w-full sm:w-auto">
                  取消報名
                </button>
              </div>
            </div>
          </div>
          
          <!-- 付款憑證區塊 -->
          <div v-if="event.details.isPaidEvent && myRegistration.status.status !== '已取消'" class="mt-6 border-t border-indigo-200 pt-6 w-full">
            <h5 class="font-bold text-indigo-900 mb-3 flex items-center">
              <svg class="w-5 h-5 mr-1 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              活動繳費與憑證回報
            </h5>

            <!-- ✅ [新增] 退回警告標語 —— 後台退回後顯示醒目紅色橫幅 -->
            <div
              v-if="isPaymentRejected"
              class="mb-4 flex items-start gap-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 animate-pulse"
            >
              <svg class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p class="font-bold text-red-700 text-base">⚠️ 您的繳費憑證已被財務人員退回，請重新上傳</p>
                <p v-if="myRegistration.payment?.rejectReason" class="text-sm text-red-600 mt-1">
                  退回原因：<span class="font-semibold">{{ myRegistration.payment.rejectReason }}</span>
                </p>
                <p class="text-xs text-red-500 mt-1">請確認匯款資訊後，在下方重新選擇您的憑證截圖並送出。</p>
              </div>
            </div>

            <div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <!-- 金額與狀態 -->
              <div class="flex items-center mb-4 gap-3">
                <p class="text-sm text-gray-600">
                  應繳總額：<span class="font-bold text-xl text-indigo-700">NT$ {{ event.details.cost * myRegistration.details.adultCount }}</span>
                </p>
                <span v-if="myRegistration.status.paymentStatus === '審核中'" class="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold ring-1 ring-inset ring-yellow-600/20">審核中</span>
                <span v-else-if="myRegistration.status.paymentStatus === '已繳費'" class="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold ring-1 ring-inset ring-green-600/20">✅ 對帳成功</span>
                <span v-else-if="isPaymentRejected" class="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold ring-1 ring-inset ring-red-600/20">❌ 已被退回</span>
                <span v-else class="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold ring-1 ring-inset ring-red-600/20">尚未繳費</span>
              </div>

              <!-- ✅ [修補] 回報方式頁籤：「尚未繳費」或「已被退回」時均顯示上傳入口 -->
              <div v-if="!['審核中', '已繳費'].includes(myRegistration.status.paymentStatus)">
                <!-- 頁籤切換 -->
                <div class="flex gap-2 mb-4">
                  <button
                    @click="paymentTab = 'image'"
                    :class="paymentTab === 'image' ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                    class="flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition"
                  >📷 上傳匯款截圖</button>
                  <button
                    @click="paymentTab = 'manual'"
                    :class="paymentTab === 'manual' ? 'bg-amber-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                    class="flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition"
                  >✏️ 手動填寫資料</button>
                </div>

                <!-- Tab A: 上傳圖片 -->
                <div v-if="paymentTab === 'image'" class="flex flex-col gap-3 bg-gray-50 p-4 rounded border">
                  <!-- ✅ [新增] 格式提示 -->
                  <p class="text-xs text-gray-500">📎 僅接受 JPG / PNG 格式，檔案大小上限 5MB</p>
                  <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <input
                      type="file"
                      ref="receiptInput"
                      accept="image/jpeg,image/jpg,image/png"
                      class="text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 w-full sm:w-auto cursor-pointer file:cursor-pointer transition"
                    >
                    <button
                      @click="handleUploadReceipt"
                      :disabled="uploadingReceipt"
                      class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-md shadow transition disabled:opacity-50 whitespace-nowrap w-full sm:w-auto flex justify-center items-center"
                    >
                      <svg v-if="uploadingReceipt" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      {{ uploadingReceipt ? '上傳與 AI 辨識中...' : (isPaymentRejected ? '重新上傳憑證' : '確認上傳憑證') }}
                    </button>
                  </div>
                  <!-- 上傳錯誤訊息 -->
                  <p v-if="uploadError" class="text-xs text-red-600 font-medium">⚠️ {{ uploadError }}</p>
                </div>

                <!-- Tab B: 手動填寫 -->
                <div v-else class="bg-amber-50 p-4 rounded border border-amber-200 space-y-3">
                  <p class="text-xs text-amber-700 font-medium">📝 請如實填寫您的匯款資料供財務人員核對。</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">匯款日期 <span class="text-red-500">*</span></label>
                      <input type="date" v-model="manualForm.reportedDate" class="w-full rounded-md border-gray-300 shadow-sm text-sm p-2 border focus:border-amber-400 focus:ring-amber-400">
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">匯款金額 (NT$) <span class="text-red-500">*</span></label>
                      <input type="number" v-model.number="manualForm.reportedAmount" min="1" placeholder="例：1500" class="w-full rounded-md border-gray-300 shadow-sm text-sm p-2 border focus:border-amber-400 focus:ring-amber-400">
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">帳號末五碼 <span class="text-red-500">*</span></label>
                      <input type="text" v-model="manualForm.reportedLast5" maxlength="5" placeholder="例：12345" class="w-full rounded-md border-gray-300 shadow-sm text-sm p-2 border focus:border-amber-400 focus:ring-amber-400 font-mono tracking-wider">
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">備註（選填）</label>
                      <input type="text" v-model="manualForm.memo" placeholder="例：已通知會計" class="w-full rounded-md border-gray-300 shadow-sm text-sm p-2 border focus:border-amber-400 focus:ring-amber-400">
                    </div>
                  </div>
                  <button @click="handleSubmitManual" :disabled="uploadingReceipt" class="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-md shadow transition disabled:opacity-50 flex justify-center items-center">
                    <svg v-if="uploadingReceipt" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    {{ uploadingReceipt ? '提交中...' : '送出繳費回報' }}
                  </button>
                </div>
              </div>

              <!-- 審核中：已回報，顯示截圖預覽 -->
              <div v-else-if="myRegistration.payment?.screenshotUrl" class="mt-4 pt-4 border-t border-gray-100">
                <p class="text-xs font-bold text-gray-500 mb-2">已上傳之憑證預覽：</p>
                <a :href="myRegistration.payment.screenshotUrl" target="_blank" rel="noopener">
                  <img :src="myRegistration.payment.screenshotUrl" alt="付款憑證" class="max-h-40 rounded border shadow-sm hover:opacity-90 transition object-cover">
                </a>
              </div>
              <!-- 手填資料回報預覽 -->
              <div v-else-if="myRegistration.payment?.reportMethod === 'web_manual'" class="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600 space-y-1">
                <p class="font-bold text-gray-700 mb-2">✏️ 已填寫繳費資料</p>
                <p>匯款日期：<span class="font-medium">{{ myRegistration.payment.reportedDate || '—' }}</span></p>
                <p>匯款金額：<span class="font-medium text-indigo-700">NT$ {{ myRegistration.payment.reportedAmount?.toLocaleString() || '—' }}</span></p>
                <p>帳號末五碼：<span class="font-mono font-medium">{{ myRegistration.payment.reportedLast5 || '—' }}</span></p>
                <p v-if="myRegistration.payment.memo">備註：{{ myRegistration.payment.memo }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 若尚未報名 -->
        <div class="w-full flex flex-col md:flex-row items-center justify-between gap-4" v-else>
          <div>
            <h4 class="font-bold text-indigo-900 text-lg">我要報名</h4>
            <p class="text-sm text-indigo-700">請填寫出席人數，完成報名程序。</p>
          </div>
          <div class="flex items-center gap-4 bg-white p-3 rounded-lg shadow-sm flex-wrap md:flex-nowrap border border-gray-100">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-700">大人</label>
              <input type="number" v-model.number="regAdults" min="1" class="w-16 rounded-md border-gray-300 shadow-sm text-sm p-1">
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-700">小孩</label>
              <input type="number" v-model.number="regChildren" min="0" class="w-16 rounded-md border-gray-300 shadow-sm text-sm p-1">
            </div>
            <button @click="handleRegister" :disabled="registering" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition disabled:opacity-50 whitespace-nowrap w-full md:w-auto">
              {{ registering ? '處理中...' : '提交報名' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 已報名清單 (共用 View) -->
      <div class="flex justify-between items-center mb-3">
        <div>
          <h4 class="font-semibold text-gray-800">已報名名單 (共 {{ registrations.length }} 筆)</h4>
          <p v-if="!authStore.isAdmin" class="text-xs text-gray-500 mt-1">一般會員僅能看到自己的報名紀錄；完整名單僅限幹部檢視。</p>
        </div>
        <button v-if="authStore.isAdmin" @click="exportRegistrationsCsv" class="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-4 rounded shadow-sm transition text-sm flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          匯出 CSV
        </button>
      </div>
      <div v-if="regLoading" class="text-sm text-gray-500">載入中...</div>
      <div v-else-if="registrations.length === 0" class="text-sm text-gray-500 bg-gray-50 p-4 rounded text-center border">目前尚無任何人報名。</div>
      <ul v-else class="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
        <li v-for="reg in registrations" :key="reg.id" class="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition gap-4">
          <div>
            <p class="font-bold text-gray-800 text-lg">🦁 報名獅友: {{ getMemberName(reg.info.memberId) }}</p>
            <p class="text-sm text-gray-500 mt-1">人數：{{ reg.details.adultCount }} 大人 / {{ reg.details.childCount }} 小孩</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 text-xs font-semibold rounded-full" :class="reg.status.status === '已報名' ? 'bg-green-100 text-green-800' : (reg.status.status === '已取消' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800')">
              {{ reg.status.status }}
            </span>
            <button v-if="authStore.isAdmin && reg.status.status !== '已取消'" @click="cancelReg(reg.id)" class="text-xs text-red-600 border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition">
              取消資格
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
  
  <div v-else-if="!loading" class="text-center py-20 text-gray-500">
    找不到活動資料
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEventsStore } from '../stores/events';
import { useRegistrationsStore } from '../stores/registrations';
import { useMembersStore } from '../stores/members';
import { useAuthStore, waitForAuth } from '../stores/auth';
import type { Event, Registration } from 'shared';
import QrcodeVue from 'qrcode.vue';
import confetti from 'canvas-confetti';
import { compressImage } from '../utils/imageCompressor';

const route = useRoute();
const router = useRouter();
const eventsStore = useEventsStore();
const regStore = useRegistrationsStore();
const membersStore = useMembersStore();
const authStore = useAuthStore();

const event = ref<(Event & { id: string }) | null>(null);
const loading = ref(true);
const saving = ref(false);
const saveError = ref('');

const showQrCode = ref(false);
const qrCodeUrl = computed(() => {
  return `https://liff.line.me/${import.meta.env.VITE_LIFF_ID}/?action=checkin&eventId=${event.value?.id}`;
});

// Registration states
const registrations = ref<(Registration & { id: string })[]>([]);
const regLoading = ref(true);
const regAdults = ref(1);
const regChildren = ref(0);
const registering = ref(false);

const receiptInput = ref<HTMLInputElement | null>(null);
const uploadingReceipt = ref(false);
const uploadError = ref<string>('');
const paymentTab = ref<'image' | 'manual'>('image');
const manualForm = ref({
  reportedDate: '',
  reportedAmount: 0,
  reportedLast5: '',
  memo: ''
});

// ✅ [新增] 判斷「已被退回」狀態（財務人員退回 → paymentStatus 重置為 未繳費 且曾有 rejectReason）
const isPaymentRejected = computed(() => {
  if (!myRegistration.value) return false;
  const reg = myRegistration.value;
  // 被退回的特徵：paymentStatus=未繳費 且 payment.rejectReason 有值
  return reg.status.paymentStatus === '未繳費' && !!reg.payment?.rejectReason;
});

const myRegistration = computed(() => {
  const currentUserId = authStore.user?.memberId || authStore.user?.uid;
  if (!currentUserId) return null;
  return registrations.value.find(r => r.info.memberId === currentUserId) || null;
});

const editAdults = ref(1);
const editChildren = ref(0);

watch(myRegistration, (newVal) => {
  if (newVal) {
    editAdults.value = newVal.details.adultCount || 1;
    editChildren.value = newVal.details.childCount || 0;
  }
}, { immediate: true });

const loadRegistrationsForCurrentEvent = async () => {
  if (!event.value) return;
  const id = event.value.id;
  if (authStore.isAdmin) {
    registrations.value = await regStore.fetchRegistrationsByEvent(id);
    return;
  }
  const uid = authStore.user?.memberId || authStore.user?.uid;
  registrations.value = uid ? await regStore.fetchRegistrationsByEventForMember(id, uid) : [];
};

onMounted(async () => {
  await waitForAuth();
  // 載入會員字典以供反查姓名
  if (membersStore.members.length === 0) {
    await membersStore.fetchMembers();
  }

  const id = route.params.id as string;
  if (id) {
    const data = await eventsStore.getEventById(id);
    if (data) {
      event.value = data;
      await loadRegistrationsForCurrentEvent();
    }
  }
  loading.value = false;
  regLoading.value = false;
});

const getMemberName = (id: string) => {
  if (id === 'DEV_ADMIN_ID') return '開發測試管理員';
  const member = membersStore.members.find(m => m.id === id || m.contact?.lineUserId === id);
  return member?.name || id;
};

const saveEvent = async () => {
  if (!event.value) return;
  saving.value = true;
  saveError.value = '';
  try {
    const success = await eventsStore.updateEvent(event.value.id, event.value);
    if (success) {
      router.push('/events');
    } else {
      saveError.value = '儲存失敗，請重試';
    }
  } catch (err: any) {
    saveError.value = err.message || '未知錯誤';
  } finally {
    saving.value = false;
  }
};

const escapeCsv = (str: any) => str == null ? '""' : '"' + String(str).replace(/"/g, '""') + '"';

const exportRegistrationsCsv = () => {
    let csvContent = '\uFEFF獅友姓名,大人人數,小孩人數,繳費狀態,報名狀態\n';
    registrations.value.forEach(reg => {
        const name = getMemberName(reg.info.memberId);
        const adults = reg.details.adultCount || 0;
        const children = reg.details.childCount || 0;
        const payStatus = reg.status.paymentStatus || '尚未繳費';
        const regStatus = reg.status.status || '';
        csvContent += `${escapeCsv(name)},${adults},${children},${escapeCsv(payStatus)},${escapeCsv(regStatus)}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `活動報名名單_${event.value?.name || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const confirmDelete = async () => {
  if (!event.value) return;
  if (confirm(`確定要刪除活動「${event.value.name}」嗎？這將會連帶刪除所有報名資料。`)) {
    const success = await eventsStore.deleteEvent(event.value.id);
    if (success) {
      router.push('/events');
    } else {
      alert('刪除失敗');
    }
  }
};

const handleRegister = async () => {
  if (!event.value) return;
  const currentUserId = authStore.user?.memberId || authStore.user?.uid || '測試獅友_01'; 
  
  // 防呆：防止重複報名
  if (registrations.value.some(r => r.info.memberId === currentUserId && r.status.status !== '已取消')) {
    alert('您已經報名過此活動囉！如果需要更改人數，請使用修改功能。');
    return;
  }

  registering.value = true;
  try {
    await regStore.createRegistration(event.value.id, currentUserId, regAdults.value, regChildren.value);
    await loadRegistrationsForCurrentEvent();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    alert('✅ 報名成功！');
  } catch (err: any) {
    alert('報名發生錯誤: ' + err.message);
  } finally {
    registering.value = false;
  }
};

const handleUpdateReg = async () => {
  if (!myRegistration.value || !event.value) return;
  
  if (editAdults.value < 1) {
    alert('請至少填寫 1 位大人參與！');
    return;
  }

  registering.value = true;
  try {
    const success = await regStore.updateRegistrationCounts(myRegistration.value.id, editAdults.value, editChildren.value);
    if (success) {
      await loadRegistrationsForCurrentEvent();
      alert('活動設定已更新並儲存！');
    } else {
      alert('更新失敗，請檢查網路連線。');
    }
  } catch (err: any) {
    alert('更新發生錯誤: ' + err.message);
  } finally {
    registering.value = false;
  }
};

const cancelReg = async (regId: string) => {
  if (confirm('確定要取消此筆報名資格嗎？')) {
    const success = await regStore.updateRegistrationStatus(regId, '已取消');
    if (success) {
      if (event.value) await loadRegistrationsForCurrentEvent();
    } else {
      alert('取消失敗，請檢查權限與連線。');
    }
  }
};

const handleUploadReceipt = async () => {
  uploadError.value = '';

  if (!receiptInput.value?.files?.length || !myRegistration.value) {
    uploadError.value = '請先選擇匯款截圖檔案';
    return;
  }

  const file = receiptInput.value.files[0];

  // ✅ [新增] 格式驗證：僅接受 JPG / PNG
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    uploadError.value = `不支援的格式「${file.type || '未知'}」，請上傳 JPG 或 PNG 圖片。`;
    return;
  }

  // ✅ [修補] 上限從 8MB 調整為嚴格的 5MB，並更新錯誤提示
  const MAX_SIZE_MB = 5;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    uploadError.value = `圖片大小 (${(file.size / 1024 / 1024).toFixed(1)}MB) 超過上限 ${MAX_SIZE_MB}MB，請壓縮後重新上傳。`;
    return;
  }

  uploadingReceipt.value = true;
  try {
    // 壓縮圖片
    const compressedFile = await compressImage(file);
    await regStore.uploadPaymentReceipt(myRegistration.value.id, compressedFile);
    // 上傳成功：清空錯誤提示
    uploadError.value = '';
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    alert('✅ 送出成功！憑證已上傳，請靜候財務審核。');
    if (event.value) {
      await loadRegistrationsForCurrentEvent();
    }
  } catch (e: any) {
    uploadError.value = e.message || '上傳發生非預期錯誤，請稍後再試。';
  } finally {
    uploadingReceipt.value = false;
  }
};

const handleSubmitManual = async () => {
  if (!myRegistration.value) return;
  const f = manualForm.value;
  if (!f.reportedDate || !f.reportedAmount || !f.reportedLast5) {
    alert('請填寫匯款日期、金額與帳號末五碼（必填）');
    return;
  }
  if (f.reportedLast5.length !== 5 || !/^\d+$/.test(f.reportedLast5)) {
    alert('帳號末五碼必須為 5 位數字');
    return;
  }
  uploadingReceipt.value = true;
  try {
    await regStore.submitManualPayment(myRegistration.value.id, f);
    alert('繳費資料已成功送出！財務人員將盡快核對。');
    if (event.value) await loadRegistrationsForCurrentEvent();
  } catch (e: any) {
    alert(e.message || '提交失敗，請稍後再試');
  } finally {
    uploadingReceipt.value = false;
  }
};
</script>
