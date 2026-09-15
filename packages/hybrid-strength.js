/**
 * Hybrid Strength — working-max prescriptions, tonnage, Brzycki e1RM.
 * Reconstructed from remaining athlete call sites + live working_max_event / pr_event schema.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HybridStrength = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function num(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  }

  function roundLoad(v) {
    v = num(v);
    return Math.round(v / 2.5) * 2.5;
  }

  function percentLiftCandidate(name, cat, _state, _exerciseId, _sessionRows) {
    const n = String(name || '').toLowerCase();
    const c = String(cat || '').toLowerCase();
    if (
      /(jump|slam|throw|burpee|swing|lateral raise|curl|pushdown|pull[- ]?up|chin[- ]?up|dip|row|pulldown|carry|plank|l[- ]?sit|calf|abduction|leg press|dumbbell bench|db bench)/.test(
        n,
      )
    ) {
      return false;
    }
    if (/bench press/.test(n)) return true;
    if (/squat/.test(n)) return true;
    if (/deadlift/.test(n)) return true;
    if (
      /overhead press|shoulder press|strict press|military press|z[- ]?press|landmine press|push press|arnold press/.test(
        n,
      )
    ) {
      return true;
    }
    if (/\b(clean|snatch|jerk)\b/.test(n)) return true;
    if (c.includes('power') && /\b(clean|snatch|jerk)\b/.test(n)) return true;
    return false;
  }

  function e1rm(weight, reps, formula) {
    const w = num(weight);
    const r = Math.max(1, Math.min(20, num(reps)));
    if (!w || !r) return 0;
    if (formula === 'epley') return w * (1 + r / 30);
    return w * (36 / (37 - r));
  }

  function sessionLoad(sets) {
    const rows = (sets || []).filter(Boolean);
    let tonnageKg = 0;
    for (const set of rows) {
      const measurements = set.measurements || [];
      const load = measurements.find((m) => m.metricKey === 'load');
      const reps = measurements.find((m) => m.metricKey === 'reps');
      tonnageKg += num(load && load.value) * num(reps && reps.value);
    }
    return { tonnageKg, scored: tonnageKg > 0 };
  }

  function sessionLoadFromRows(rows) {
    const f = (rows || []).filter((x) => x.done && x.targetKind !== 'seconds');
    return f.reduce((a, x) => a + num(x.weight) * num(x.reps), 0);
  }

  return {
    percentLiftCandidate,
    roundLoad,
    E1rm: { e1rm },
    Load: { sessionLoad, sessionLoadFromRows },
  };
});
