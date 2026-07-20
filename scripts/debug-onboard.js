const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Log all network requests
  const requests = [];
  page.on('request', req => {
    if (req.url().includes('/api/') || req.url().includes('/auth/')) {
      requests.push({ method: req.method(), url: req.url(), postData: req.postData() });
    }
  });
  
  page.on('response', async resp => {
    if (resp.url().includes('/api/onboarding') || resp.url().includes('/auth/')) {
      try {
        const body = await resp.text();
        if (body.length < 500) console.log(`RESP ${resp.status()} ${resp.url()}: ${body}`);
      } catch(e) {}
    }
  });

  await page.goto('http://localhost:8123', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  
  console.log('\n=== API calls made ===');
  requests.forEach(r => console.log(`${r.method} ${r.url}${r.postData ? ' DATA: ' + r.postData : ''}`));
  
  // Take screenshot for visual reference
  await page.screenshot({ path: '/tmp/ha-onboard.png' });
  console.log('\nScreenshot: /tmp/ha-onboard.png');
  
  await browser.close();
})();
