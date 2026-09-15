/**
 * Hybrid Health proxy — aggregates Totem (WHOOP), TrainingPeaks MCP, TrainHeroic MCP.
 * v1 returns demo fixtures; set HYBRID_HEALTH_LIVE=1 when MCP credentials are wired.
 */
import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 8788);
const LIVE = process.env.HYBRID_HEALTH_LIVE === '1';

const DEMO_TODAY = {
  ok: true,
  demo: true,
  syncedAt: new Date().toISOString(),
  body: {
    recovery: 78,
    zone: 'build',
    zoneLabel: 'Build',
    sleep: '7h 12m',
    strain: 12.4,
    hrv: 68,
    rhr: 52,
    source: 'totem',
  },
  trainingPeaks: {
    title: 'Threshold Bike',
    durationMin: 90,
    ctl: 78,
    atl: 82,
    tsb: -4,
    structure: ['Warm-up 20m', '3×15m threshold', 'Cool-down 10m'],
  },
  trainHeroic: {
    title: 'Lower Body',
    program: 'Coach program · Week 3',
    sets: [
      { exercise: 'Back Squat', prescription: '4 × 5 @ 140 kg' },
      { exercise: 'Romanian Deadlift', prescription: '3 × 8 @ 100 kg' },
      { exercise: 'Walking Lunge', prescription: '3 × 10 / leg' },
    ],
  },
};

function statusPayload() {
  const linked = LIVE;
  const now = linked ? new Date().toISOString() : null;
  return {
    ok: true,
    mode: LIVE ? 'live' : 'demo',
    sources: {
      totem: {
        connected: linked || !!process.env.TOTEM_TOKEN,
        lastSync: now,
        note: linked ? 'Live Totem MCP' : 'Demo until HYBRID_HEALTH_LIVE=1',
      },
      trainingpeaks: {
        connected: linked || !!process.env.TP_ACCESS_TOKEN,
        lastSync: now,
        note: linked ? 'Live TP MCP' : 'Demo until HYBRID_HEALTH_LIVE=1',
      },
      trainheroic: {
        connected: linked || !!process.env.TH_SESSION_COOKIE,
        lastSync: now,
        note: linked ? 'Live TH MCP' : 'Demo until HYBRID_HEALTH_LIVE=1',
      },
    },
  };
}

function todayPayload() {
  const payload = JSON.parse(JSON.stringify(DEMO_TODAY));
  payload.syncedAt = new Date().toISOString();
  payload.demo = !LIVE;
  if (LIVE) {
    // MCP wiring lands here — keep response shape stable for the shell.
    payload.note = 'Live MCP fetch not yet implemented; returning fixtures with demo=false.';
    payload.demo = false;
  }
  return payload;
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept',
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function handler(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept',
    });
    return res.end();
  }
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }
  if (url.pathname === '/health/today') return sendJson(res, 200, todayPayload());
  if (url.pathname === '/health/status') return sendJson(res, 200, statusPayload());
  if (url.pathname === '/' || url.pathname === '/health') {
    return sendJson(res, 200, { ok: true, service: 'hybrid-health-proxy', endpoints: ['/health/today', '/health/status'] });
  }
  return sendJson(res, 404, { ok: false, error: 'Not found' });
}

const server = http.createServer(handler);

if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
  server.listen(PORT, () => {
    console.log(`hybrid-health-proxy listening on http://localhost:${PORT} (${LIVE ? 'live' : 'demo'})`);
  });
}

export { handler, todayPayload, statusPayload, DEMO_TODAY };
