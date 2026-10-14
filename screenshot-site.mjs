import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';

const BASE = 'http://localhost:3000';
const OUT = 'd:/PerfumeSite/screenshots';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const pages = [
  { name: '01-homepage', url: '/' },
  { name: '02-parfumuri', url: '/parfumuri' },
  { name: '03-produs', url: '/parfumuri' },
  { name: '04-cos', url: '/cos' },
  { name: '05-abonament', url: '/abonament' },
  { name: '06-lansari', url: '/lansari' },
  { name: '07-wholesale', url: '/wholesale' },
  { name: '08-blog', url: '/blog' },
  { name: '09-quiz', url: '/quiz' },
  { name: '10-seturi', url: '/seturi' },
];

for (const { name, url } of pages) {
  try {
    await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    console.log(`✓ ${name}`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message.split('\n')[0]}`);
  }
}

await browser.close();
console.log('\nDone. Screenshots saved to:', OUT);
