const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure().errorText));

  // Ensure using emulator endpoints
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8081';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

  try {
    console.log('E2E start');
    // Intercept confirm dialogs
    page.on('dialog', async dialog => {
      console.log('Dialog message:', dialog.message());
      await dialog.accept();
    });

    // 1. Go to login page
    console.log('Navigating to login page');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.screenshot({ path: 'playwright_screenshots/login.png' }).catch(()=>{});

    // 2. Fill dev login (visible in DEV mode)
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('text=Email 登入');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'playwright_screenshots/after_login_click.png' }).catch(()=>{});

    // Wait for navigation to root or timeout
    await page.waitForURL('http://localhost:5173/', { timeout: 5000 }).catch(() => {});

    // 3. Navigate to admin registrations for event1
    console.log('Navigating to admin registrations page');
    await page.goto('http://localhost:5173/admin/events/event1/registrations', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 4. Wait for table to load
    await page.waitForSelector('table', { timeout: 15000 });
    await page.screenshot({ path: 'playwright_screenshots/registrations_table.png' }).catch(()=>{});

    // 5. Find first '取消' button and click
    const cancelButton = await page.$('text=取消');
    if (!cancelButton) {
      console.log('No cancel button found');
      await browser.close();
      process.exit(1);
    }

    await cancelButton.click();
    await page.screenshot({ path: 'playwright_screenshots/after_cancel_click.png' }).catch(()=>{});

    // 6. Wait a short while for processing and refresh
    await page.waitForTimeout(2000);
    console.log('Clicked cancel, waiting and checking status...');

    // 7. Check if any registration still has status 'registered'
    const content = await page.content();
    if (content.includes('cancelled') || !content.includes('registered')) {
      console.log('Cancellation appears successful');
    } else {
      console.log('Cancellation may have failed — page content status check');
    }
    console.log('E2E end');

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E error:', err);
    await browser.close();
    process.exit(1);
  }
})();
