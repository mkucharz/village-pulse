const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });

  // Try the troinine card demo page
  console.log('Loading troinine demo...');
  
  // The card has a demo at: troinine.github.io/ha-weather-forecast-card/demo/
  // or the demo directory in the repo
  const urls = [
    'https://troinine.github.io/ha-weather-forecast-card/demo/',
    'https://demo.home-assistant.io/',
  ];

  for (const url of urls) {
    try {
      console.log(`Trying ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(5000);
      
      // Check if weather card is present
      const hasCard = await page.evaluate(() => {
        return !!document.querySelector('wfc-current-weather') || 
               !!document.querySelector('weather-forecast-card') ||
               !!document.querySelector('ha-weather-forecast');
      });
      
      console.log(`  Has card: ${hasCard}`);
      
      if (hasCard) {
        await page.screenshot({ path: 'scripts/reference-weather.png', fullPage: true });
        console.log(`  Screenshot saved`);
        
        // Extract card HTML
        const html = await page.evaluate(() => {
          const card = document.querySelector('weather-forecast-card') || 
                       document.querySelector('wfc-current-weather')?.closest('ha-card');
          return card?.outerHTML || 'no card found';
        });
        fs.writeFileSync('internal/templates/reference/weather-card-ha.html', html);
        console.log(`  HTML saved (${html.length} bytes)`);
        break;
      }
    } catch(e) {
      console.log(`  Error: ${e.message}`);
    }
  }

  await browser.close();
  console.log('Done.');
})();
