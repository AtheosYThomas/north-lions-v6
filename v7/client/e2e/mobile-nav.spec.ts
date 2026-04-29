/**
 * 請用專案內同一套 Playwright 執行（例如 `cd v7 && npm run test:e2e -w client`），
 * 勿使用 `npx @playwright/test@舊版 test`，否則易與 workspace 的 @playwright/test 版本衝突而報錯。
 *
 * Admin 登入依賴 Callable `adminLogin`（與 v7/functions/src/auth.ts 一致）。
 * 本機 DEV 會連 Functions Emulator（127.0.0.1:5003），請先啟動：
 *   firebase emulators:start --only auth,functions,firestore
 * 帳密可改環境變數：E2E_ADMIN_ACCOUNT、E2E_ADMIN_PASSWORD
 */
import { test, expect } from '@playwright/test';

const E2E_ADMIN_ACCOUNT = process.env.E2E_ADMIN_ACCOUNT ?? 'ADMIN';
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

if (!E2E_ADMIN_PASSWORD) {
  throw new Error('[mobile-nav.spec] Missing required env var: E2E_ADMIN_PASSWORD');
}

/** 等待 Firebase Auth 首次回調完成、主畫面（漢堡鈕）出現 */
async function waitForAppShell(page: import('@playwright/test').Page) {
  await page.goto('/');
  const toggle = page.getByTestId('mobile-menu-toggle');
  await toggle.waitFor({ state: 'visible', timeout: 60_000 });
}

/** 從登入頁走「管理員登入」通道（Callable adminLogin + Custom Token） */
async function loginAdminFromLoginPage(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByPlaceholder('系統帳號').waitFor({ state: 'visible', timeout: 60_000 });
  await page.getByPlaceholder('系統帳號').fill(E2E_ADMIN_ACCOUNT);
  await page.getByPlaceholder('系統密碼').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: '管理員登入' }).click();

  // 登入成功會導向首頁並卸載 LoginView，「系統帳號」輸入框應消失（不可只靠 URL：首頁 URL 也不含 /login）。
  try {
    await expect(page.getByPlaceholder('系統帳號')).toBeHidden({ timeout: 45_000 });
  } catch {
    if (await page.getByText('登入失敗').isVisible().catch(() => false)) {
      throw new Error(
        'Admin 登入被拒絕。請確認 Functions Emulator 已啟動（127.0.0.1:5003）且 adminLogin 可用；' +
          '或設定 E2E_ADMIN_ACCOUNT / E2E_ADMIN_PASSWORD。'
      );
    }
    throw new Error(
      '登入逾時。請確認 Auth Emulator（9099）、Functions（5003）、Firestore（8081）已啟動，' +
        '且 client 的 .env 已設定 VITE_FIREBASE_*（DEV 會連 emulator）。'
    );
  }

  await page.getByTestId('mobile-menu-toggle').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByTestId('mobile-menu-toggle').click();
  const panel = page.getByTestId('mobile-nav-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('link', { name: /登入/ })).toHaveCount(0);
  await page.locator('main').click({ position: { x: 20, y: 20 } });
  await expect(panel).toBeHidden();
}

async function openMobileMenu(page: import('@playwright/test').Page) {
  await page.getByTestId('mobile-menu-toggle').click();
  await expect(page.getByTestId('mobile-nav-panel')).toBeVisible();
}

async function logoutFromMobileMenuIfPossible(page: import('@playwright/test').Page) {
  await page.goto('/');
  await waitForAppShell(page);
  await page.getByTestId('mobile-menu-toggle').click();
  const logoutBtn = page.getByRole('button', { name: /登出/ });
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await page.getByPlaceholder('系統帳號').waitFor({ state: 'visible', timeout: 30_000 });
  } else {
    await page.locator('main').click({ position: { x: 20, y: 20 } });
  }
}

test.describe('手機版導覽列 (Mobile nav)', () => {
  test('[情境 A] 漢堡選單展開、面板顯示、點擊 main 外區收合', async ({ page }) => {
    await waitForAppShell(page);

    await expect(page.getByTestId('desktop-nav')).toBeHidden();

    await page.getByTestId('mobile-menu-toggle').click();

    const panel = page.getByTestId('mobile-nav-panel');
    await expect(panel).toBeVisible();

    await expect(panel.getByRole('link', { name: /首頁/ })).toBeVisible();
    await expect(panel.getByTestId('mobile-nav-authenticated-links')).toHaveCount(0);

    await page.locator('main').click({ position: { x: 20, y: 20 } });

    await expect(panel).toBeHidden();
  });

  test('[情境 A-2] 漢堡鈕可再次切換收合', async ({ page }) => {
    await waitForAppShell(page);

    const toggle = page.getByTestId('mobile-menu-toggle');
    const panel = page.getByTestId('mobile-nav-panel');

    await toggle.click();
    await expect(panel).toBeVisible();

    await toggle.click();
    await expect(panel).toBeHidden();
  });

  test('[情境 B] 未登入：手機選單內可見「登入」', async ({ page }) => {
    await waitForAppShell(page);

    await page.getByTestId('mobile-menu-toggle').click();
    const panel = page.getByTestId('mobile-nav-panel');
    await expect(panel).toBeVisible();

    await expect(panel.getByRole('link', { name: /登入/ })).toBeVisible();

    await page.getByTestId('mobile-menu-toggle').click();
    await expect(panel).toBeHidden();
  });
});

test.describe('Admin 視角測試', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await logoutFromMobileMenuIfPossible(page);
    await loginAdminFromLoginPage(page);
    await waitForAppShell(page);
  });

  test('手機選單：mobileAuthNavItems 與管理後台連結', async ({ page }) => {
    await openMobileMenu(page);
    const panel = page.getByTestId('mobile-nav-panel');

    await expect(panel.getByTestId('mobile-nav-authenticated-links')).toHaveCount(1);
    await expect(panel.getByRole('link', { name: /捐款與繳費明細/ })).toBeVisible();
    await expect(panel.getByRole('link', { name: /個人設定/ })).toBeVisible();
    await expect(panel.getByRole('link', { name: /會員名冊/ })).toBeVisible();

    const adminLink = panel.getByRole('link', { name: /管理後台/ });
    await expect(adminLink).toBeVisible();
    const href = await adminLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toContain('refresh=1');
    expect(href!.includes('/admin/') || href!.includes('north-lions-v6-admin')).toBeTruthy();
  });

  test('[情境 B-optional] 登入後手機選單顯示「登出」', async ({ page }) => {
    await openMobileMenu(page);
    const panel = page.getByTestId('mobile-nav-panel');
    await expect(panel.getByRole('button', { name: /登出/ })).toBeVisible();
  });
});
