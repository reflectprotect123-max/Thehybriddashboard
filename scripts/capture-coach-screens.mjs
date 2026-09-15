import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = process.env.COACH_SHOT_DIR || '/opt/cursor/artifacts/screenshots';
mkdirSync(outDir, { recursive: true });

const url = process.env.COACH_URL || 'http://127.0.0.1:8765/coach.html';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function shot(page, name, width, height) {
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => {
    if (typeof tryLogin === 'function') tryLogin('dan@thehybrid.local', 'demo');
  });
  await new Promise((r) => setTimeout(r, 800));
  const path = join(outDir, name);
  await page.screenshot({ path, fullPage: false });
  console.log('saved', path);
}

const page = await browser.newPage();
await shot(page, 'coach-today-phone.png', 390, 844);
await shot(page, 'coach-today-desktop.png', 1280, 900);
await page.evaluate(() => {
  if (typeof toggleCoachMore === 'function') toggleCoachMore(true);
});
await new Promise((r) => setTimeout(r, 400));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.screenshot({ path: join(outDir, 'coach-today-more-phone.png'), fullPage: false });
console.log('saved', join(outDir, 'coach-today-more-phone.png'));
await browser.close();
