# 北大獅子會會員服務系統 (V6.0)

## LINE Bot 設定指引 (Environment Setup)

為了讓 LINE Webhook 功能正常運作，您需要在 Firebase Functions 環境中設定 LINE Channel Secret 與 Channel Access Token。

### 1. 取得 LINE Channel 憑證
請至 [LINE Developers Console](https://developers.line.biz/console/) 取得您的 Channel 資訊：
- **Channel Secret**: 位於 Basic Settings 頁面。
- **Channel Access Token**: 位於 Messaging API 頁面 (請發行一個長效 Token)。

### 2. 設定 Firebase 環境變數
使用 Firebase CLI 設定環境變數。請在終端機執行以下指令：

```bash
# 設定 Channel Secret
firebase functions:config:set line.channel_secret="您的_CHANNEL_SECRET"

# 設定 Channel Access Token
firebase functions:config:set line.channel_access_token="您的_CHANNEL_ACCESS_TOKEN"
```

> **注意**: 本專案目前的程式碼 (`functions/src/webhook.ts`) 使用 `process.env.CHANNEL_SECRET` 與 `process.env.CHANNEL_ACCESS_TOKEN`。
> 為了配合 Firebase Functions 的 `.env` 檔案載入機制，建議在 `functions/` 目錄下建立 `.env` 檔案 (僅限本地開發)，或使用 Google Cloud Secret Manager。

#### 推薦方式：使用 `.env` 檔案 (Firebase Functions v3.18.0+)

在 `functions/.env` 檔案中加入：

```env
CHANNEL_SECRET=您的_CHANNEL_SECRET
CHANNEL_ACCESS_TOKEN=您的_CHANNEL_ACCESS_TOKEN
```

部署時，Firebase 會自動載入這些變數。

### 3. 本地測試
使用隨附的測試腳本模擬 Webhook 請求：

```bash
# 確保已安裝 Node.js
# 格式: node scripts/simulate_line_webhook.js [Webhook URL] [Channel Secret]

node scripts/simulate_line_webhook.js http://127.0.0.1:5001/您的專案ID/us-central1/lineWebhook 您的_CHANNEL_SECRET
```

### 4. 部署
設定完成後，部署 Cloud Functions：

```bash
firebase deploy --only functions
```
