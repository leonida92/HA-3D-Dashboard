import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('http://localhost:5175');
  
  // Wait for the UI to be ready
  await page.waitForSelector('text=Pick Material');
  
  // Click the Pick Material button
  await page.click('text=Pick Material');
  console.log('Clicked Pick Material');
  
  // Click on the center of the screen
  await page.mouse.click(500, 300);
  console.log('Clicked canvas');

  await page.waitForTimeout(2000);
  
  await browser.close();
})();