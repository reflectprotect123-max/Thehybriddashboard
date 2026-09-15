import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const js = readFileSync(join(root, 'coach-integrations.js'), 'utf8');
const html = readFileSync(join(root, 'coach.html'), 'utf8');
const failures = [];
function must(c, m) {
  if (!c) failures.push(m);
}

must(html.includes('coach-integrations.js'), 'coach.html loads coach-integrations.js');
must(html.includes('function todayHtml'), 'coach.html defines todayHtml');
must(html.includes('CoachIntegrations'), 'coach.html references CoachIntegrations');
must(html.includes('refreshToday'), 'coach.html defines refreshToday');
must(js.includes('thebriangao/totem'), 'totem repo reference');
must(js.includes('JamsusMaximus/trainingpeaks-mcp'), 'TP repo reference');
must(js.includes('trainheroic-unofficial'), 'TH repo reference');
must(!html.includes('Manage Assistants'), 'no Manage Assistants AI chrome');
must(js.includes('fetchToday'), 'fetchToday export');
must(js.includes('getDemoToday'), 'getDemoToday export');
must(html.includes('function trainHtml'), 'trainHtml in shell');
must(html.includes('function bodyHtml'), 'bodyHtml in shell');
must(html.includes('go(\'connections\')'), 'connections route');

if (failures.length) {
  console.error('coach-integrations.smoke FAIL');
  failures.forEach((f) => console.error(' -', f));
  process.exit(1);
}
console.log('coach-integrations.smoke: ok');
