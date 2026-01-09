# V6.0 系統架構與資料庫設計 (System Architecture & Database Design)

## 1. 系統概觀 (Overview)

本專案 V6.0 為「北大獅子會會員服務系統」，採用 Monorepo 架構。

### 技術堆疊
- **Frontend**: Vue 3 + Vite + Tailwind CSS (`client/`)
- **Backend**: Firebase Cloud Functions + TypeScript (`functions/`)
- **Database**: Google Cloud Firestore
- **Authentication**: LINE Login + Firebase Custom Auth

---

## 2. 資料庫設計 (Firestore Schema)

基於「北大獅子會會員服務系統」規格，規劃以下 7 個主要 Collection。

### 1. 會員資料 (`members`)
管理所有會員的基本資訊與狀態。
- **Doc ID**: `uid` (Firebase Auth UID) 或 `memberId`
- **Fields**:
  - `name` (string): 姓名 (主要欄位)
  - `contact`:
    - `mobile` (string): 手機號碼
    - `email` (string): 電子郵件
    - `lineUserId` (string): LINE userid (索引)
  - `organization`:
    - `role` (string): 職務 (會長/副會長/秘書/財務/理事/監事等)
    - `title` (string): 職稱
  - `personal`:
    - `joinDate` (timestamp): 入會日期
    - `birthDate` (timestamp): 出生年月日
    - `bloodType` (string): 血型
    - `gender` (string): 性別
    - `englishName` (string): 英文名/暱稱
  - `company`:
    - `name` (string): 公司名稱
    - `taxId` (string): 統一編號
  - `emergency`:
    - `contactName` (string): 聯絡人姓名
    - `relationship` (string): 關係
    - `phone` (string): 電話
  - `status`:
    - `activeStatus` (string): 狀態 (活躍/休會/退會)
    - `membershipType` (string): 身分別 (創會/正式/榮譽/潛在)
  - `system`:
    - `account` (string): 系統帳號
    - `role` (string): 系統角色 (Admin/Member)
    - `accountStatus` (string): 帳號狀態
    - `pushConsent` (boolean): 推播同意
  - `stats`:
    - `totalDonation` (number): 捐款總額
    - `donationCount` (number): 捐款次數
    - `lastDonationDate` (timestamp): 最近一次捐款日期
    - `lastInteraction` (timestamp): 最近互動時間

### 2. 公告清單 (`announcements`)
處理所有公告的發布與管理。
- **Doc ID**: `announcementId` (Auto)
- **Fields**:
  - `title` (string): 公告標題 (主要欄位)
  - `content`:
    - `date` (timestamp): 公告日期
    - `body` (string): 公告內容
    - `summary` (string): 公告摘要
  - `publishing`:
    - `targetAudience` (array): 發布對象
    - `publisher` (string): 發布者 (Member ID)
    - `publishTime` (timestamp): 發布時間
  - `status`:
    - `status` (string): 狀態 (draft/published/cancelled/archived)
    - `pushStatus` (string): 推播狀態
  - `settings`:
    - `isPushEnabled` (boolean): 是否推播LINE
    - `isPinned` (boolean): 是否置頂
    - `deliveryMethod` (string): 發送方式
    - `replySetting` (string): 回覆設定
  - `category` (string): 分類 (系統公告/例會通知/活動預告)
  - `related`:
    - `eventId` (string): 活動對應 ID
    - `pushMessageId` (string): 推播訊息ID

### 3. 捐款紀錄 (`donations`)
追蹤所有捐款相關資訊。
- **Doc ID**: `donationId` (Auto)
- **Fields**:
  - `date` (timestamp): 捐款日期
  - `donorName` (string): 捐款人姓名
  - `amount` (number): 捐款金額
  - `category` (string): 捐款項目 (急難救助金/年度活動基金)
  - `payment`:
    - `method` (string): 付款方式
    - `accountLast5` (string): 匯款帳號後五碼
  - `audit`:
    - `status` (string): 核實狀態
    - `auditor` (string): 核實人員
  - `receipt`:
    - `isRequired` (boolean): 是否開立收據
    - `status` (string): 收據狀態
    - `deliveryMethod` (string): 寄送方式
  - `memberId` (string): 關聯會員 ID

