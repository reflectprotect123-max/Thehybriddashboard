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

async function openGrid(width, height, outfile) {
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => {
    if (typeof tryLogin === 'function') tryLogin('dan@thehybrid.local', 'demo');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => {
    if (typeof openProgram === 'function') openProgram('prog-hybrid-base');
  });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: join(outDir, outfile), fullPage: false });
  console.log('saved', outfile);
}

await openGrid(390, 844, 'coach-program-grid-phone.png');
await openGrid(1280, 900, 'coach-program-grid-desktop.png');
await browser.close();
