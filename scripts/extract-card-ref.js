const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 450, height: 700 } });

  // Use the local demo HTML from the cloned repo
  const demoHTML = '/tmp/ha-weather-forecast-card/demo/index.html';
  
  // Need to serve the card JS first. The demo references the built card.
  // Let's check what the demo expects.
  const html = fs.readFileSync(demoHTML, 'utf-8');
  const scriptMatch = html.match(/src="([^"]+weather[^"]*\.js)"/);
  console.log('Script source:', scriptMatch ? scriptMatch[1] : 'not found in HTML');

  // The demo expects the card JS at '../../dist/weather-forecast-card.js'
  // Let's check if it exists
  const cardJS = '/tmp/ha-weather-forecast-card/dist/weather-forecast-card.js';
  if (fs.existsSync(cardJS)) {
    console.log('✓ Card JS found');
  } else {
    console.log('✗ Card JS not found, trying npm build...');
    // Try to build
    const { execSync } = require('child_process');
    try {
      execSync('cd /tmp/ha-weather-forecast-card && npm install && npm run build 2>&1', { timeout: 120000 });
      console.log('Build done');
    } catch(e) {
      console.log('Build failed, will try without');
    }
  }

  // Try loading the demo
  const demoURL = `file://${demoHTML}`;
  console.log(`Loading: ${demoURL}`);
  
  try {
    await page.goto(demoURL, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // Check what's rendered
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    const hasCard = await page.evaluate(() => {
      return !!document.querySelector('weather-forecast-card');
    });
    console.log(`Has weather-forecast-card: ${hasCard}`);
    
    // Take screenshot  
    await page.screenshot({ path: '/tmp/ha-card-ref.png' });
    console.log('Screenshot: /tmp/ha-card-ref.png');
    
    // Extract card HTML
    const cardHTML = await page.evaluate(() => {
      const card = document.querySelector('weather-forecast-card');
      return card?.shadowRoot?.innerHTML || card?.innerHTML || 'no card shadow DOM';
    });
    fs.writeFileSync('internal/templates/reference/weather-card-ha.html', cardHTML);
    console.log(`Card HTML: ${cardHTML.length} bytes`);
    
  } catch(e) {
    console.log(`Error: ${e.message}`);
  }

  await browser.close();
})();
