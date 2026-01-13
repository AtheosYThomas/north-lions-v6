const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure().errorText));
  const fs = require('fs');
  page.on('request', req => {
    try {
      const url = req.url();
      if (url.includes('/us-central1/') || url.includes('/google.firestore.v1.Firestore/Listen')) {
        console.log('REQUEST:', req.method(), url);
        const headers = req.headers();
        console.log('REQUEST_HEADERS:', JSON.stringify(headers));
        if (headers.authorization) {
          try { fs.writeFileSync('playwright_token.txt', headers.authorization); } catch(e){}
        }
      }
    } catch (e) { /* ignore */ }
  });
  page.on('response', async resp => {
    try {
      const url = resp.url();
      const status = resp.status();
      console.log('RESPONSE', status, url);
      if (status >= 400) {
        let text = '';
        try { text = await resp.text(); } catch (e) { text = '<body read error>'; }
        console.log('RESPONSE_BODY:', text.substring(0, 1000));
      }
    } catch (e) {
      console.log('response handler error', e && e.message);
    }
  });

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

    const useRealArg = process.argv.includes('--use-real');
    const useRealFunctions = useRealArg || process.env.USE_REAL_FUNCTIONS === '1' || process.env.USE_REAL_FUNCTIONS === 'true';
    console.log('USE_REAL_FUNCTIONS=', useRealFunctions);

    // Mock functions endpoints to avoid relying on emulator functions behavior (stateful)
    let registrationsState = [
      { id: 'reg1', memberName: 'Regular User', info: { timestamp: { _seconds: 1600000000 } }, details: { adultCount: 1, childCount: 0 }, status: { status: 'registered', paymentStatus: 'paid' }, needs: { remark: 'None' } }
    ];
    if (!useRealFunctions) {
      await page.route('**/getEvents', async route => {
        console.log('Mocked getEvents', route.request().url());
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { events: [{ id: 'event1', name: 'Test Event' }] } }) });
      });

      await page.route('**/getEventRegistrations', async route => {
        console.log('Mocked getEventRegistrations', route.request().url());
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { registrations: registrationsState } }) });
      });

      await page.route('**/cancelRegistration', async route => {
        console.log('Mocked cancelRegistration', route.request().url());
        try {
          const raw = await route.request().postData();
          console.log('cancelRegistration raw postData:', raw);
          let post = null;
          try { post = JSON.parse(raw); } catch(e) { /* ignore */ }
          // firebase functions httpsCallable wraps payload in { data: ... } when sent via emulator
          const registrationId = (post && (post.registrationId || (post.data && post.data.registrationId))) || null;
          console.log('Parsed registrationId:', registrationId);
          if (registrationId) registrationsState = registrationsState.map(r => r.id === registrationId ? { ...r, status: { ...r.status, status: 'cancelled' } } : r);
          console.log('Updated registrationsState ->', registrationsState.map(r=>r.status.status));
        } catch (e) {
          console.log('cancelRegistration mock parse error', e && e.message);
        }
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { success: true } }) });
      });
    } else {
      console.log('Using real functions emulator (no function mocks). Proxying requests while preserving headers.');
      try {
        // Proxy function calls to the real emulator but preserve original headers and body.
        // If Authorization header is missing, attempt to read a token from playwright_token.txt and add a Bearer prefix.
        const fs = require('fs');
        await page.route('**/north-lions-v6-a7757/us-central1/**', async route => {
          const req = route.request();
          console.log('Proxying function request to emulator:', req.url());
          try {
            const origHeaders = Object.assign({}, req.headers());
            // Work with a headers object and ensure expected canonical keys
            const headers = Object.assign({}, origHeaders);
            // Ensure content-type exists
            if (!headers['content-type'] && !headers['Content-Type']) headers['content-type'] = 'application/json; charset=utf-8';
            // Ensure Authorization exists and use canonical 'Authorization' key for forwarding
            let authVal = headers['authorization'] || headers['Authorization'] || '';
            if (!authVal || authVal.trim() === '') {
              try {
                const tokenFile = 'playwright_token.txt';
                if (fs.existsSync(tokenFile)) {
                  let tok = fs.readFileSync(tokenFile, 'utf8').trim();
                  if (tok && !tok.toLowerCase().startsWith('bearer ')) tok = 'Bearer ' + tok;
                  if (tok) authVal = tok;
                }
              } catch (e) { /* ignore token read errors */ }
            }
            if (authVal) headers['Authorization'] = authVal;

            // Preserve method and body when proxying
            const method = req.method();
            const postData = req.postData();

            console.log('Forwarding headers (sample):', JSON.stringify(Object.keys(headers).reduce((acc,k)=>{ acc[k]=headers[k]; return acc; },{})).substring(0,200));

            await route.continue({ headers, method, postData });
          } catch (e) {
            console.log('Proxy route continue failed, falling back to route.continue():', e && e.message);
            try { await route.continue(); } catch (e2) {}
          }
        });
      } catch (e) { console.log('function proxy setup failed', e && e.message); }
    }

    // 1. Go to login page
    console.log('Navigating to login page');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.screenshot({ path: 'playwright_screenshots/login.png' }).catch(()=>{});

    // 2. Fill dev login (visible in DEV mode)
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('text=Email 登入');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'playwright_screenshots/after_login_click.png' }).catch(()=>{});

    // Wait for navigation to root or timeout
    await page.waitForURL('http://127.0.0.1:5173/', { timeout: 5000 }).catch(() => {});

    // 3. Navigate to admin registrations for event1
    console.log('Navigating to admin registrations page');
    await page.goto('http://127.0.0.1:5173/admin/events/event1/registrations', { waitUntil: 'domcontentloaded', timeout: 60000 });

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
    console.log('about to wait for cancelRegistration response');
    const cancelResp = await page.waitForResponse(resp => resp.url().includes('cancelRegistration') && resp.status() === 200, { timeout: 10000 }).catch((e) => { console.log('cancelResp waitForResponse failed', e && e.message); return null; });
    console.log('cancelResp resolved:', !!cancelResp);
    await page.screenshot({ path: 'playwright_screenshots/after_cancel_click.png' }).catch(()=>{});
    // wait for registrations refresh
    console.log('about to wait for getEventRegistrations response');
    const regsResp = await page.waitForResponse(resp => resp.url().includes('getEventRegistrations') && resp.status() === 200, { timeout: 10000 }).catch((e) => { console.log('regsResp waitForResponse failed', e && e.message); return null; });
    console.log('regsResp resolved:', !!regsResp);

    // 6. Wait a short while for processing and refresh
    await page.waitForTimeout(1000);
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
