const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 450, height: 700 } });

  await page.goto('file:///tmp/ha-weather-forecast-card/demo/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  // Get shadow DOM HTML
  const shadowHTML = await page.evaluate(() => {
    const card = document.querySelector('weather-forecast-card');
    if (!card || !card.shadowRoot) return null;
    return card.shadowRoot.querySelector('ha-card')?.innerHTML || card.shadowRoot.innerHTML;
  });

  console.log(`Shadow DOM: ${shadowHTML ? shadowHTML.length : 0} bytes`);

  if (shadowHTML) {
    // Wrap in proper HTML structure
    const wrapped = `<!DOCTYPE html>
<html>
<head><style>
:root {
  --card-background-color: #1c1c1c;
  --primary-text-color: #fff;
  --secondary-text-color: #929292;
  --ha-font-size-3xl: 28px;
  --ha-font-size-xl: 20px;
  --ha-font-size-m: 14px;
  --ha-font-size-s: 12px;
  --state-icon-color: #44739e;
  --weather-icon-sun-color: #fdd93c;
  --weather-icon-rain-color: #30b3ff;
  --weather-icon-cloud-back-color: #d4d4d4;
  --weather-icon-cloud-front-color: #f9f9f9;
  --weather-icon-snow-color: #f9f9f9;
  --ha-card-border-radius: 20px;
  --card-padding: 24px;
  --wfc-component-gap: 12px;
  font-family: Roboto, Noto, sans-serif;
  background: #1c1c1c;
  color: #fff;
}
body { margin: 0; padding: 16px; }
ha-card {
  display: flex; flex-direction: column; justify-content: center;
  width: 100%; height: 100%; min-width: 0;
  padding: var(--card-padding, 16px);
  background: linear-gradient(180deg, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.01) 100%);
  border-radius: var(--ha-card-border-radius);
  border: 1px solid rgba(255,255,255,0.05);
}
.wfc-weather-condition-icon-slot { width: 36px; height: 36px; padding: 2px 0; }
.wfc-forecast-conditions-icon-size { width: 36px; height: 36px; }
</style></head>
<body><ha-card>${shadowHTML}</ha-card></body></html>`;
    fs.writeFileSync('scripts/reference-card-standalone.html', wrapped);
    console.log('Standalone HTML saved');
  }

  // Also extract computed styles of key elements
  const styles = await page.evaluate(() => {
    const card = document.querySelector('weather-forecast-card');
    if (!card?.shadowRoot) return null;
    const el = (sel) => card.shadowRoot.querySelector(sel);
    const style = (el) => el ? window.getComputedStyle(el) : null;
    
    const temp = el('.wfc-current-temperature');
    const icon = el('.wfc-weather-condition-icon-slot');
    const state = el('.wfc-current-state');
    
    return {
      temperature: temp ? { fontSize: style(temp).fontSize, color: style(temp).color } : null,
      icon: icon ? { width: style(icon).width, height: style(icon).height } : null,
      state: state ? { fontSize: style(state).fontSize, color: style(state).color } : null,
    };
  });

  console.log('Computed styles:', JSON.stringify(styles, null, 2));

  // Take final screenshot for pixel comparison
  await page.screenshot({ path: 'scripts/reference-weather-card.png', fullPage: false });
  console.log('Screenshot: scripts/reference-weather-card.png');

  await browser.close();
})();
