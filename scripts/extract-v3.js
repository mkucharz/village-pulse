const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 450, height: 700 } });

  await page.goto('file:///tmp/ha-weather-forecast-card/demo/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  // Use Playwright's built-in shadow DOM piercing
  // The locator engine automatically traverses shadow roots
  const haCard = page.locator('weather-forecast-card ha-card');
  
  const exists = await haCard.count();
  console.log(`ha-card found: ${exists}`);

  if (exists > 0) {
    const html = await haCard.first().innerHTML();
    console.log(`HTML length: ${html.length}`);
    
    if (html) {
      fs.writeFileSync('internal/templates/reference/weather-card-ha.html', 
        `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
:root {
  --card-background-color: #1c1c1c;
  --primary-text-color: #fff;
  --secondary-text-color: #929292;
  --ha-font-size-3xl: 28px;
  --ha-font-size-xl: 20px;
  --ha-font-size-m: 14px;
  --state-icon-color: #44739e;
  --wfc-component-gap: 12px;
  --forecast-item-width: 70px;
  --forecast-item-gap: 0px;
  --forecast-conditions-icon-size: 36px;
  --current-conditions-icon-size: 64px;
  font-family: Roboto,sans-serif;
  background:#1c1c1c; color:#fff; margin:0; padding:16px;
}
ha-card { display:flex; flex-direction:column; width:100%;
  padding:24px; border-radius:20px;
  background:linear-gradient(180deg,rgba(0,0,0,0.1) 20%,rgba(0,0,0,0.01) 100%);
  border:1px solid rgba(255,255,255,0.05); }
.wfc-weather-condition-icon-slot { width:36px; height:36px; }
.wfc-current-icon { width:64px; height:64px; }
.wfc-forecast-slot { display:flex; flex-direction:column; align-items:center; }
.wfc-scroll-container { overflow-x:auto; scrollbar-width:none; }
</style></head><body><ha-card>${html}</ha-card></body></html>`);
      console.log('Reference saved');
    }

    // Take screenshot
    await page.screenshot({ path: 'scripts/reference-weather-card.png' });
    console.log('Screenshot saved');
  } else {
    // Try without shadow DOM piercing
    const content = await page.content();
    console.log(`Page HTML: ${content.length} bytes`);
    
    // Try to evaluate with JavaScript to extract shadow DOM
    const shadowHTML = await page.evaluate(() => {
      const card = document.querySelector('weather-forecast-card');
      if (card && card.shadowRoot) {
        return card.shadowRoot.querySelector('ha-card')?.innerHTML || card.shadowRoot.innerHTML;
      }
      // Try open shadow root
      const roots = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) roots.push(el.tagName + ':' + el.shadowRoot.innerHTML.length);
      });
      return 'No shadow root. Elements with shadow: ' + roots.join(', ');
    });
    console.log('Shadow eval:', shadowHTML);
  }

  await browser.close();
})();
