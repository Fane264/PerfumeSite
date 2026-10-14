import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3000/parfumuri', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: 'd:/PerfumeSite/screenshots/02-parfumuri.png', fullPage: false });
console.log('✓ parfumuri');
await page.goto('http://localhost:3000/parfumuri', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);
// get first perfume link
const slug = await page.$eval('a[href*="/parfumuri/"]', el => el.getAttribute('href')).catch(() => null);
if (slug) {
  await page.goto('http://localhost:3000' + slug, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'd:/PerfumeSite/screenshots/03-produs.png', fullPage: false });
  console.log('✓ produs: ' + slug);
}
await browser.close();
