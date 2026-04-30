/**
 * ============================================================
 * 🛡️ Firestore 資安攻防測試腳本 (V7 北大獅子會)
 * ============================================================
 * 執行方式：
 *   1. 啟動 Emulator: firebase emulators:start --only firestore --project demo-project
 *   2. 執行測試:      npx mocha tests/firestore.rules.test.js --timeout 10000
 * ============================================================
 */

const { assertFails, assertSucceeds, initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');
const { expect } = require('chai');
const path = require('path');

const PROJECT_ID = 'demo-project';

// ── 測試身分定義 ────────────────────────────────────────────
const ADMIN_UID        = 'uid-admin';
const OFFICIAL_UID     = 'uid-official';
const OFFICIAL_UID_B   = 'uid-official-b';   // 第二位正式會員，用於越權測試
const PENDING_UID      = 'uid-pending';
const TREASURER_UID    = 'uid-treasurer';    // 職稱含「財務」— 與前端 isAdmin 職稱規則對齊
const MANAGER_UID      = 'uid-manager';    // organization.title 含「總管」
const ISADMIN_UID      = 'uid-isadmin-flag'; // 僅 isAdmin: true
const EMAIL_ADMIN_UID  = 'uid-email-admin';  // token.email 僅供測試「不應再被當作 admin 後門」
// 匿名路人不需要 UID

describe('🛡️ Firestore Security Rules 攻防測試', () => {
  let testEnv;

  // ── 測試環境初始化 ──────────────────────────────────────
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8'),
        host: '127.0.0.1',
        port: 8081
      }
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  // ── 每次測試前重置 Firestore 狀態 ─────────────────────
  beforeEach(async () => {
    await testEnv.clearFirestore();

    // 用繞過規則的 Admin 權限寫入初始測試資料
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();

      // 管理員 (system.role = 'Admin')
      await db.collection('members').doc(ADMIN_UID).set({
        name: '管理員測試',
        status: { membershipType: '正會員' },
        system: { role: 'Admin' },
        role: 'admin'
      });

      // 正式會員 A
      await db.collection('members').doc(OFFICIAL_UID).set({
        name: '正式獅友A',
        status: { membershipType: '正會員' },
        system: { role: 'member' }
      });

      // 正式會員 B
      await db.collection('members').doc(OFFICIAL_UID_B).set({
        name: '正式獅友B',
        status: { membershipType: '正會員' },
        system: { role: 'member' }
      });

      // 潛在會員
      await db.collection('members').doc(PENDING_UID).set({
        name: '潛在獅友',
        status: { membershipType: '潛在' },
        system: { role: 'member' }
      });

      // 財務幹事（僅職稱符合 isOfficer / 前端 isAdmin）
      await db.collection('members').doc(TREASURER_UID).set({
        name: '財務幹事',
        position: '財務組長',
        status: { membershipType: '正會員' },
        system: { role: 'Member' }
      });

      await db.collection('members').doc(MANAGER_UID).set({
        name: '活動總管',
        organization: { role: 'Member', title: '活動總管' },
        status: { membershipType: '正會員' },
        system: { role: 'Member' }
      });

      await db.collection('members').doc(ISADMIN_UID).set({
        name: '指定管理員',
        isAdmin: true,
        organization: { role: '', title: '' },
        status: { membershipType: '正會員' },
        system: { role: 'Member' }
      });

      // 僅有 email，不具備 members admin role / isAdmin / custom claim
      await db.collection('members').doc(EMAIL_ADMIN_UID).set({
        name: '信箱管理員',
        status: { membershipType: '正會員' },
        system: { role: 'Member' }
      });

      // 預建一筆正式會員 A 的捐款紀錄
      await db.collection('donations').doc('donation-official-a').set({
        memberId: OFFICIAL_UID,
        amount: 2000,
        category: '常年會費',
        audit: { status: 'approved' }
      });

      // 預建一筆正式會員 B 的捐款紀錄
      await db.collection('donations').doc('donation-official-b').set({
        memberId: OFFICIAL_UID_B,
        amount: 2000,
        category: '常年會費',
        audit: { status: 'approved' }
      });

      // 預建一筆公告
      await db.collection('announcements').doc('ann-1').set({
        title: '測試公告',
        content: 'Hello Lions'
      });

      await db.collection('message_logs').doc('log-1').set({
        lineUserId: 'line-test',
        text: '測試訊息',
        role: 'user',
        category: 'general'
      });
    });
  });

  // ================================================================
  // 🔴 防線 A：未登入的匿名路人 (Unauthenticated)
  // ================================================================
  describe('🔴 防線 A：匿名路人攻擊測試', () => {

    it('[A-1] 匿名路人讀取 /members → 必須被阻擋', async () => {
      const anonymous = testEnv.unauthenticatedContext();
      await assertFails(
        anonymous.firestore().collection('members').doc(OFFICIAL_UID).get()
      );
    });

    it('[A-2] 匿名路人列舉 /members 全集合 → 必須被阻擋', async () => {
      const anonymous = testEnv.unauthenticatedContext();
      await assertFails(
        anonymous.firestore().collection('members').get()
      );
    });

    it('[A-3] 匿名路人讀取 /donations → 必須被阻擋', async () => {
      const anonymous = testEnv.unauthenticatedContext();
      await assertFails(
        anonymous.firestore().collection('donations').doc('donation-official-a').get()
      );
    });

    it('[A-4] 匿名路人寫入 /donations → 必須被阻擋', async () => {
      const anonymous = testEnv.unauthenticatedContext();
      await assertFails(
        anonymous.firestore().collection('donations').add({
          memberId: OFFICIAL_UID,
          amount: 9999,
          category: '假資料駭客攻擊'
        })
      );
    });

    it('[A-5] 匿名路人讀取 /billing_records → 必須被阻擋', async () => {
      const anonymous = testEnv.unauthenticatedContext();
      await assertFails(
        anonymous.firestore().collection('billing_records').get()
      );
    });

    it('[A-6] 匿名路人讀取 /announcements → 必須被阻擋 (需登入)', async () => {
      // 根據規則：announcements 需要 isAuthenticated()
      const anonymous = testEnv.unauthenticatedContext();
      await assertFails(
        anonymous.firestore().collection('announcements').doc('ann-1').get()
      );
    });
  });

  // ================================================================
  // 🟡 防線 B：待審核的潛在會員 (Pending)
  // ================================================================
  describe('🟡 防線 B：潛在會員越權攻擊測試', () => {

    it('[B-1] 潛在會員讀取全體 /members → 必須被阻擋', async () => {
      // 潛在會員不是 isOfficialMember()，也不是 isOfficer()，只能讀自己
      const pending = testEnv.authenticatedContext(PENDING_UID);
      // 嘗試讀取別人的 member doc
      await assertFails(
        pending.firestore().collection('members').doc(OFFICIAL_UID).get()
      );
    });

    it('[B-2] 潛在會員讀取自己的 /members doc → 必須放行', async () => {
      const pending = testEnv.authenticatedContext(PENDING_UID);
      await assertSucceeds(
        pending.firestore().collection('members').doc(PENDING_UID).get()
      );
    });

    it('[B-3] 潛在會員建立一筆指向他人的 /donations → 必須被阻擋', async () => {
      const pending = testEnv.authenticatedContext(PENDING_UID);
      await assertFails(
        pending.firestore().collection('donations').add({
          memberId: OFFICIAL_UID,
          amount: 9999,
          category: '潛在會員偽造捐款'
        })
      );
    });

    it('[B-4] 潛在會員嘗試讀取 /donations (任何一筆) → 必須被阻擋', async () => {
      // donations 規則要求 isOfficer() 或 resource.data.memberId == request.auth.uid
      // 潛在會員不是 officer，且此筆捐款屬於 OFFICIAL_UID
      const pending = testEnv.authenticatedContext(PENDING_UID);
      await assertFails(
        pending.firestore().collection('donations').doc('donation-official-a').get()
      );
    });

    it('[B-5] 潛在會員更新他人 /members → 必須被阻擋', async () => {
      const pending = testEnv.authenticatedContext(PENDING_UID);
      await assertFails(
        pending.firestore().collection('members').doc(OFFICIAL_UID).update({ name: '被駭客改了' })
      );
    });
  });

  // ================================================================
  // 🟢 防線 C：一般正式獅友 (Official Member)
  // ================================================================
  describe('🟢 防線 C：正式會員合法操作與越權阻擋測試', () => {

    it('[C-1] 正式會員讀取自己的 /donations → 必須放行', async () => {
      const official = testEnv.authenticatedContext(OFFICIAL_UID);
      await assertSucceeds(
        official.firestore().collection('donations').doc('donation-official-a').get()
      );
    });

    it('[C-2] 正式會員讀取他人的 /donations → 必須被阻擋', async () => {
      const official = testEnv.authenticatedContext(OFFICIAL_UID);
      // donation-official-b 的 memberId = OFFICIAL_UID_B，不是自己
      await assertFails(
        official.firestore().collection('donations').doc('donation-official-b').get()
      );
    });

    it('[C-3] 正式會員讀取他人的 /members doc → 必須放行 (isOfficialMember 有權讀全會名冊)', async () => {
      // 根據規則：isOfficialMember() 可以讀取 /members
      const official = testEnv.authenticatedContext(OFFICIAL_UID);
      await assertSucceeds(
        official.firestore().collection('members').doc(OFFICIAL_UID_B).get()
      );
    });

    it('[C-4] 正式會員寫入一筆 /donations → 必須被阻擋 (只有 Officer 能寫)', async () => {
      const official = testEnv.authenticatedContext(OFFICIAL_UID);
      await assertFails(
        official.firestore().collection('donations').add({
          memberId: OFFICIAL_UID,
          amount: 500,
          category: '越權自建紀錄'
        })
      );
    });

    it('[C-5] 正式會員刪除他人的 /donations → 必須被阻擋', async () => {
      const official = testEnv.authenticatedContext(OFFICIAL_UID);
      await assertFails(
        official.firestore().collection('donations').doc('donation-official-b').delete()
      );
    });

    it('[C-6] 正式會員建立 /announcements → 必須被阻擋 (只有 Officer 能寫)', async () => {
      const official = testEnv.authenticatedContext(OFFICIAL_UID);
      await assertFails(
        official.firestore().collection('announcements').add({
          title: '我自己寫的假公告'
        })
      );
    });

    it('[C-7] 正式會員讀取 /announcements → 必須放行', async () => {
      const official = testEnv.authenticatedContext(OFFICIAL_UID);
      await assertSucceeds(
        official.firestore().collection('announcements').doc('ann-1').get()
      );
    });
  });

  // ================================================================
  // 🔵 防線 D：系統管理員 / Admin
  // ================================================================
  describe('🔵 防線 D：管理員合法操作全開放測試', () => {

    it('[D-1] 管理員讀取全會 /donations → 必須放行', async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(
        admin.firestore().collection('donations').doc('donation-official-a').get()
      );
    });

    it('[D-2] 管理員讀取他人 /donations → 必須放行', async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(
        admin.firestore().collection('donations').doc('donation-official-b').get()
      );
    });

    it('[D-3] 管理員建立一筆 /donations → 必須放行', async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(
        admin.firestore().collection('donations').add({
          memberId: OFFICIAL_UID,
          amount: 3000,
          category: '常年會費',
          audit: { status: 'approved' }
        })
      );
    });

    it('[D-4] 管理員刪除任何 /donations → 必須放行', async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(
        admin.firestore().collection('donations').doc('donation-official-a').delete()
      );
    });

    it('[D-5] 管理員更新任何會員的 /members → 必須放行', async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(
        admin.firestore().collection('members').doc(OFFICIAL_UID).update({
          name: '管理員修改後的名字'
        })
      );
    });

    it('[D-6] 管理員讀取任何 /members → 必須放行', async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(
        admin.firestore().collection('members').doc(PENDING_UID).get()
      );
    });

    it('[D-7] 管理員讀取 /billing_records → 必須放行', async () => {
      // 先用 admin 寫入一筆 billing record
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('billing_records').doc('br-1').set({
          memberId: OFFICIAL_UID,
          billing: { expectedAmount: 5000 },
          status: { status: 'pending' }
        });
      });

      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(
        admin.firestore().collection('billing_records').doc('br-1').get()
      );
    });

    it('[D-8] 管理員讀取 /announcements → 必須放行', async () => {
      const admin = testEnv.authenticatedContext(ADMIN_UID);
      await assertSucceeds(
        admin.firestore().collection('announcements').doc('ann-1').get()
      );
    });

    it('[D-9] 職稱含「財務」之會員寫入 /donations → 必須放行（與前端 isAdmin 同步）', async () => {
      const treasurer = testEnv.authenticatedContext(TREASURER_UID);
      await assertSucceeds(
        treasurer.firestore().collection('donations').add({
          memberId: OFFICIAL_UID,
          amount: 1000,
          category: '常年會費',
          audit: { status: 'approved' }
        })
      );
    });

    it('[D-10] dev-admin uid 無 members 文件仍寫入 /announcements → 必須被阻擋（已移除後門）', async () => {
      const dev = testEnv.authenticatedContext('dev-admin');
      await assertFails(
        dev.firestore().collection('announcements').add({ title: 'dev seed', content: 'x' })
      );
    });

    it('[D-11] token.email 為 admin@example.com 寫入 /donations → 必須被阻擋（已移除後門）', async () => {
      const ctx = testEnv.authenticatedContext(EMAIL_ADMIN_UID, { email: 'admin@example.com' });
      await assertFails(
        ctx.firestore().collection('donations').add({
          memberId: OFFICIAL_UID,
          amount: 500,
          category: '常年會費',
          audit: { status: 'approved' }
        })
      );
    });

    it('[D-12] 職稱含「總管」讀取 /message_logs → 必須放行', async () => {
      const ctx = testEnv.authenticatedContext(MANAGER_UID);
      await assertSucceeds(
        ctx.firestore().collection('message_logs').doc('log-1').get()
      );
    });

    it('[D-13] isAdmin 標記會員讀取 /message_logs → 必須放行', async () => {
      const ctx = testEnv.authenticatedContext(ISADMIN_UID);
      await assertSucceeds(
        ctx.firestore().collection('message_logs').doc('log-1').get()
      );
    });

    it('[D-14] 一般正式會員讀取 /message_logs → 必須被阻擋', async () => {
      const ctx = testEnv.authenticatedContext(OFFICIAL_UID);
      await assertFails(
        ctx.firestore().collection('message_logs').doc('log-1').get()
      );
    });

    it('[D-15] 財務幹部建立 /admin_audit_logs（operatorUid 為本人）→ 必須放行', async () => {
      const ctx = testEnv.authenticatedContext(TREASURER_UID);
      await assertSucceeds(
        ctx.firestore().collection('admin_audit_logs').add({
          operatorUid: TREASURER_UID,
          action: 'TEST_AUDIT_CREATE',
          timestamp: new Date()
        })
      );
    });

    it('[D-16] 財務幹部更新 /admin_audit_logs → 必須被阻擋', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().collection('admin_audit_logs').doc('audit-fixed').set({
          operatorUid: TREASURER_UID,
          action: 'SEED',
          timestamp: new Date()
        });
      });
      const ctx = testEnv.authenticatedContext(TREASURER_UID);
      await assertFails(
        ctx.firestore().collection('admin_audit_logs').doc('audit-fixed').update({ action: 'TAMPER' })
      );
    });

    it('[D-17] 一般正式會員建立 /admin_audit_logs → 必須被阻擋', async () => {
      const ctx = testEnv.authenticatedContext(OFFICIAL_UID);
      await assertFails(
        ctx.firestore().collection('admin_audit_logs').add({
          operatorUid: OFFICIAL_UID,
          action: 'FAKE_AUDIT_BY_MEMBER',
          timestamp: new Date()
        })
      );
    });
  });
});
