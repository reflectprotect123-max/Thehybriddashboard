/**
 * Hybrid Health integrations — Totem (WHOOP), TrainingPeaks MCP, TrainHeroic MCP.
 * Dashboard tiles are deterministic fetch → UI. Demo fixtures when proxy is unset.
 */
(function (global) {
  'use strict';

  var PROXY_KEY = 'hybrid_health_proxy_v1';
  var STATUS_KEY = 'hybrid_health_status_v1';

  var SOURCES = {
    totem: { id: 'totem', label: 'WHOOP', via: 'Totem MCP', accent: '#0d9488', repo: 'https://github.com/thebriangao/totem' },
    trainingpeaks: { id: 'trainingpeaks', label: 'TrainingPeaks', via: 'TP MCP', accent: '#2563eb', repo: 'https://github.com/JamsusMaximus/trainingpeaks-mcp' },
    trainheroic: { id: 'trainheroic', label: 'TrainHeroic', via: 'TH MCP', accent: '#ea580c', repo: 'https://github.com/alandotcom/trainheroic-unofficial' },
  };

  var DEMO_TODAY = {
    ok: true,
    demo: true,
    syncedAt: null,
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

  function readJson(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function getProxyBase() {
    try {
      return String(global.localStorage.getItem(PROXY_KEY) || '').trim().replace(/\/$/, '');
    } catch (_) {
      return '';
    }
  }

  function setProxyBase(url) {
    var v = String(url || '').trim().replace(/\/$/, '');
    try {
      if (v) global.localStorage.setItem(PROXY_KEY, v);
      else global.localStorage.removeItem(PROXY_KEY);
    } catch (_) {}
    return v;
  }

  function getStatusMap() {
    return readJson(STATUS_KEY, {
      totem: { connected: false, lastSync: null, note: '' },
      trainingpeaks: { connected: false, lastSync: null, note: '' },
      trainheroic: { connected: false, lastSync: null, note: '' },
    });
  }

  function patchStatus(id, patch) {
    var map = getStatusMap();
    map[id] = Object.assign({}, map[id] || {}, patch || {});
    writeJson(STATUS_KEY, map);
    return map;
  }

  function getDemoToday() {
    return JSON.parse(JSON.stringify(DEMO_TODAY));
  }

  function zoneClass(zone) {
    var z = String(zone || '').toLowerCase();
    if (z === 'rest') return 'day-zone-rest';
    if (z === 'push') return 'day-zone-push';
    return 'day-zone-build';
  }

  function formatSyncTime(iso) {
    if (!iso) return 'Not synced';
    try {
      var d = new Date(iso);
      if (Number.isNaN(d.getTime())) return 'Not synced';
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch (_) {
      return 'Not synced';
    }
  }

  async function fetchToday() {
    var base = getProxyBase();
    if (!base) {
      return getDemoToday();
    }
    try {
      var res = await fetch(base + '/health/today', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'omit',
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      if (!data || typeof data !== 'object') throw new Error('Invalid response');
      data.demo = !!data.demo;
      data.ok = true;
      if (data.syncedAt) {
        patchStatus('totem', { connected: true, lastSync: data.syncedAt });
        if (data.trainingPeaks) patchStatus('trainingpeaks', { connected: true, lastSync: data.syncedAt });
        if (data.trainHeroic) patchStatus('trainheroic', { connected: true, lastSync: data.syncedAt });
      }
      return data;
    } catch (err) {
      var demo = getDemoToday();
      demo.ok = false;
      demo.error = (err && err.message) || 'Fetch failed';
      return demo;
    }
  }

  async function probeProxy(base) {
    base = String(base || getProxyBase()).trim().replace(/\/$/, '');
    if (!base) return { ok: false, error: 'No proxy URL set' };
    try {
      var res = await fetch(base + '/health/status', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'omit',
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      if (data && data.sources) {
        Object.keys(data.sources).forEach(function (k) {
          if (SOURCES[k]) patchStatus(k, data.sources[k]);
        });
      }
      return { ok: true, data: data };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'Probe failed' };
    }
  }

  global.CoachIntegrations = {
    SOURCES: SOURCES,
    DEMO_TODAY: DEMO_TODAY,
    getProxyBase: getProxyBase,
    setProxyBase: setProxyBase,
    getStatusMap: getStatusMap,
    patchStatus: patchStatus,
    getDemoToday: getDemoToday,
    fetchToday: fetchToday,
    probeProxy: probeProxy,
    zoneClass: zoneClass,
    formatSyncTime: formatSyncTime,
  };
})(typeof window !== 'undefined' ? window : globalThis);
