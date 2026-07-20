const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const apiCalls = [];

  // Capture ALL API POST requests
  page.on('request', req => {
    if ((req.url().includes('/api/') || req.url().includes('/auth/')) && req.method() !== 'GET') {
      apiCalls.push({ method: req.method(), url: req.url(), postData: req.postData(), headers: req.headers() });
    }
  });
  page.on('response', async resp => {
    if ((resp.url().includes('/api/onboarding') || resp.url().includes('/auth/')) && resp.status() >= 200 && resp.status() < 300) {
      try {
        const body = await resp.text();
        if (body.length < 1000) console.log(`RESP ${resp.status()} ${resp.url()}: ${body}`);
      } catch(e) {}
    }
  });

  console.log('Opening HA...');
  await page.goto('http://localhost:8123', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Try to fill the user creation form
  // HA onboarding uses custom elements that might be inside shadow DOM
  // Try filling fields with page.locator which can pierce shadow DOM
  console.log('Filling form...');
  
  // HA onboarding page has these fields
  for (const [name, value] of [['name', 'Admin'], ['username', 'admin'], ['password', 'admin123'], ['password_confirm', 'admin123']]) {
    try {
      await page.locator(`input[name="${name}"]`).first().fill(value, { timeout: 2000 });
      console.log(`  Filled: ${name}`);
    } catch(e) {
      try {
        await page.locator(`#${name}`).first().fill(value, { timeout: 2000 });
        console.log(`  Filled #${name}`);
      } catch(e2) {
        console.log(`  Could not fill ${name}`);
      }
    }
  }

  // Click CREATE ACCOUNT button
  await page.waitForTimeout(1000);
  for (const selector of ['mwc-button[slot="primaryAction"]', 'button:has-text("CREATE ACCOUNT")', 'button:has-text("Create")', 'button[type="submit"]', 'ha-button']) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        console.log(`  Clicking: ${selector}`);
        await btn.click();
        await page.waitForTimeout(5000);
        break;
      }
    } catch(e) {}
  }

  // Log all captured API calls
  console.log('\n=== POST API calls ===');
  apiCalls.forEach(r => console.log(`${r.method} ${r.url}\n  Data: ${r.postData ? r.postData.substring(0, 200) : 'none'}`));

  // Take final screenshot
  await page.screenshot({ path: '/tmp/ha-onboard-final.png' });
  console.log('\nScreenshot: /tmp/ha-onboard-final.png');

  await browser.close();
})();
