// lbw1: per-frame engine rngValue along a compare trace (same app route as tools/compare/appTrace.ts renderAppTrace, no render).
// usage: node tools/probe/lbw1-app-rng.ts TRACE.json OUT.json [FRAME0_RNG]   (optional: override the app cursor at frame 0, experiment only)
import { readFileSync, writeFileSync } from "node:fs";
import "../compare/harnessPlayerName.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { presentationRngFromTrace } from "../../src/engine/presentationRngHost.ts";
import { APP_STAGES } from "../compare/appTrace.ts";
import { traceAdvances } from "../compare/traceReplay.ts";
import { loadCompareTrace } from "../compare/traceFile.ts";

const [tracePath, outPath, rebase0] = process.argv.slice(2);
if (!tracePath || !outPath) throw new Error("usage: lbw1-app-rng.ts TRACE.json OUT.json");
const trace = loadCompareTrace(tracePath);
const presentationRng = presentationRngFromTrace(trace);
let state = createInitialState({
  appRoute: trace.appRoute,
  battleScene: trace.battleScene,
  presentationSeed: presentationRng.seed,
  presentationRngPolicy: presentationRng.policy,
});
const rows: Array<Record<string, unknown>> = [];
const snap = (f: number): void => {
  rows.push({
    f,
    rng: state.rngValue,
    mode: state.rngMode,
    free: state.lobbyFreeRoam !== null,
    att: state.lobbyAttendant !== null,
    keep: state.lobbyStreakKept,
  });
};
const applyStage = (f: number): void => {
  if (!trace.appStage || trace.appStage.frame !== f) return;
  const stage = APP_STAGES[trace.appStage.id];
  if (!stage) throw new Error(`unknown app stage ${trace.appStage.id}`);
  state = stage(state);
};
if (rebase0 !== undefined) state = { ...state, rngValue: Number(rebase0) >>> 0 };
applyStage(0);
snap(0);
for (const adv of traceAdvances(trace.segments)) {
  state = tick(state, adv.buttons);
  applyStage(adv.frame);
  if (trace.appRngRebase && trace.appRngRebase.frame === adv.frame) {
    state = { ...state, rngValue: trace.appRngRebase.rngValue };
  }
  snap(adv.frame);
}
writeFileSync(outPath, JSON.stringify({ trace: tracePath, rows }));
console.log(rows.length, "rows");
