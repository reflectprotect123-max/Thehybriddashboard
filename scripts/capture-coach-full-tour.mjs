import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.COACH_SHOT_DIR || '/opt/cursor/artifacts/coach-full-tour';
mkdirSync(outDir, { recursive: true });
const url = process.env.COACH_URL || 'http://127.0.0.1:8777/coach.html';

const shots = [];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();

async function boot() {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => {
    if (typeof tryLogin === 'function') tryLogin('dan@thehybrid.local', 'demo');
  });
  await new Promise((r) => setTimeout(r, 700));
}

async function snap(name, width, height, fn) {
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  if (fn) await fn();
  await new Promise((r) => setTimeout(r, 500));
  const file = `${name}.png`;
  await page.screenshot({ path: join(outDir, file), fullPage: false });
  shots.push({ name, file, width, height });
  console.log('saved', file);
}

await boot();

const phone = 390;
const phoneH = 844;
const desk = 1280;
const deskH = 900;

await snap('01-today-phone', phone, phoneH, () =>
  page.evaluate(() => go('home')),
);
await snap('02-today-desktop', desk, deskH, () =>
  page.evaluate(() => go('home')),
);
await snap('03-feed-phone', phone, phoneH, () =>
  page.evaluate(() => go('feed')),
);
await snap('04-athletes-phone', phone, phoneH, () =>
  page.evaluate(() => go('athletes')),
);
await snap('05-athlete-cal-phone', phone, phoneH, () =>
  page.evaluate(() => go('athlete', { athleteId: 'ath-dan-veldman' })),
);
await snap('06-teams-phone', phone, phoneH, () =>
  page.evaluate(() => go('teams')),
);
await snap('07-library-programs-phone', phone, phoneH, () =>
  page.evaluate(() => go('library', { lib: 'programs' })),
);
await snap('08-library-sessions-phone', phone, phoneH, () =>
  page.evaluate(() => go('library', { lib: 'sessions' })),
);
await snap('09-library-exercises-phone', phone, phoneH, () =>
  page.evaluate(() => go('library', { lib: 'exercises' })),
);
await snap('10-program-grid-phone', phone, phoneH, () =>
  page.evaluate(() => openProgram('prog-hybrid-base')),
);
await snap('11-program-grid-desktop', desk, deskH, () =>
  page.evaluate(() => openProgram('prog-hybrid-base')),
);
await snap('12-session-editor-phone', phone, phoneH, () =>
  page.evaluate(() => openSession('tpl-full-body-strength')),
);
await snap('13-session-editor-desktop', desk, deskH, () =>
  page.evaluate(() => openSession('tpl-full-body-strength')),
);
await snap('14-nutrition-phone', phone, phoneH, () =>
  page.evaluate(() => go('nutrition')),
);
await snap('15-more-phone', phone, phoneH, () =>
  page.evaluate(() => {
    go('home');
    toggleCoachMore(true);
  }),
);
await snap('16-library-desktop', desk, deskH, () =>
  page.evaluate(() => go('library', { lib: 'programs' })),
);
await snap('17-athletes-desktop', desk, deskH, () =>
  page.evaluate(() => go('athletes')),
);

const indexHtml = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Hybrid Coach — Full UI Tour</title>
<style>
  body{margin:0;font-family:system-ui,sans-serif;background:#0f1114;color:#e8eaed}
  header{padding:24px 20px;border-bottom:1px solid #2a3444}
  h1{margin:0 0 8px;font-size:22px}
  p{margin:0;color:#94a3b8;font-size:14px;line-height:1.5}
  main{padding:20px;display:grid;gap:28px;max-width:1400px;margin:0 auto}
  section{background:#141a22;border:1px solid #2a3444;border-radius:12px;padding:16px}
  section h2{margin:0 0 12px;font-size:15px;font-weight:600;color:#f1f5f9}
  .row{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
  figure{margin:0;flex:1 1 320px;max-width:100%}
  figcaption{font-size:12px;color:#94a3b8;margin-bottom:8px}
  img{width:100%;height:auto;border-radius:8px;border:1px solid #334155;background:#fff}
</style></head><body>
<header>
  <h1>Hybrid Coach — full UI tour</h1>
  <p>Today health dashboard + coach programming. Sample data until health proxy is connected. Branch: coach-health-today-4d23.</p>
</header>
<main>
${shots.map((s) => `<section><h2>${s.name.replace(/-/g, ' ')} (${s.width}×${s.height})</h2><div class="row"><figure><figcaption>${s.file}</figcaption><img src="${s.file}" alt="${s.name}"/></figure></div></section>`).join('\n')}
</main></body></html>`;

writeFileSync(join(outDir, 'index.html'), indexHtml);
console.log('wrote index.html with', shots.length, 'screenshots');
await browser.close();
