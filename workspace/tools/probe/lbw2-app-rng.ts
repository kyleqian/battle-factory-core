// lbw2: like lbw1-app-rng.ts, but the stage's injected rngValue is replaced by STAGE_RNG (the ROM cursor at the stage frame) right after the stage runs.
// optional REBASE_FRAME REBASE_RNG: set rngValue after the tick of that frame (same as a trace appRngRebase; sticks only once the engine no longer reads the cursor from a live battle).
// usage: node tools/probe/lbw2-app-rng.ts TRACE.json OUT.json STAGE_RNG|keep [REBASE_FRAME REBASE_RNG]
import { readFileSync, writeFileSync } from "node:fs";
import "../compare/harnessPlayerName.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { presentationRngFromTrace } from "../../src/engine/presentationRngHost.ts";
import { APP_STAGES } from "../compare/appTrace.ts";
import { traceAdvances } from "../compare/traceReplay.ts";
import { loadCompareTrace } from "../compare/traceFile.ts";

const [tracePath, outPath, stageRng, rebaseFrame, rebaseRng] = process.argv.slice(2);
if (!tracePath || !outPath || !stageRng) throw new Error("usage: lbw2-app-rng.ts TRACE.json OUT.json STAGE_RNG|keep");
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
  rows.push({ f, rng: state.rngValue, mode: state.rngMode, free: state.lobbyFreeRoam !== null, att: state.lobbyAttendant !== null });
};
let stageSeen = 0;
const applyStage = (f: number): void => {
  if (!trace.appStage || trace.appStage.frame !== f) return;
  const stage = APP_STAGES[trace.appStage.id];
  if (!stage) throw new Error(`unknown app stage ${trace.appStage.id}`);
  stageSeen = state.rngValue;
  state = stage(state);
  if (stageRng !== "keep") state = { ...state, rngValue: Number(stageRng) >>> 0 };
};
applyStage(0);
snap(0);
for (const adv of traceAdvances(trace.segments)) {
  state = tick(state, adv.buttons);
  applyStage(adv.frame);
  if (rebaseFrame !== undefined && adv.frame === Number(rebaseFrame)) state = { ...state, rngValue: Number(rebaseRng) >>> 0 };
  snap(adv.frame);
}
writeFileSync(outPath, JSON.stringify({ trace: tracePath, stage: trace.appStage, rows }));
console.log(rows.length, "rows");
