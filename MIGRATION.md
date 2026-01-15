# 資料遷移指引 (Data Migration Guide)

## 1. 目的
本文件定義將外部資料（如 Excel、CSV 或舊版系統）遷移至「北大獅子會會員服務系統 V6.0」Firestore 資料庫的標準作業程序，確保資料完整性、格式正確性及系統安全性。

## 2. 遷移前置作業

### 2.1 資料清洗 (Data Cleaning)
在執行任何腳本前，原始資料必須符合以下格式規範：

*   **手機號碼**：統一轉換為字串格式，移除空格或連字號（例如：`0912345678`）。
*   **日期格式**：所有日期（入會日期、出生年月日）應轉換為 ISO 8601 格式或 Firebase Timestamp。
*   **角色定義**：確保職務欄位符合 `DESIGN.md` 定義的列舉值（如：會長、秘書、財務）。

### 2.2 環境準備
*   **權限**：執行遷移腳本的帳號必須具備 Firebase Admin SDK 存取權限。
*   **備份**：遷移前必須執行一次 Firestore 完整導出。

## 3. 遷移工具與腳本
系統提供以下現成腳本進行資料初始化與遷移：

*   `scripts/seed_data.js`：用於產生測試環境的標準化基礎資料。
*   `scripts/set_publish_and_admin.js`：用於手動指定特定會員為系統管理員（Admin）。
*   `scripts/check_seed.js`：遷移後用於驗證資料是否存在且格式正確。

## 4. 標準遷移流程

### 第一階段：小規模測試
1.  使用 Firebase Emulator Suite 啟動本地模擬器。
2.  修改遷移腳本，僅導入 3-5 筆測試資料。
3.  執行測試：`node scripts/migration_test.js`。
4.  檢查前端頁面是否能正確解析該資料。

### 第二階段：正式環境導入
1.  確保已設定正確的 Firebase Project ID (`north-lions-v6-a7757`)。
2.  執行批次寫入腳本。
    *   *注意：Firestore 批次寫入上限為 500 筆資料，若會員人數過多，腳本應實作分段處理。*

### 第三階段：權限關聯
1.  資料導入後，執行 `scripts/set_publish_and_admin.js` 以啟用管理員帳號。
2.  邀請會員透過 LINE 登入，系統將自動依據 `lineUserId` 或 `mobile` 進行帳號綁定。

## 5. 異常處理與回滾 (Rollback)
*   **資料錯誤**：若導入後發現大規模格式錯誤，應立即使用 `firebase firestore:delete` 清除受影響的集合，或回復備份檔。
*   **重複資料**：系統以 `memberId` 或 `mobile` 作為唯一識別，遷移腳本應包含「存在即更新 (Upsert)」的邏輯，避免重複建立帳號。

## 6. 安全性規範
*   **個資去識別化**：遷移過程中的暫存檔（如 `temp.json`）嚴禁提交至 Git 儲存庫。
*   **連線加密**：僅允許在受保護的開發環境下執行 Admin SDK 腳本。
