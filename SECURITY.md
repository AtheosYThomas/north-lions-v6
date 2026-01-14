# 安全性稽核與災難恢復計畫 (Security & Disaster Recovery)

## 1. 目的
本文件定義系統的安全防護標準、個資處理原則及災害應變流程，以確保「北大獅子會」會員資料的機密性、完整性與可用性。

## 2. 安全防護藍圖

### 2.1 認證與授權 (Authentication & RBAC)
*   **LINE Login 驗證**：所有使用者必須透過 LINE Login 進行身份核信，由 Firebase Custom Auth 核發 Token。
*   **角色權限控管 (RBAC)**：嚴格執行 Admin 與 Member 角色分離。
    *   **管理員**：可存取所有會員隱私資料、財務捐款與活動審核。
    *   **一般會員**：僅能存取個人資料與公開公告。
*   **存取稽核**：所有管理端的操作行為（如修改捐款金額、刪除報名）應紀錄於系統日誌中。

### 2.2 資料庫安全規則 (Firestore Rules)
*   **最小權限原則**：`firestore.rules` 應設定為禁止所有預設讀寫，僅對驗證通過之 UIDs 開放特定集合存取。
*   **攔截非法請求**：後端 Functions 必須驗證 `x-line-signature` 簽章，防止冒充 LINE Webhook 的攻擊。

### 2.3 個資去識別化
*   在前端顯示時，非必要的敏感資訊（如電子郵件、部分手機號碼）應進行遮蔽處理。

## 3. 災難恢復計畫 (Disaster Recovery, DR)

### 3.1 備份策略 (Backup)
*   **自動化導出**：利用 Google Cloud Scheduler 定期觸發 Firestore 導出作業，將資料存儲於具備版本控制的 Cloud Storage Bucket 中。
*   **日誌保存**：`message_logs` 集合需保留至少 90 天，以利發生安全事件時進行追溯。

### 3.2 災難應變流程 (Incident Response)
當系統發生大規模錯誤或受駭時，執行以下 RTO (Recovery Time Objective) 流程：

1.  **隔離 (Containment)**：
    *   立即在 Firebase Console 停用受影響的 Cloud Functions。
    *   更新 `firestore.rules` 改為唯讀模式，防止損害擴大。
2.  **評估 (Assessment)**：
    *   檢查 Firebase Logs 確定資料損毀範圍。
3.  **恢復 (Recovery)**：
    *   使用最新的一份導出檔進行 Firestore 數據恢復。
    *   透過 Firebase Hosting 控制台執行版本回滾 (Rollback)。
4.  **驗證 (Verification)**：
    *   執行 `scripts/check_seed.js` 驗證資料一致性。

## 4. 維護與更新頻率
*   **安全性掃描**：每季檢查一次 NPM 依賴包漏洞 (`npm audit`)。
*   **憑證更新**：LINE Channel Access Token 建議每半年重新發行一次。
