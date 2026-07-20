// scripts/onboard-ha.js
// Completes HA onboarding + creates long-lived access token
const { chromium } = require('playwright');
const fs = require('fs');

const HA_URL = 'http://localhost:8123';
const ADMIN_PASSWORD = 'admin123';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Accept all dialogs
  page.on('dialog', dialog => dialog.accept());

  try {
    console.log('1. Opening HA...');
    await page.goto(HA_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/ha-step1.png' });
    
    // Try multiple strategies to find onboarding form
    // HA 2024+ uses step-by-step onboarding with different markup
    
    // Strategy 1: Look for input fields and fill them
    console.log('2. Looking for onboarding form...');
    const pageContent = await page.content();
    
    if (pageContent.includes('name=') || pageContent.includes('Name')) {
      console.log('   Found onboarding form fields');
      
      // Fill name/username/password fields
      try { await page.fill('input[name="name"]', 'Admin'); } catch(e) {}
      try { await page.fill('input[name="username"]', 'admin'); } catch(e) {}
      try { await page.fill('input[name="password"]', ADMIN_PASSWORD); } catch(e) {}
      try { await page.fill('input[name="password_confirm"]', ADMIN_PASSWORD); } catch(e) {}
      try { await page.fill('#name', 'Admin'); } catch(e) {}
      try { await page.fill('#username', 'admin'); } catch(e) {}
      try { await page.fill('#password', ADMIN_PASSWORD); } catch(e) {}
      
      // Try clicking CREATE ACCOUNT / NEXT / FINISH
      for (const selector of [
        'mwc-button[slot="primaryAction"]',
        'button:has-text("CREATE ACCOUNT")',
        'button:has-text("Create Account")',
        'button:has-text("NEXT")',
        'button:has-text("Next")',
        'button:has-text("FINISH")',
        'button:has-text("Finish")',
        '[type="submit"]',
        'ha-button:has-text("CREATE")',
        '.btn-primary'
      ]) {
        try {
          const btn = page.locator(selector);
          if (await btn.count() > 0) {
            await btn.click();
            console.log(`   Clicked: ${selector}`);
            await page.waitForTimeout(2000);
            break;
          }
        } catch(e) {}
      }
    }

    await page.screenshot({ path: '/tmp/ha-step2.png' });
    
    // Now complete remaining steps by clicking NEXT/FINISH buttons
    console.log('3. Completing remaining steps...');
    for (let i = 0; i < 5; i++) {
      let clicked = false;
      for (const selector of [
        'mwc-button[slot="primaryAction"]',
        'button:has-text("NEXT")',
        'button:has-text("Next")',  
        'button:has-text("FINISH")',
        'button:has-text("Finish")',
        'button:has-text("COMPLETE")',
        'button:has-text("DONE")',
        'button:has-text("Done")',
        '[type="submit"]'
      ]) {
        try {
          const btn = page.locator(selector).first();
          if (await btn.count() > 0 && await btn.isVisible()) {
            await btn.click();
            console.log(`   Clicked: ${selector} (step ${i+1})`);
            await page.waitForTimeout(3000);
            clicked = true;
            break;
          }
        } catch(e) {}
      }
      if (!clicked) break;
    }

    // Wait for main dashboard to load
    console.log('4. Waiting for dashboard...');
    await page.goto(HA_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/ha-step3.png' });

    // Extract token from localStorage
    console.log('5. Extracting access token...');
    const tokenData = await page.evaluate(() => {
      const raw = localStorage.getItem('hassTokens');
      if (!raw) return null;
      try { return JSON.parse(raw); } catch(e) { return null; }
    });

    if (tokenData && tokenData.access_token) {
      console.log(`   ✓ Token: ${tokenData.access_token.substring(0, 20)}...`);
      fs.writeFileSync('/tmp/ha-token.txt', tokenData.access_token);
      fs.writeFileSync('/tmp/ha-token.json', JSON.stringify(tokenData, null, 2));
      console.log('   Saved to /tmp/ha-token.txt');
    } else {
      console.log('   No token in localStorage. Trying profile page...');
      
      // Navigate to profile and create long-lived token
      await page.goto(HA_URL + '/profile/security', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/ha-step4.png' });
      
      // Look for "Create Token" button
      for (const selector of ['button:has-text("Create Token")', 'button:has-text("CREATE TOKEN")', 'mwc-button:has-text("Create")']) {
        try {
          const btn = page.locator(selector);
          if (await btn.count() > 0 && await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(1500);
            try { await page.fill('input', 'test-token'); } catch(e) {}
            await page.locator('mwc-button:has-text("OK"), button:has-text("OK"), button:has-text("CREATE")').first().click();
            await page.waitForTimeout(2000);
            break;
          }
        } catch(e) {}
      }

      // Try to extract the token
      const token = await page.evaluate(() => {
        // Try multiple selectors
        for (const sel of ['.long-lived-access-token', 'pre', 'code', 'input[readonly]']) {
          const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.length > 50) {
            return el.textContent.trim();
          }
        }
        return null;
      });

      if (token) {
        console.log(`   ✓ Token: ${token.substring(0, 20)}...`);
        fs.writeFileSync('/tmp/ha-token.txt', token);
      } else {
        console.log('   Manual token creation needed. Check screenshots.');
        await page.screenshot({ path: '/tmp/ha-debug.png' });
      }
    }
    
  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: '/tmp/ha-debug.png' });
  } finally {
    await browser.close();
  }
}

main();
