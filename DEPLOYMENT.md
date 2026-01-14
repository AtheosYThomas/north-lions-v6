# 北大獅子會會員服務系統 (V6.0) 部署規範文件

## 1. 目的
本文件定義「北大獅子會會員服務系統」的部署流程、環境配置、安全管理及維運準則，以確保系統從開發、測試到生產環境的轉換具備一致性與安全性。

## 2. 環境定義
系統劃分為三種運行環境：

- **本地開發 (Local/Emulator)**：使用 Firebase Emulator Suite 進行功能開發與測試。
- **預發布環境 (Staging)**：利用 GitHub Actions 與 Firebase Hosting Channels 進行預覽測試。
- **生產環境 (Production)**：正式營運環境，專案 ID 為 `north-lions-v6-a7757`。

## 3. 部署前置作業

### 3.1 憑證與金鑰管理 (Secrets Management)
禁止將任何金鑰（Secrets）寫死於程式碼中或提交至 Git 儲存庫。

- **LINE 憑證**：包含 Channel Secret 與 Channel Access Token。
- **Firebase 設定**：後端 Functions 需透過 `.env` 檔案（本地）或 Firebase Config 指令設定環境變數。
- **Secret Manager**：生產環境建議啟用 Google Cloud Secret Manager 管理第三方 API Key。

### 3.2 版本依賴與 Runtime
- **Node.js 版本**：Functions 運行環境指定為 `nodejs24`；CI/CD 流程應確保測試環境與之相符（建議使用 20.x 或更高版本）。
- **Monorepo 結構**：部署時需注意 `client/` (Frontend) 與 `functions/` (Backend) 的依賴管理。

## 4. 部署流程規範

### 4.1 自動化部署 (CI/CD)
本系統採用 GitHub Actions 進行自動化部署，流程如下：

1. **觸發條件**：推送到 `master` 分支或提交 Pull Request。
2. **品質檢查**：執行 `npm ci` 安裝依賴並運行單元測試 (`npm test`)。
3. **建置**：執行前端打包 (`npm run build`) 產生 `dist/` 靜態檔案。
4. **發布**：
   - **Hosting**：部署至 Firebase Hosting。
   - **Functions**：執行 `firebase deploy --only functions`。

### 4.2 手動部署（緊急修復）
若需執行手動部署，必須確保已安裝 Firebase CLI 並通過 `firebase login` 認證：

```bash
# 確保環境變數已設定
firebase functions:config:set line.channel_secret="YOUR_SECRET"

# 部署完整專案
firebase deploy
```

## 5. 資料庫部署與遷移

### 5.1 Firestore 規範
- **索引同步**：部署前必須確認 `firestore.indexes.json` 已包含所有複雜查詢所需的索引。
- **安全性規則**：修改權限後需獨立測試 `firestore.rules` 確保不會造成未授權存取。
- **初始資料**：新環境部署後，應運行 `scripts/seed_data.js` 建立必要的管理員角色與初始分類。

### 5.2 資料備份
維運人員應定期透過 Google Cloud Console 執行 Firestore 導出（Export）作業至指定之 Cloud Storage Bucket。

## 6. LINE Webhook 整合規範
- **Webhook URL**：必須設定為 Firebase Functions 部署後的網址（通常為 `https://[REGION]-[PROJECT_ID].cloudfunctions.net/lineWebhook`）。
- **安全性驗證**：`webhook.ts` 必須啟用簽章驗證（Signature Verification），防止伪造請求。
- **模擬測試**：在切換生產 Webhook 前，應先使用 `scripts/simulate_line_webhook.js` 驗證邏輯正確性。

## 7. 監控與事件處理
- **日誌稽核**：系統必須記錄所有 LINE 互動訊息於 `message_logs` 集合中。
- **錯誤監控**：管理員應定期檢查 Firebase Console 中的 Functions Logs，針對運行錯誤（如 401 Token 失效或 500 系統崩潰）進行排查。
- **回滾 (Rollback)**：若部署後發生嚴重錯誤，應立即透過 Firebase Hosting 控制台恢復至前一個版本的版本快照（Snapshot）。
