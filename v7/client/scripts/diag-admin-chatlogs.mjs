import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const ADMIN_LOGIN_URL = process.env.ADMIN_LOGIN_URL || 'https://north-lions-v6-admin.web.app/login';
const ADMIN_ACCOUNT = process.env.ADMIN_ACCOUNT || 'ADMIN';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const WAIT_MS = Number(process.env.DIAG_WAIT_MS || '3000');

if (!ADMIN_PASSWORD) {
  console.error('[diag-admin-chatlogs] Missing ADMIN_PASSWORD env var.');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(process.cwd(), 'playwright-report', `diag-admin-chatlogs-${stamp}`);
await fs.mkdir(outDir, { recursive: true });

const result = {
  startedAt: new Date().toISOString(),
  config: {
    ADMIN_LOGIN_URL,
    ADMIN_ACCOUNT,
    WAIT_MS
  },
  steps: [],
  events: []
};

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

page.on('console', (msg) => {
  result.events.push({
    kind: 'console',
    type: msg.type(),
    text: msg.text()
  });
});

page.on('pageerror', (err) => {
  result.events.push({
    kind: 'pageerror',
    text: err.message
  });
});

page.on('requestfailed', (req) => {
  result.events.push({
    kind: 'requestfailed',
    url: req.url(),
    method: req.method(),
    failure: req.failure()?.errorText || 'unknown'
  });
});

async function snapshot(label) {
  const body = await page.locator('body').innerText().catch(() => '');
  const file = path.join(outDir, `${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  result.steps.push({
    label,
    url: page.url(),
    title: await page.title().catch(() => ''),
    bodySnippet: body.slice(0, 600),
    screenshot: file
  });
}

try {
  await page.goto(ADMIN_LOGIN_URL, { waitUntil: 'networkidle' });
  await snapshot('01-login-page');

  await page.fill('input[placeholder*=系統帳號], input[placeholder*=ADMIN]', ADMIN_ACCOUNT);
  await page.fill('input[placeholder*=系統密碼]', ADMIN_PASSWORD);
  await page.getByRole('button', { name: '系統管理員登入' }).click();
  await page.waitForTimeout(WAIT_MS);
  await page.waitForLoadState('networkidle').catch(() => {});
  await snapshot('02-after-login');

  const chatLink = page.getByRole('link', { name: '會員對話紀錄' });
  if (await chatLink.count()) {
    await chatLink.click();
    await page.waitForTimeout(WAIT_MS);
    await page.waitForLoadState('networkidle').catch(() => {});
    await snapshot('03-after-chatlogs-click');
  } else {
    result.events.push({
      kind: 'warn',
      text: 'Chat logs link not found after login.'
    });
  }
} finally {
  result.finishedAt = new Date().toISOString();
  const reportPath = path.join(outDir, 'result.json');
  await fs.writeFile(reportPath, JSON.stringify(result, null, 2), 'utf8');
  await browser.close();
  console.log(`[diag-admin-chatlogs] Report: ${reportPath}`);
}
