# 測試案例規範 (Testing Specification)

## 1. 目的
本文件定義系統的測試策略與標準，確保所有新功能在部署至生產環境前，皆經過單元測試、整合測試及端對端測試，以維持高可用性並保護會員個資安全。

## 2. 測試架構與工具
系統採用分層測試架構：

- **單元測試 (Unit Testing)**：使用 **Jest** 針對 Firebase Functions 業務邏輯進行測試。
- **整合測試 (Integration Testing)**：利用 **Firebase Emulator Suite** 驗證 Firestore 安全性規則與數據流。
- **端對端測試 (E2E Testing)**：使用 **Playwright** 模擬真實使用者在瀏覽器上的操作行為。
- **權限稽核 (RBAC Testing)**：使用 Python 腳本 (`tests/rbac_test.py`) 針對 API 存取權限進行獨立驗證。

## 3. 核心測試案例定義

### 3.1 會員認證與權限 (Auth & RBAC)
- **[TC-01] LINE 登入流程**：驗證新會員能透過 LINE 成功建立帳號，且系統正確對應 `lineUserId`。
- **[TC-02] 管理員權限驗證**：確保只有 `role: 'Admin'` 的帳號能進入後台管理頁面（如 `MemberListView`）。
- **[TC-03] 資料越權存取**：驗證一般會員無法透過 API 讀取其他會員的私密資料（如手機號碼、身分證字號）。

### 3.2 活動與報名系統 (Events & Registrations)
- **[TC-04] 活動建立流程**：管理員建立活動後，前端 `EventListView` 應能立即顯示。
- **[TC-05] 報名額度限制**：當報名人數達到 `quota` 上限時，系統應自動將新報名者轉為「候補中」狀態。
- **[TC-06] 家屬報名邏輯**：驗證報名時填寫的 `adultCount` 與 `childCount` 能正確累計至活動統計中。

### 3.3 訊息與推播 (LINE Bot)
- **[TC-07] Webhook 簽章驗證**：使用 `scripts/simulate_line_webhook.js` 傳送非法簽章，系統應回傳 401/403 錯誤。
- **[TC-08] 自動回覆正確性**：模擬會員傳送關鍵字（如「查詢活動」），驗證系統能從 `announcements` 提取資料並回傳訊息。

## 4. 測試執行流程

### 4.1 本地開發階段
開發者在提交程式碼前，必須在本地 Emulator 環境執行：

```bash
# 執行後端單元測試
cd functions && npm test

# 執行前端組件測試
cd client && npm run test:unit
```

### 4.2 CI/CD 自動化階段
當程式碼推送到 master 時，GitHub Actions 將自動執行：

1. **Build Check**：確保程式碼可編譯。
2. **Lint Check**：確保符合 TypeScript 撰寫規範。
3. **Automated Tests**：執行所有已定義的 `.spec.ts` 與 `.test.js` 檔案。

## 5. 測試資料管理

- **測試隔離**：嚴禁在生產環境執行測試案例。
- **資料清理**：自動化測試後應呼叫 `scripts/check_seed.js` 或相關指令清理測試產生的冗餘數據。
- **模擬數據**：統一使用 `scripts/seed_data.js` 產生的標準化測試資料進行驗證。
