/**
 * Strength + Engine adapters, loggers, and Supabase sync (working_max_event / pr_event / engine_session).
 * Reconstructed from remaining athlete call sites and the live PostgREST catalog — not the original Adaptive Brain packages.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (g) {
  function loadPkg(name, fallback) {
    if (g[name]) return g[name];
    try {
      if (typeof require === 'function') return require(fallback);
    } catch (_) {}
    return null;
  }

  const HS = loadPkg('HybridStrength', './packages/hybrid-strength.js') || {};
  const HE = loadPkg('HybridEngine', './packages/the-engine.js') || {};

  function num(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  }

  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function isoNow() {
    return new Date().toISOString();
  }

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function ensureStrengthState(state) {
    state = state || {};
    state.strengthState = state.strengthState || { workingMaxEvents: [], prEvents: [], loadHints: {} };
    state.settings = state.settings || {};
    if (!state.settings.trainingSystem) state.settings.trainingSystem = 'strength';
    return state.strengthState;
  }

  function trainingSystem(state) {
    const s = (state && state.settings && state.settings.trainingSystem) || 'strength';
    return s === 'engine' ? 'engine' : 'strength';
  }

  function setTrainingSystem(state, mode) {
    state = state || {};
    state.settings = state.settings || {};
    state.settings.trainingSystem = mode === 'engine' ? 'engine' : 'strength';
    return state.settings.trainingSystem;
  }

  function exerciseNameFor(state, exerciseId) {
    const ex = ((state && state.exercises) || []).find((x) => x.id === exerciseId);
    return (ex && ex.name) || exerciseId || 'Exercise';
  }

  function workingMaxAsOf(state, exerciseId, asOf) {
    ensureStrengthState(state);
    const asOfKey = String(asOf || isoNow());
    let best = null;
    (state.strengthState.workingMaxEvents || []).forEach((e) => {
      if (!e || e.exerciseId !== exerciseId) return;
      const at = String(e.effectiveAt || e.effective_at || '');
      if (at && at > asOfKey) return;
      if (!best || String(best.effectiveAt) < at) best = e;
    });
    return best;
  }

  function setWorkingMax(state, exerciseId, valueKg, source) {
    if (!exerciseId || num(valueKg) <= 0) return { ok: false };
    const ss = ensureStrengthState(state);
    const event = {
      id: uid(),
      exerciseId,
      valueKg: num(valueKg),
      effectiveAt: isoNow(),
      source: source || 'athlete',
    };
    ss.workingMaxEvents = ss.workingMaxEvents || [];
    ss.workingMaxEvents.push(event);
    return { ok: true, event };
  }

  function recordPr(state, exerciseId, valueKg, repCount) {
    if (!exerciseId || num(valueKg) <= 0) return { ok: false };
    const ss = ensureStrengthState(state);
    const event = {
      id: uid(),
      exerciseId,
      valueKg: num(valueKg),
      repCount: Math.max(1, Math.round(num(repCount) || 1)),
      recordedAt: isoNow(),
    };
    ss.prEvents = ss.prEvents || [];
    const key = event.exerciseId + ':' + event.repCount;
    const idx = ss.prEvents.findIndex((p) => p.exerciseId + ':' + p.repCount === key);
    if (idx >= 0 && num(ss.prEvents[idx].valueKg) >= event.valueKg) return { ok: true, event: ss.prEvents[idx], updated: false };
    if (idx >= 0) ss.prEvents[idx] = event;
    else ss.prEvents.push(event);
    return { ok: true, event, updated: true };
  }

  function percentLiftCandidate(name, cat, state, exerciseId, sessionRows) {
    if (HS.percentLiftCandidate) return HS.percentLiftCandidate(name, cat, state, exerciseId, sessionRows);
    return false;
  }

  function isVolumeDeferred(ex) {
    if (!ex) return false;
    if (ex.autopilotVolume === true) return true;
    if (ex.autopilotVolume === false) return false;
    return ex.sets == null && (ex.reps == null || String(ex.reps).trim() === '');
  }

  function applyAutopilotVolumeToExercise(state, ex, opts) {
    opts = opts || {};
    if (!ex) return ex;
    const wm = workingMaxAsOf(state, ex.exerciseId || ex.id, opts.asOf);
    const pct = ex.loadExpr && ex.loadExpr.exprKind === 'pct_of_max' ? num(ex.loadExpr.exprArg) : 0.7;
    if (!ex.sets) ex.sets = 3;
    if (!ex.reps) ex.reps = '8';
    if (wm && num(wm.valueKg) > 0) {
      const load = (HS.roundLoad || ((v) => v))(num(wm.valueKg) * (pct || 0.7));
      (ex.rows || []).forEach((row) => {
        if (!row.done && (row.weight === '' || row.weight == null)) row.weight = load;
      });
    }
    return ex;
  }

  function applyAutopilotToTasks(state, tasks, asOf) {
    (Array.isArray(tasks) ? tasks : Object.values(tasks || {})).forEach((t) => {
      if (!t) return;
      if (t.kind === 'strength') applyAutopilotVolumeToExercise(state, t, { asOf });
      if (t.kind === 'superset') (t.exercises || []).forEach((ex) => applyAutopilotVolumeToExercise(state, ex, { asOf }));
    });
    return tasks;
  }

  function sessionLoadContext(state, ex, asOf) {
    if (!ex) return { ok: false };
    const eid = ex.exerciseId || ex.id;
    const wm = workingMaxAsOf(state, eid, asOf);
    if (!wm || num(wm.valueKg) <= 0) {
      return {
        ok: true,
        headline: 'Set a working max to prescribe load',
        detail: 'First session uses the weight you could hit for a hard set today.',
        calibration: { label: 'Needs WM' },
      };
    }
    const pct =
      ex.loadExpr && ex.loadExpr.exprKind === 'pct_of_max' ? Math.round(num(ex.loadExpr.exprArg) * 100) : 70;
    const load = (HS.roundLoad || ((v) => v))(num(wm.valueKg) * (pct / 100));
    return {
      ok: true,
      headline: `${load} kg · ${pct}% of ${wm.valueKg} kg WM`,
      detail: exerciseNameFor(state, eid),
    };
  }

  function sessionLoadFromRows(rows) {
    if (HS.Load && HS.Load.sessionLoadFromRows) return HS.Load.sessionLoadFromRows(rows);
    return (rows || [])
      .filter((x) => x.done && x.targetKind !== 'seconds')
      .reduce((a, x) => a + num(x.weight) * num(x.reps), 0);
  }

  function auditReasonText(codes) {
    const map = {
      rir_low: 'Last-set RIR was low',
      rir_high: 'Last-set RIR left room',
      pain: 'Session pain noted',
      recovery: 'Recovery gated load',
      hold: 'Hold load',
    };
    return (codes || []).map((c) => map[c] || c).join(' · ');
  }

  function ingestCompletedSession(state, session) {
    if (!session) return state;
    const tasks = session.tasks || [];
    tasks.forEach((t) => {
      const items = t.kind === 'superset' ? t.exercises || [] : t.kind === 'strength' ? [t] : [];
      items.forEach((ex) => {
        const eid = ex.exerciseId || ex.id;
        (ex.rows || []).forEach((row) => {
          if (!row.done || row.targetKind === 'seconds') return;
          const e1 = HS.E1rm ? HS.E1rm.e1rm(row.weight, Number(row.reps) + num(row.rir), 'brzycki') : 0;
          if (e1 > 0) recordPr(state, eid, e1, 1);
        });
      });
    });
    return state;
  }

  const StrengthAdapter = {
    ripped: false,
    hasStrength: function () {
      return true;
    },
    percentLiftCandidate,
    applyAutopilotToTasks,
    applyAutopilotVolumeToExercise,
    auditReasonText,
    exerciseNameFor,
    isVolumeDeferred,
    sessionLoadContext,
    sessionLoadFromRows,
    setWorkingMax,
    workingMaxAsOf,
    ingestCompletedSession,
    recordPr,
    trainingSystem,
    setTrainingSystem,
  };

  function applyAutopilotCondToTasks(state, tasks) {
    const rec = num(
      state &&
        state.dailyCheckins &&
        state.dailyCheckins[0] &&
        state.dailyCheckins[0].whoopRecovery,
    );
    const effort = rec && rec < 34 ? 'easy' : rec >= 67 ? 'medium' : 'easy';
    (Array.isArray(tasks) ? tasks : Object.values(tasks || {})).forEach((t) => {
      if (t && t.kind === 'conditioning' && t.autopilotCond) t.effort = t.effort || effort;
    });
    return tasks;
  }

  const EngineAdapter = {
    ripped: false,
    hasEngine: function () {
      return true;
    },
    hasStrength: function () {
      return false;
    },
    effortMeta: HE.effortMeta,
    zonesForProfile: HE.zonesForProfile,
    zoneKeyForBpm: HE.zoneKeyForBpm,
    hrTrimp: function (min, avg, profile, whoop) {
      return HE.hrTrimp(min, avg, profile, whoop);
    },
    condLoad: HE.condLoad,
    sessionPatchFromBuilder: HE.sessionPatchFromBuilder,
    tagEchoDeviceMetrics: HE.tagEchoDeviceMetrics,
    weeklyZoneSeconds: HE.weeklyZoneSeconds,
    applyAutopilotCondToTasks,
  };

  function gfn(name) {
    return typeof g[name] === 'function' ? g[name] : null;
  }

  function currentTask() {
    const fn = gfn('current');
    return fn ? fn() : null;
  }

  function StrengthOneSetLogger() {}
  StrengthOneSetLogger.renderTask = function (t) {
    const esc = gfn('esc') || ((s) => String(s ?? ''));
    const numG = gfn('num') || num;
    const fmt = gfn('fmt') || String;
    const restBtn = gfn('restBtn') || (() => '');
    const exerciseLinkHtml = gfn('exerciseLinkHtml') || ((n) => esc(n));
    const targetLabel = gfn('targetLabel') || ((row) => row.target || '—');
    const rowPrevious = gfn('rowPrevious') || (() => '');
    const lastRows = gfn('lastRows') || (() => []);
    const restSeconds = gfn('restSeconds') || ((n) => n || 90);
    const rowE1rmHint = gfn('rowE1rmHint') || (() => '');
    const headline = gfn('strengthLoadHeadlineHtml') ? g.strengthLoadHeadlineHtml(t) : '';
    t.rows = t.rows || [];
    const next = t.rows.find((r) => !r.done);
    if (!next) {
      t.complete = true;
      return (
        `<div class="card"><div class=title>${esc(t.name || 'Strength')}</div>` +
        `<div class=meta>All sets logged.</div>` +
        `<button class="btn primary block" style="margin-top:12px" onclick="nextTask()">Next</button></div>`
      );
    }
    const last = lastRows(t.exerciseId, t.name);
    const rest = restSeconds(t.restSec);
    const idx = t.rows.indexOf(next);
    return (
      `<div class="card logger-screen dial-strength"><div class=eyebrow>Hybrid Strength</div>` +
      `<div class=title>${exerciseLinkHtml(t.name, t.exerciseId, t.category)}</div>` +
      `<div class=meta>Set ${next.n || idx + 1} · ${esc(targetLabel(next))} · Rest ${fmt(rest)}</div>` +
      headline +
      `<div class=two style="margin-top:12px"><div class=field><label>Weight (kg)</label>` +
      `<input type=number id=strWeight value="${esc(next.weight)}" onchange="StrengthOneSetLogger.setField('weight',this.value)"></div>` +
      `<div class=field><label>${next.targetKind === 'seconds' ? 'Seconds' : 'Reps'}</label>` +
      `<input type=number id=strReps value="${esc(next.reps)}" onchange="StrengthOneSetLogger.setField('reps',this.value)"></div></div>` +
      `<div class=field><label>RIR</label><input type=number min=0 max=10 id=strRir value="${esc(next.rir || '')}" onchange="StrengthOneSetLogger.setField('rir',this.value)"></div>` +
      rowPrevious(last, idx) +
      rowE1rmHint(next) +
      `<div class=btns style="margin-top:12px">${restBtn(rest)}` +
      `<button class="btn primary block" onclick="StrengthOneSetLogger.logSet()">Log set</button></div></div>`
    );
  };
  StrengthOneSetLogger.renderSupersetTask = function (t) {
    return gfn('supersetTask') ? g.supersetTask(t) : StrengthOneSetLogger.renderTask((t.exercises || [])[0] || t);
  };
  StrengthOneSetLogger.setField = function (k, v) {
    const t = currentTask();
    if (!t || !t.rows) return;
    const row = t.rows.find((r) => !r.done);
    if (!row) return;
    row[k] = v;
    if (gfn('save')) g.save('str-field');
  };
  StrengthOneSetLogger.syncActiveRowFromDom = function (row) {
    if (typeof document === 'undefined' || !row) return;
    const w = document.getElementById('strWeight');
    const r = document.getElementById('strReps');
    const i = document.getElementById('strRir');
    if (w) row.weight = w.value;
    if (r) row.reps = r.value;
    if (i) row.rir = i.value;
  };
  StrengthOneSetLogger.logSet = function () {
    const t = currentTask();
    if (!t) return;
    const row = (t.rows || []).find((r) => !r.done);
    if (!row) {
      t.complete = true;
      if (gfn('nextTask')) g.nextTask();
      return;
    }
    StrengthOneSetLogger.syncActiveRowFromDom(row);
    if (gfn('seedRepsFromTarget')) g.seedRepsFromTarget(row);
    const error = gfn('validateStrengthRow') ? g.validateStrengthRow(row, t) : '';
    if (error) return g.alert ? g.alert(error) : null;
    row.done = true;
    t.complete = !(t.rows || []).some((r) => !r.done);
    const rest = gfn('restSeconds') ? g.restSeconds(t.restSec) : 90;
    if (gfn('save')) g.save('str-log');
    if (!t.complete && gfn('maybeStartRestAfterLog')) g.maybeStartRestAfterLog(rest, true);
    if (gfn('train')) g.train();
  };
  StrengthOneSetLogger.clearRestPhase = function () {};

  const CondSessionLogger = {
    ripped: false,
    renderSimpleCond: null,
    renderIntervalTask: null,
  };

  const CondIntervalAutoreg = {
    ripped: false,
    onWorkPhaseStart: function () {},
    onWorkEnd: function () {},
    beforeNextWork: function () {},
    intervalHtmlExtra: function () {
      return '';
    },
  };

  const BigMacBridge = {
    ripped: false,
    afterCheckin: function () {
      return Promise.resolve();
    },
    bootstrapCoordinator: function (state) {
      return state;
    },
    afterConditioningSessionSync: function (state, task, opts) {
      if (!state || !task) return;
      const load = EngineAdapter.condLoad({
        minutes: num(task.result && task.result.duration) / 60,
        avgHr: num(task.result && task.result.avgHr),
        profile: state.profile,
        zoneSeconds: task.result && task.result.zoneSeconds,
        rpe: num(task.result && task.result.rpe),
        effort: task.effort,
      });
      task.result = task.result || {};
      task.result.engineLoad = load;
      if (opts && opts.apply) {
        state.meta = state.meta || {};
        state.meta.lastEngineLoad = load.load;
      }
      return load;
    },
  };

  const CoordinatorAdapter = {
    ripped: false,
    bootstrapSilent: function (state) {
      return state;
    },
    activeSystem: function (state) {
      return trainingSystem(state);
    },
  };

  const syncStatus = { lastError: '', lastOk: false, lastAt: null, lastPushAt: null };

  function client() {
    if (g.Whoop && g.Whoop.client) return g.Whoop.client();
    throw new Error('Supabase client unavailable');
  }

  async function sessionUserId() {
    const data = await client().auth.getSession();
    if (data.error) throw data.error;
    return (data.data.session && data.data.session.user && data.data.session.user.id) || null;
  }

  function mergeRemoteEvents(local, remote, keyFn, newerFn) {
    const map = {};
    (local || []).concat(remote || []).forEach((e) => {
      if (!e) return;
      const k = keyFn(e);
      if (!k) return;
      const cur = map[k];
      if (!cur || newerFn(e, cur)) map[k] = e;
    });
    return Object.values(map);
  }

  async function reconcile(state) {
    state = state || {};
    ensureStrengthState(state);
    try {
      const uidAthlete = await sessionUserId();
      if (!uidAthlete) {
        syncStatus.lastError = 'auth_required';
        return state;
      }
      const sb = client();
      const wm = await sb
        .from('working_max_event')
        .select('id,athlete_id,exercise_id,value_kg,effective_at,source')
        .eq('athlete_id', uidAthlete);
      if (!wm.error) {
        const remote = (wm.data || []).map((r) => ({
          id: r.id,
          exerciseId: r.exercise_id,
          valueKg: num(r.value_kg),
          effectiveAt: r.effective_at,
          source: r.source,
        }));
        state.strengthState.workingMaxEvents = mergeRemoteEvents(
          state.strengthState.workingMaxEvents,
          remote,
          (e) => e.exerciseId,
          (a, b) => String(a.effectiveAt) > String(b.effectiveAt),
        );
      }
      const pr = await sb
        .from('pr_event')
        .select('athlete_id,exercise_id,value_kg,rep_count')
        .eq('athlete_id', uidAthlete);
      if (!pr.error) {
        const remote = (pr.data || []).map((r) => ({
          exerciseId: r.exercise_id,
          valueKg: num(r.value_kg),
          repCount: num(r.rep_count),
        }));
        state.strengthState.prEvents = mergeRemoteEvents(
          state.strengthState.prEvents,
          remote,
          (e) => e.exerciseId + ':' + e.repCount,
          (a, b) => num(a.valueKg) > num(b.valueKg),
        );
      }
      const eng = await sb.from('engine_session').select('session_id,zone_seconds,load,recorded_at').eq('athlete_id', uidAthlete);
      if (!eng.error) {
        (eng.data || []).forEach((row) => {
          const local = (state.sessions || []).find((s) => s.id === row.session_id);
          if (local && local.status === 'active') return;
          if (local && local.summary) local.summary.conditioningLoad = num(row.load);
        });
      }
      syncStatus.lastOk = true;
      syncStatus.lastError = '';
      syncStatus.lastAt = isoNow();
    } catch (e) {
      syncStatus.lastError = String(e.message || e);
      syncStatus.lastOk = false;
    }
    return state;
  }

  async function push(state) {
    state = state || {};
    ensureStrengthState(state);
    try {
      const uidAthlete = await sessionUserId();
      if (!uidAthlete) {
        syncStatus.lastError = 'auth_required';
        return { ok: false, reason: 'auth_required' };
      }
      const sb = client();
      for (const e of state.strengthState.workingMaxEvents || []) {
        const row = {
          id: e.id || uid(),
          athlete_id: uidAthlete,
          exercise_id: e.exerciseId,
          value_kg: num(e.valueKg),
          effective_at: e.effectiveAt || isoNow(),
          source: e.source || 'athlete',
        };
        const res = await sb.from('working_max_event').upsert(row);
        if (res.error) throw res.error;
      }
      for (const e of state.strengthState.prEvents || []) {
        const row = {
          athlete_id: uidAthlete,
          exercise_id: e.exerciseId,
          value_kg: num(e.valueKg),
          rep_count: Math.max(1, Math.round(num(e.repCount) || 1)),
        };
        const res = await sb.from('pr_event').upsert(row);
        if (res.error) throw res.error;
      }
      for (const s of state.sessions || []) {
        if (s.status === 'active') continue;
        const cond = s.summary && s.summary.conditioning;
        const zs = ((cond && cond[0] && cond[0].result && cond[0].result.zoneSeconds) || {});
        if (s.summary && (num(s.summary.conditioningLoad) > 0 || Object.keys(zs).length)) {
          await sb.from('engine_session').upsert({
            id: 'eng-' + s.id,
            athlete_id: uidAthlete,
            session_id: s.id,
            zone_seconds: zs,
            load: num(s.summary.conditioningLoad),
            recorded_at: isoNow(),
          });
        }
      }
      syncStatus.lastPushAt = isoNow();
      syncStatus.lastOk = true;
      syncStatus.lastError = '';
      return { ok: true };
    } catch (e) {
      syncStatus.lastError = String(e.message || e);
      syncStatus.lastOk = false;
      return { ok: false, error: syncStatus.lastError };
    }
  }

  let pushTimer = null;
  function schedulePush(state) {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      push(state).catch(function () {});
    }, 800);
  }

  const StrengthSync = {
    ripped: false,
    reconcile,
    push,
    schedulePush,
    getStatus: function () {
      return clone(syncStatus);
    },
  };

  g.HybridStrength = g.HybridStrength || HS;
  g.HybridEngine = g.HybridEngine || HE;
  g.StrengthAdapter = StrengthAdapter;
  g.EngineAdapter = EngineAdapter;
  g.StrengthSync = StrengthSync;
  g.BigMacBridge = BigMacBridge;
  g.CondIntervalAutoreg = CondIntervalAutoreg;
  g.StrengthOneSetLogger = StrengthOneSetLogger;
  g.CondSessionLogger = CondSessionLogger;
  g.CoordinatorAdapter = CoordinatorAdapter;

  return {
    StrengthAdapter,
    EngineAdapter,
    StrengthSync,
    StrengthOneSetLogger,
    BigMacBridge,
    CoordinatorAdapter,
  };
});
