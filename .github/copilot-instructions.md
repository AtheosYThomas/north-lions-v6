以下為為本專案量身打造的 Copilot / AI 助手指引（繁體中文）。請保持簡潔、直接、以可執行變更為主。

專案架構大意
- monorepo（workspace）: 三個主要子專案：`client/` (Vue 3 + Vite 前端)、`functions/` (Firebase Cloud Functions，TypeScript)、`shared/` (共用 types/程式碼)。
- `client` 用 `firebase` 客戶端 SDK 與 emulator 互動；`functions` 編譯輸出在 `functions/lib/`，由 emulator 直接載入執行。

快速上手（常用指令）
- 安裝 / 建置（根目錄）：
  ```bash
  npm install
  npm run build        # 會執行 client 與 functions 的 build
  npm run build:client # 僅前端
  npm run build:functions # 僅 functions
  ```
- 啟動 Functions 本機模擬 (functions package.json):
  ```bash
  cd functions
  npm run serve        # 會先 tsc 編譯再啟動 functions emulator
  ```
- E2E（開發用 Playwright）:
  - `scripts/playwright_e2e.js` 為瀏覽器端 E2E 腳本，可切換 mock 或使用真實 emulator endpoints (`--use-real` 或 env `USE_REAL_FUNCTIONS=1`)。
  - 由於測試會嘗試讀取/寫 `playwright_token.txt`，確保 emulator 與前端是用相同 host/port。

Emulator 與通訊
- `firebase.json` 定義 emulator 端口（重要）：
  - Auth: `9099`
  - Functions: `5002`
  - Firestore: `8081`
  若 emulator 無法啟動，常見原因是上述端口已被其他 process 使用（參考 `.firebase_start.log`）。
- 測試/代理細節：`scripts/playwright_e2e.js` 會攔截並將請求 header 中的 `authorization` 寫入 `playwright_token.txt`，`scripts/run_callable_test.js` 會讀此檔並直接呼叫 emulator 上的 callable URL（方便重現 `onCall` 行為）。

Functions（重要實作細節）
- 檔案：`functions/src/registrations.ts`，編譯輸出在 `functions/lib/...`。
- 本專案使用 Firebase Functions 的 v1 相容層：請注意 `import * as functions from 'firebase-functions/v1'`，這會使 `onCall` handler 在 emulator 中得到 legacy-style `context.auth` 注入（專案中大量 code 依賴此行為）。
- 函數除錯：該檔內已有 `debugContext(context, label)` 之幫助函式，可列印 `context` 與 `rawRequest` 以診斷授權/headers/body 的實際內容；若遇到 401 / context.auth 為 null，先檢查是否使用 v1 相容 import 以及 emulator token 是否正確轉送。

專案慣例與注意事項
- monorepo workspace：root `package.json` 使用 npm workspaces（`client`, `functions`, `shared`）。變更任何子專案後，請用 workspace build 指令或在子專案內個別執行編譯。
- `shared` 以 package 形式被 `client` 與 `functions` 依賴（注意版本與本地 link）。
- Functions 編譯輸出會直接被 emulator 載入，請勿只改 `lib/` 而不編譯 `src/` 的變更；反之亦可直接修改 `lib/` 臨時測試，但長期請同步 `src/`。

常見工作流程範例
- 本機調試 callable（快速重現）：
  1. `npm run build:functions`（或 `cd functions && npm run build`）
  2. 啟動 emulator：`firebase emulators:start --only auth,functions,firestore` 或 `cd functions && npm run serve`
  3. 由瀏覽器 E2E 取得 token：`node scripts/playwright_e2e.js --use-real`（會產出 `playwright_token.txt`）
  4. 使用 token 重現 callable：`node scripts/run_callable_test.js`

可直接查閱的關鍵檔案（參考）
- `firebase.json` — emulator 端口與 predeploy
- `functions/src/registrations.ts` — callable handlers、`debugContext()` 與 `firebase-functions/v1` 的使用
- `functions/package.json` — build / serve / test 指令
- `client/package.json` — dev/build 與 dev server (`vite`) 指令
- `scripts/playwright_e2e.js` — E2E 流程、mock 與 proxy 實作（如何擷取 token 與轉發 Authorization）
- `scripts/run_callable_test.js` — 以 `playwright_token.txt` 呼叫 functions emulator，常用於快速復現 401/403 問題

如果要我幫忙
- 我可以：
  - 直接建立/更新此檔（我已新增在 repo 根目錄的 `.github/copilot-instructions.md`）。
  - 幫你將 `functions` 轉成 v2 API（若要移除 v1 相容層），或反向將代碼改回 v1 相容範式。
  - 執行一次完整 Playwright E2E（browser → emulator）並回傳關鍵 log。

請回饋哪些段落還不夠清楚或你想補充的專案內部慣例，我會依你的回覆調整。