### 4. 活動列表 (`events`)
管理所有活動的完整生命週期。
- **Doc ID**: `eventId` (Auto)
- **Fields**:
  - `name` (string): 活動名稱 (主要欄位)
  - `time`:
    - `date` (timestamp): 活動日期
    - `start` (timestamp): 開始時間
    - `end` (timestamp): 結束時間
    - `deadline` (timestamp): 報名截止日
  - `details`:
    - `location` (string): 地點
    - `cost` (number): 費用
    - `quota` (number): 名額限制
    - `isPaidEvent` (boolean): 是否收費
  - `status`:
    - `eventStatus` (string): 活動狀態
    - `registrationStatus` (string): 報名狀態
    - `pushStatus` (string): LINE推播狀態
  - `category` (string): 分類 (例會/ACT/旅遊/研習/理監事會)
  - `publishing`:
    - `target` (array): 發布對象
    - `publisher` (string): 發布者
    - `content` (string): 公告內容
  - `stats`:
    - `registeredCount` (number): 已報名人數
    - `attendees` (array): 報名名單 (Snapshot or Reference)
  - `system`:
    - `code` (string): 活動代碼
    - `coverImage` (string): 活動封面圖
  - `related`:
    - `announcementId` (string): 對應公告 ID

### 5. 報名活動 (`registrations`)
處理會員的活動報名資訊。
- **Doc ID**: `registrationId` (Auto)
- **Fields**:
  - `info`:
    - `memberId` (string): 報名會員 ID
    - `eventId` (string): 報名活動 ID
    - `timestamp` (timestamp): 報名時間
  - `details`:
    - `adultCount` (number): 大人數量
    - `childCount` (number): 小孩數量
    - `familyNames` (array): 家屬姓名
  - `needs`:
    - `shuttle` (boolean): 是否需要接駁
    - `accommodation` (boolean): 是否需住宿
    - `remark` (string): 需求備註
  - `status`:
    - `status` (string): 報名狀態 (已報名/候補中/已取消/已核准)
    - `paymentStatus` (string): 繳費狀態
  - `notification`:
    - `isSent` (boolean): 通知已發送

### 6. 訊息紀錄表 (`message_logs`)
記錄所有LINE互動訊息。
- **Doc ID**: `messageId` (Auto)
- **Fields**:
  - `lineUserId` (string): LINE ID (主要欄位)
  - `content` (string): 訊息內容
  - `timestamp` (timestamp): 時間
  - `category` (string): 訊息類型 (報名/查詢/其他/捐款)
  - `status` (string): 處理狀態 (待處理/完成/無法辨識)
  - `memberName` (string): 對應會員姓名

### 7. 繳費紀錄 (`payments`)
追蹤活動相關的繳費資訊。
- **Doc ID**: `paymentId` (Auto)
- **Fields**:
  - `payerName` (string): 繳費者姓名
  - `date` (timestamp): 繳費日期
  - `amount` (number): 繳費金額
  - `method`:
    - `type` (string): 繳費方式
    - `accountLast5` (string): 匯款後五碼
  - `audit`:
    - `isConfirmed` (boolean): 是否已確認
    - `auditor` (string): 審核人員
  - `receipt`:
    - `isRequired` (boolean): 收據需求
    - `title` (string): 收據抬頭
    - `taxId` (string): 統一編號
  - `related`:
    - `eventId` (string): 關聯活動
    - `registrationId` (string): 關聯報名資料
    - `memberId` (string): 關聯會員
  - `system`:
    - `lineUid` (string): LINE UID
    - `eventCode` (string): 活動代碼
    - `eventName` (string): 活動名稱

---

## 3. 認證與遷移 (Authentication & Migration)
同前版，使用 LINE Login 與 Firebase Custom Auth，資料可透過 Script 批次匯入。
