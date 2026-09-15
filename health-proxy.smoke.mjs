import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handler } from './health-proxy/server.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const failures = [];
function must(c, m) {
  if (!c) failures.push(m);
}

function request(path) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, async () => {
      const { port } = server.address();
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`);
        const json = await res.json();
        resolve({ status: res.status, json });
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

const today = await request('/health/today');
must(today.status === 200, 'today status 200');
must(today.json.body && today.json.body.recovery != null, 'today has body.recovery');
must(today.json.trainingPeaks && today.json.trainingPeaks.title, 'today has trainingPeaks');
must(today.json.trainHeroic && today.json.trainHeroic.sets, 'today has trainHeroic');

const status = await request('/health/status');
must(status.status === 200, 'status status 200');
must(status.json.sources && status.json.sources.totem, 'status has totem');
must(status.json.sources.trainingpeaks, 'status has trainingpeaks');
must(status.json.sources.trainheroic, 'status has trainheroic');

const readme = await import('node:fs').then((fs) =>
  fs.readFileSync(join(root, 'README.md'), 'utf8'),
);
must(readme.includes('health-proxy'), 'README documents health-proxy');

if (failures.length) {
  console.error('health-proxy.smoke FAIL');
  failures.forEach((f) => console.error(' -', f));
  process.exit(1);
}
console.log('health-proxy.smoke: ok');
