const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Collect all API calls
  const apiCalls = [];
  page.on('request', req => {
    if (req.url().includes('/api/') || req.url().includes('/auth/')) {
      apiCalls.push(`${req.method()} ${req.url()}`);
    }
  });

  console.log('1. Opening HA...');
  await page.goto('http://localhost:8123', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  
  let pageTitle = await page.title();
  console.log(`   Title: ${pageTitle}`);

  // Check if we're on login page or dashboard
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log(`   Body: ${bodyText.substring(0, 200)}`);

  // Try to find login form
  const hasUsername = await page.evaluate(() => {
    return !!document.querySelector('input[name="username"], input#username, ha-auth-flow');
  });
  console.log(`   Has login form: ${hasUsername}`);

  if (hasUsername) {
    console.log('2. Logging in...');
    // Fill login form - HA uses various selectors
    try { await page.fill('input[name="username"]', 'admin'); } catch(e) {}
    try { await page.fill('input#username', 'admin'); } catch(e) {}
    try { await page.fill('input[name="password"]', 'admin123'); } catch(e) {}
    try { await page.fill('input#password', 'admin123'); } catch(e) {}
    
    // Click login button
    for (const sel of ['button[type="submit"]', 'mwc-button', 'ha-button', 'button:has-text("Log")', 'button:has-text("LOG")']) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          console.log(`   Clicked: ${sel}`);
          break;
        }
      } catch(e) {}
    }
    
    await page.waitForTimeout(5000);
  }

  // Check if we're now on the dashboard
  const token = await page.evaluate(() => {
    const raw = localStorage.getItem('hassTokens');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch(e) { return null; }
  });

  if (token && token.access_token) {
    console.log(`✓ Token: ${token.access_token.substring(0, 20)}...`);
    fs.writeFileSync('/tmp/ha-token.txt', token.access_token);
  } else {
    console.log('✗ No token. Trying profile page...');
    await page.goto('http://localhost:8123/profile', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/ha-login-debug.png' });
    
    // Check body
    const body = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`   Profile page: ${body.substring(0, 200)}`);
  }

  // Save API calls for debugging
  fs.writeFileSync('/tmp/ha-api-calls.txt', apiCalls.join('\n'));
  
  await browser.close();
})();
