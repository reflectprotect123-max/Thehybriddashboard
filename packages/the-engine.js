/**
 * The Engine — HR zones, Banister TRIMP, conditioning load.
 * Reconstructed from remaining athlete zone / condLoad / hrTrimp call sites.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HybridEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const EFFORTS = [
    { key: 'easy', name: 'Easy', zoneKey: 'recovery', rpe: '3–4', cue: 'full sentences' },
    { key: 'medium', name: 'Medium', zoneKey: 'aerobic', rpe: '5–7', cue: 'short sentences' },
    { key: 'hard', name: 'Hard', zoneKey: 'anaerobic', rpe: '8–9.5', cue: 'a few words at a time' },
  ];

  function num(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  }

  function effortMeta(key) {
    return EFFORTS.find((e) => e.key === key) || EFFORTS[0];
  }

  function zonesForProfile(profile) {
    profile = profile || {};
    let maxHr = num(profile.maxHr) || 190;
    if (maxHr < 160 || maxHr > 220) maxHr = 190;
    const rest = num(profile.restingHr) || 60;
    let recovery = num(profile.recovery);
    if (profile.whoop && num(profile.whoop.recoveryScore) > 0) {
      recovery = num(profile.whoop.recoveryScore);
    }
    const recoveryKnown = !!(profile.recoveryKnown || recovery > 0);
    let shift = 0;
    if (recoveryKnown) {
      if (recovery < 34) shift = -0.04;
      else if (recovery < 67) shift = 0;
      else shift = 0.02;
    }
    const hrr = Math.max(40, maxHr - rest);
    const pct = (p) => Math.round(rest + hrr * Math.max(0.2, Math.min(0.98, p + shift)));
    const recLo = Math.max(rest + 5, pct(0.5));
    const aerLo = pct(0.65);
    const anLo = pct(0.8);
    const peakLo = pct(0.9);
    return [
      { key: 'recovery', name: 'Recovery', lo: recLo, hi: aerLo - 1, color: '#9fc59b' },
      { key: 'aerobic', name: 'Aerobic', lo: aerLo, hi: anLo - 1, color: '#d1a464' },
      { key: 'anaerobic', name: 'Hard', lo: anLo, hi: peakLo - 1, color: '#cf7f7c' },
      { key: 'peak', name: 'Peak', lo: peakLo, hi: maxHr, color: '#c45c58' },
    ];
  }

  function zoneKeyForBpm(bpm, zones) {
    bpm = num(bpm);
    if (!zones || !zones.length) return 'recovery';
    if (bpm < zones[0].lo) return zones[0].key;
    const hit = zones.find((z) => bpm >= z.lo && bpm <= z.hi);
    return (hit && hit.key) || zones[zones.length - 1].key;
  }

  function hrTrimp(minutes, avgHr, profile, whoop) {
    profile = profile || {};
    const rest = num(profile.restingHr) || 60;
    const max = num(profile.maxHr) || 190;
    if (!minutes || !avgHr || avgHr <= rest) return 0;
    const hrr = Math.max(0, Math.min(1, (avgHr - rest) / Math.max(1, max - rest)));
    const coef = profile.sex === 'female' ? 1.67 : 1.92;
    let load = minutes * hrr * (0.64 * Math.exp(coef * hrr));
    const rec = whoop && num(whoop.recoveryScore);
    if (rec > 0 && rec < 34) load *= 0.9;
    return load;
  }

  function condLoad(opts) {
    opts = opts || {};
    const minutes = num(opts.minutes);
    const avgHr = num(opts.avgHr);
    if (avgHr > 0 && minutes > 0) {
      return {
        load: hrTrimp(minutes, avgHr, opts.profile, opts.whoop),
        method: 'HR-based load',
        confidence: 'high',
        scored: true,
      };
    }
    const rpe = num(opts.rpe);
    if (rpe > 0 && minutes > 0) {
      return {
        load: minutes * (rpe / 10) * 8,
        method: 'RPE-based load',
        confidence: 'medium',
        scored: true,
      };
    }
    const zs = opts.zoneSeconds || {};
    const zMin =
      (num(zs.recovery) + num(zs.aerobic) + num(zs.anaerobic) + num(zs.peak)) / 60;
    if (zMin > 0) {
      const weighted =
        (num(zs.recovery) * 1 + num(zs.aerobic) * 2 + num(zs.anaerobic) * 3 + num(zs.peak) * 4) /
        60;
      return { load: weighted, method: 'Zone-minutes load', confidence: 'medium', scored: true };
    }
    return {
      load: 0,
      method: 'Conditioning completed — log duration and RPE or avg HR to score load.',
      confidence: 'unknown',
      scored: false,
    };
  }

  function weeklyZoneSeconds(sessions, asOf, days) {
    days = days || 7;
    const end = asOf || new Date().toISOString().slice(0, 10);
    const startDate = new Date(end + 'T00:00:00');
    startDate.setDate(startDate.getDate() - (days - 1));
    const start = startDate.toISOString().slice(0, 10);
    const out = { recovery: 0, aerobic: 0, anaerobic: 0, peak: 0 };
    (sessions || []).forEach((s) => {
      if (!s || s.status === 'abandoned') return;
      if (s.date < start || s.date > end) return;
      (s.tasks || []).forEach((t) => {
        if (t.kind !== 'conditioning') return;
        const zs = (t.result && t.result.zoneSeconds) || {};
        out.recovery += num(zs.recovery);
        out.aerobic += num(zs.aerobic);
        out.anaerobic += num(zs.anaerobic);
        out.peak += num(zs.peak);
      });
    });
    return out;
  }

  function sessionPatchFromBuilder(opts) {
    opts = opts || {};
    const effort = effortMeta(opts.effort);
    const zones = opts.zones || [];
    const zone = zones.find((z) => z.key === effort.zoneKey) || zones[0];
    const minutes = Math.max(1, num(opts.minutes) || 20);
    const patch = {
      effort: effort.key,
      condFmt: opts.fmt || 'steady',
      modality: opts.modality || 'Bike',
      targetDurationMin: minutes,
      timeCapMin: minutes,
      rounds: num(opts.rounds) || 1,
      workSec: num(opts.workSec) || 0,
      restSec: num(opts.restSec) || 0,
      targetWatts: opts.targetWatts || '',
      autopilotCond: !!opts.autopilotCond,
      targetHrZone: zone ? zone.key : effort.zoneKey,
      notes: zone
        ? `${minutes} min ${effort.name.toLowerCase()} · ${zone.lo}–${zone.hi} bpm · RPE ${effort.rpe}.`
        : '',
    };
    return patch;
  }

  function tagEchoDeviceMetrics(ev) {
    ev = ev || {};
    return {
      device: (ev.device && ev.device.name) || ev.name || 'Echo',
      power_w: ev.power_w != null ? ev.power_w : ev.instantaneousPower,
      average_power_w: ev.average_power_w != null ? ev.average_power_w : ev.averagePower,
      cadence_rpm: ev.cadence_rpm != null ? ev.cadence_rpm : ev.instantaneousCadence,
      heart_rate_bpm: ev.heart_rate_bpm != null ? ev.heart_rate_bpm : ev.heartRate,
    };
  }

  return {
    EFFORTS,
    effortMeta,
    zonesForProfile,
    zoneKeyForBpm,
    hrTrimp,
    condLoad,
    weeklyZoneSeconds,
    sessionPatchFromBuilder,
    tagEchoDeviceMetrics,
  };
});
