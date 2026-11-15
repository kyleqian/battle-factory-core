// lbw3: run a compare trace through the engine (the trace's own appStage + appRngRebase, as tools/compare/appTrace.ts does) and dump the per-frame
// gameplay cursor and the Lobby NPC state, to be compared with the ROM dump by tools/probe/lbw3-engine-compare.py.
// usage: node tools/probe/lbw3-engine-npcs.ts TRACE.json OUT.json
import { writeFileSync } from "node:fs";
import "../compare/harnessPlayerName.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { presentationRngFromTrace } from "../../src/engine/presentationRngHost.ts";
import { APP_STAGES } from "../compare/appTrace.ts";
import { traceAdvances } from "../compare/traceReplay.ts";
import { loadCompareTrace } from "../compare/traceFile.ts";

const [tracePath, outPath] = process.argv.slice(2);
if (!tracePath || !outPath) throw new Error("usage: lbw3-engine-npcs.ts TRACE.json OUT.json");
const trace = loadCompareTrace(tracePath);
const presentationRng = presentationRngFromTrace(trace);
let state = createInitialState({
  appRoute: trace.appRoute,
  battleScene: trace.battleScene,
  presentationSeed: presentationRng.seed,
  presentationRngPolicy: presentationRng.policy,
});
const rows: Array<Record<string, unknown>> = [];
const npc = (n: { x: number; y: number; prevX: number; prevY: number; facing: number; step: number; delay: number } | undefined) =>
  n === undefined ? null : [n.x, n.y, n.prevX, n.prevY, n.facing, n.step, n.delay];
const snap = (f: number): void => {
  const n = state.lobbyNpcs;
  const p = state.lobbyFreeRoam;
  rows.push({
    f,
    rng: state.rngValue,
    free: p !== null,
    att: state.lobbyAttendant !== null,
    w: npc(n?.woman),
    m: npc(n?.fatMan),
    p: p === null ? null : [p.x, p.y, p.stepRemaining, p.stepDir, p.turnRemaining, p.bumpElapsed, p.facing],
  });
};
const applyStage = (f: number): void => {
  if (!trace.appStage || trace.appStage.frame !== f) return;
  state = APP_STAGES[trace.appStage.id]!(state);
};
applyStage(0);
snap(0);
for (const adv of traceAdvances(trace.segments)) {
  state = tick(state, adv.buttons);
  applyStage(adv.frame);
  if (trace.appRngRebase && adv.frame === trace.appRngRebase.frame) state = { ...state, rngValue: trace.appRngRebase.rngValue };
  snap(adv.frame);
}
writeFileSync(outPath, JSON.stringify({ trace: tracePath, rows }));
console.log(rows.length, "rows");
