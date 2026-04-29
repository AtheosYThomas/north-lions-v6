/**
 * Production smoke: 系統管理員登入（Callable adminLogin），與 client e2e 相同環境變數。
 * Run: cd v7 && node scripts/smoke_admin_system_login.mjs
 *
 * 帳密預設與 `v7/client/e2e/mobile-nav.spec.ts` 一致；生產環境建議改由環境變數覆寫。
 */
import { chromium } from '@playwright/test';

const baseUrl = process.env.ADMIN_BASE_URL || 'https://north-lions-v6-admin.web.app';
const loginPath = process.env.ADMIN_LOGIN_PATH || '/login';
const url = `${baseUrl.replace(/\/$/, '')}${loginPath.startsWith('/') ? '' : '/'}${loginPath}`;

const account = process.env.E2E_ADMIN_ACCOUNT ?? 'ADMIN';
const password = process.env.E2E_ADMIN_PASSWORD;

if (!password) {
  console.error('[smoke_admin_system_login] Missing env var: E2E_ADMIN_PASSWORD');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

const result = { url, ok: false, step: 'start', pageErrors, consoleErrors: consoleErrors.slice(0, 10) };

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
  result.step = 'after_goto';

  await page.locator('input[placeholder*="系統帳號"]').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('input[placeholder*="系統帳號"]').first().fill(account);
  await page.locator('input[placeholder*="系統密碼"]').first().fill(password);
  result.step = 'filled_form';

  await page.getByRole('button', { name: '系統管理員登入' }).click();
  result.step = 'clicked_login';

  await page.getByRole('link', { name: '儀表板' }).waitFor({ state: 'visible', timeout: 60_000 });
  result.step = 'dashboard_visible';

  const errBox = page.locator('[class*="bg-red-50"]').filter({ hasText: /失敗|錯誤/ });
  if (await errBox.isVisible().catch(() => false)) {
    result.errorBanner = await errBox.first().innerText().catch(() => '');
    throw new Error('login_error_banner_visible');
  }

  result.ok = true;
  result.finalUrl = page.url();
  result.bodyHasAdminShell = (await page.locator('body').innerText()).includes('LIONS');
} catch (e) {
  result.error = String(e?.message || e);
  result.finalUrl = page.url();
}

await browser.close();
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
