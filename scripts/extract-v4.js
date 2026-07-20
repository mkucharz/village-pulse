const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 450, height: 700 } });

  await page.goto('file:///tmp/ha-weather-forecast-card/demo/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(4000);

  // Get the card's light DOM content (troinine card uses light DOM)
  const cardHTML = await page.evaluate(() => {
    const card = document.querySelector('weather-forecast-card');
    if (!card) return 'no card element';
    return card.innerHTML;  // Light DOM
  });

  console.log(`Card light DOM: ${cardHTML.length} bytes`);
  if (cardHTML.length > 50) {
    console.log('First 200 chars:', cardHTML.substring(0, 200));
  }

  // Get ALL the DOM inside the card including sub-components
  const fullCard = await page.evaluate(() => {
    const card = document.querySelector('weather-forecast-card');
    if (!card) return 'none';
    // Try to get rendered HTML of children
    const clone = card.cloneNode(true);
    return clone.outerHTML;
  });

  fs.writeFileSync('scripts/reference-card.outer', fullCard);
  console.log(`Card outerHTML: ${fullCard.length} bytes`);
  
  // Also check: does the card have rendered child elements?
  const childCount = await page.evaluate(() => {
    const card = document.querySelector('weather-forecast-card');
    return card ? card.children.length : 0;
  });
  console.log(`Card children: ${childCount}`);
  
  if (childCount > 0) {
    // Get the first child's tag name to understand the structure
    const firstChild = await page.evaluate(() => {
      const card = document.querySelector('weather-forecast-card');
      return card ? card.children[0].tagName + ' class=' + card.children[0].className : 'none';
    });
    console.log(`First child: ${firstChild}`);
  }

  // Take screenshot prominently for visual reference
  await page.screenshot({ path: 'scripts/reference-weather-card.png', fullPage: false });
  await page.setViewportSize({ width: 450, height: 1400 });
  await page.screenshot({ path: 'scripts/reference-weather-card-full.png', fullPage: true });
  console.log('Screenshots saved');

  await browser.close();
})();
