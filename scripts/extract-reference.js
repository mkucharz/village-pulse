const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });

  // Go to HA demo which has weather card
  console.log('Loading HA demo...');
  await page.goto('https://demo.home-assistant.io/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  // Find weather card
  console.log('Looking for weather card...');
  const cardHTML = await page.evaluate(() => {
    const cards = document.querySelectorAll('ha-card');
    for (const card of cards) {
      const text = card.textContent || '';
      if (text.includes('Weather') || text.includes('weather') || text.includes('°')) {
        return card.outerHTML;
      }
    }
    return null;
  });

  if (cardHTML) {
    console.log('✓ Found weather card, saving...');
    fs.writeFileSync('internal/templates/reference/weather-card-ha.html', cardHTML);
    console.log(`  Saved ${cardHTML.length} bytes`);
  } else {
    console.log('✗ Weather card not found, taking full page screenshot');
  }

  // Take screenshot of weather widget area
  await page.screenshot({ path: 'scripts/reference-weather.png', fullPage: false });
  console.log('Screenshot: scripts/reference-weather.png');

  // Also capture the page HTML for structure comparison
  const fullHTML = await page.content();
  fs.writeFileSync('internal/templates/reference/demo-page.html', fullHTML);
  console.log(`Full page: ${fullHTML.length} bytes`);

  await browser.close();
  console.log('Done.');
})();
