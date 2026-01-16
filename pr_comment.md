## 🛡️ Self-Review Checklist (自我驗收)

### 1. 安全性與配置 (Security & Config)
- [ ] ⚠️ 確認 `e2e_auth_test.ps1` 與 `list_exports.js` 內無寫死的機敏資料 (Secrets/API Keys)。
- [ ] 確認 `.github` workflow 配置正確，不會意外觸發錯誤的部署流程。

### 2. 測試與驗證 (Testing)
- [ ] 本機執行 `npm run test` (或對應測試指令) 確認測試全數通過。
- [ ] Firebase Emulator 設定已更新，確認本地模擬環境可正常啟動。

### 3. 程式碼整潔 (Clean Code)
- [ ] 移除所有暫時性的 `console.log` 或 debug 用的 print 指令 (除非是用於必要的 CLI 輸出)。
- [ ] 確認新加入的 script 檔案命名符合專案規範。

這份清單同時作為自我驗收記錄，以便後續維護與審查。
