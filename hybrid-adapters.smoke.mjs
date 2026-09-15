/**
 * StrengthAdapter / EngineAdapter compute loads and zones (not ripped stubs).
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const dir = dirname(fileURLToPath(import.meta.url));

function runFile(sandbox, file) {
  const src = readFileSync(join(dir, file), 'utf8');
  vm.runInNewContext(src, sandbox);
}

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sandbox = { console, module: { exports: {} }, globalThis: {}, require };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
runFile(sandbox, 'packages/hybrid-strength.js');
runFile(sandbox, 'packages/the-engine.js');
sandbox.module = { exports: {} };
runFile(sandbox, 'strength-sync.js');

const Strength = sandbox.StrengthAdapter;
const Engine = sandbox.EngineAdapter;

if (!Strength || Strength.ripped) throw new Error('StrengthAdapter still ripped');
if (!Engine || Engine.ripped) throw new Error('EngineAdapter still ripped');
if (!Strength.hasStrength()) throw new Error('hasStrength false');
if (!Engine.hasEngine()) throw new Error('hasEngine false');

const state = {
  exercises: [{ id: 'core-back-squat', name: 'Back Squat' }],
  strengthState: { workingMaxEvents: [], prEvents: [], loadHints: {} },
  settings: {},
  sessions: [
    {
      id: 's1',
      date: '2026-09-15',
      status: 'completed',
      tasks: [
        {
          kind: 'conditioning',
          result: { duration: 1200, avgHr: 150, zoneSeconds: { recovery: 120, aerobic: 600, anaerobic: 180, peak: 0 } },
        },
      ],
      summary: { conditioningLoad: 12 },
    },
    { id: 'active-1', status: 'active', date: '2026-09-15', tasks: [] },
  ],
  profile: { restingHr: 60, maxHr: 190, sex: 'male' },
};

if (!Strength.setWorkingMax(state, 'core-back-squat', 140).ok) throw new Error('setWorkingMax failed');
const ctx = Strength.sessionLoadContext(state, { exerciseId: 'core-back-squat', loadExpr: { exprKind: 'pct_of_max', exprArg: 0.7 } }, '2026-09-15T12:00:00.000Z');
if (!ctx.ok || !/97\.5 kg/.test(ctx.headline)) throw new Error('sessionLoadContext expected 70% of 140 rounded, got ' + ctx.headline);

const load = Strength.sessionLoadFromRows([
  { done: true, weight: 100, reps: 5, targetKind: 'reps' },
  { done: true, weight: 100, reps: 5, targetKind: 'reps' },
]);
if (load !== 1000) throw new Error('sessionLoadFromRows expected 1000, got ' + load);

if (!Strength.percentLiftCandidate('Back Squat', 'Strength — Squat', state, 'core-back-squat')) {
  throw new Error('percentLiftCandidate squat');
}

const zones = Engine.zonesForProfile({ maxHr: 190, restingHr: 60, recovery: 80, recoveryKnown: true });
if (!zones.find((z) => z.key === 'peak')) throw new Error('zones missing peak');
if (Engine.zoneKeyForBpm(zones[0].lo, zones) !== 'recovery') throw new Error('zoneKeyForBpm recovery');

const trimp = Engine.hrTrimp(20, 150, state.profile);
if (!(trimp > 0)) throw new Error('hrTrimp should score');

const cond = Engine.condLoad({ minutes: 20, avgHr: 150, profile: state.profile });
if (!cond.scored || !(cond.load > 0)) throw new Error('condLoad should score');

const weekly = Engine.weeklyZoneSeconds(state.sessions, '2026-09-15', 7);
if (weekly.aerobic !== 600) throw new Error('weeklyZoneSeconds aerobic');

if (!sandbox.strengthSyncSrc && true) {
  const src = readFileSync(join(dir, 'strength-sync.js'), 'utf8');
  if (!src.includes("local.status === 'active'")) throw new Error('strength-sync missing active session guard');
}

Strength.setTrainingSystem(state, 'engine');
if (Strength.trainingSystem(state) !== 'engine') throw new Error('trainingSystem switch');
Strength.setTrainingSystem(state, 'strength');

const indexHtml = readFileSync(join(dir, 'index.html'), 'utf8');
if (indexHtml.includes('ENGINE WIRING RIPPED')) throw new Error('index.html still has ripped boot proxy');
if (!indexHtml.includes('strength-sync.js')) throw new Error('index.html must load strength-sync.js');
if (!indexHtml.includes('setTrainingSystem')) throw new Error('index.html missing training system settings switch');

const coachHtml = readFileSync(join(dir, 'coach.html'), 'utf8');
if (!coachHtml.includes('setCoachTrainingSystem')) throw new Error('coach.html missing Engine/Strength switch');

if (!existsSync(join(dir, 'supabase/migrations/20260827_coach_publish_assigned_session.sql'))) {
  throw new Error('missing assigned_session migration');
}
if (!existsSync(join(dir, 'supabase/migrations/20260915_restore_strength_engine.sql'))) {
  throw new Error('missing engine/strength migration');
}

console.log('hybrid-adapters: ok', { load, trimp: Number(trimp.toFixed(2)), zoneCount: zones.length });
