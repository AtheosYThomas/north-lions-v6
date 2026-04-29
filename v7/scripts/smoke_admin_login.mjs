/**
 * Smoke test: production admin login page (no secrets, no LINE OAuth completion).
 * Run: node scripts/smoke_admin_login.mjs
 */
import { chromium } from '@playwright/test';

const url = process.env.ADMIN_LOGIN_URL || 'https://north-lions-v6-admin.web.app/login';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const consoleMsgs = [];
const pageErrors = [];
const failedReqs = [];
const responses = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleMsgs.push(`[console.${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => {
  pageErrors.push(err.message);
});
page.on('requestfailed', (req) => {
  const f = req.failure()?.errorText || 'unknown';
  failedReqs.push({ url: req.url(), failure: f });
});
page.on('response', async (res) => {
  const u = res.url();
  if (!u.includes('north-lions-v6-admin.web.app')) return;
  if (!/\.(js|css)(\?|$)/i.test(u)) return;
  const ct = (await res.headerValue('content-type')) || '';
  responses.push({ url: u, status: res.status(), contentType: ct });
});

let exitCode = 0;
try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  const title = await page.title();
  const body = await page.locator('body').innerText();
  const hasLine = body.includes('LINE 登入');
  const hasEmail = body.includes('以 Email 登入');
  const hasSys = body.includes('系統管理員登入');
  const bootError = await page.locator('#admin-boot-error').count();

  const lineBtn = page.getByRole('button', { name: 'LINE 登入' });
  const lineDisabled = await lineBtn.isDisabled().catch(() => true);

  const badAssets = responses.filter(
    (r) => r.status >= 400 || /text\/html/i.test(r.contentType),
  );

  const out = {
    url: page.url(),
    title,
    checks: {
      hasLineButton: hasLine,
      hasEmailLogin: hasEmail,
      hasSysAdmin: hasSys,
      lineButtonDisabled: lineDisabled,
      bootErrorOverlay: bootError > 0,
    },
    bodySnippet: body.slice(0, 280).replace(/\r?\n/g, ' | '),
    pageErrors,
    consoleErrors: consoleMsgs.slice(0, 20),
    failedRequests: failedReqs.slice(0, 15),
    assetSample: responses.slice(0, 14),
    badAssetCount: badAssets.length,
  };

  console.log(JSON.stringify(out, null, 2));

  if (pageErrors.length) exitCode = 2;
  else if (consoleMsgs.length) exitCode = 3;
  else if (failedReqs.length) exitCode = 4;
  else if (!hasLine || !hasEmail || !hasSys) exitCode = 5;
  else if (lineDisabled) exitCode = 6;
  else if (bootError > 0) exitCode = 7;
  else if (badAssets.length) exitCode = 8;
} finally {
  await browser.close();
}

process.exit(exitCode);
