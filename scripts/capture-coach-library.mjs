import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.COACH_SHOT_DIR || '/opt/cursor/artifacts/screenshots';
mkdirSync(outDir, { recursive: true });
const url = process.env.COACH_URL || 'http://127.0.0.1:8777/coach.html';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();

async function loginAndGoLibrary(width, height) {
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => {
    if (typeof tryLogin === 'function') tryLogin('dan@thehybrid.local', 'demo');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => {
    if (typeof go === 'function') go('library', { lib: 'programs' });
  });
  await new Promise((r) => setTimeout(r, 700));
}

await loginAndGoLibrary(390, 844);
await page.screenshot({ path: join(outDir, 'coach-library-phone-programs.png'), fullPage: false });
console.log('saved coach-library-phone-programs.png');

await loginAndGoLibrary(1280, 900);
await page.screenshot({ path: join(outDir, 'coach-library-desktop-programs.png'), fullPage: false });
console.log('saved coach-library-desktop-programs.png');

await page.evaluate(() => {
  if (typeof go === 'function') go('library', { lib: 'sessions' });
});
await new Promise((r) => setTimeout(r, 500));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.screenshot({ path: join(outDir, 'coach-library-phone-sessions.png'), fullPage: false });
console.log('saved coach-library-phone-sessions.png');

await browser.close();
