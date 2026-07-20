const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 450, height: 800 } });

  // Load via HTTP to allow ES module loading
  await page.goto('http://127.0.0.1:8765/demo/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  const childCount = await page.evaluate(() => {
    const card = document.querySelector('weather-forecast-card');
    return card ? card.children.length : 0;
  });
  console.log(`Card children: ${childCount}`);

  if (childCount > 0) {
    const html = await page.evaluate(() => {
      return document.querySelector('weather-forecast-card').innerHTML;
    });
    fs.writeFileSync('internal/templates/reference/weather-card-ha.html', html);
    console.log(`HTML saved: ${html.length} bytes`);
    console.log('Preview:', html.substring(0, 200));
  } else {
    // Check console errors
    page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: 'scripts/reference-weather-card.png', fullPage: true });
  console.log('Screenshot saved');

  await browser.close();
})();
