import { createInitialState, tick } from "../../src/engine/core.ts";
import { traceAdvances } from "../compare/traceReplay.ts";
import { APP_STAGES } from "../compare/appTrace.ts";
import { readFileSync } from "node:fs";

const trace = JSON.parse(readFileSync("tools/compare/traces-groundtruth/mid-battle-switch-pacing-b-off.json", "utf8"));
let state = createInitialState({ appRoute: trace.appRoute });
let frame = 0;
const window = new Set<number>();
for (let f = 1256; f <= 1412; f++) window.add(f);

const applyStage = (): void => {
  if (!trace.appStage || trace.appStage.frame !== frame) return;
  const stage = APP_STAGES[trace.appStage.id];
  if (!stage) throw new Error(`unknown app stage ${trace.appStage.id}`);
  state = stage(state);
};
applyStage();

for (const advance of traceAdvances(trace.segments)) {
  state = tick(state, advance.buttons);
  frame = advance.frame;
  applyStage();
  if (window.has(frame)) {
    const orch = state.factoryRoundBattleOrchestrator;
    const res = orch?.battleResolutionPresentation ?? null;
    const cmd = orch?.battleCommandPresentation ?? null;
    if (res) {
      const seg = res.segments[res.segmentIndex];
      const c = seg?.commands[res.commandIndex];
      const sd = res.sourceDecision;
      console.log(`f${frame} RES res=${sd?.kind} segIdx=${res.segmentIndex} phase=${res.lifecycle.phase} pe=${res.lifecycle.phaseElapsed} cmdIdx=${res.commandIndex} cmdType=${c?.type ?? "-"}`);
    } else if (cmd) {
      console.log(`f${frame} CMD phase=${cmd.lifecycle.phase} pe=${cmd.lifecycle.phaseElapsed} pending=${cmd.pendingDecision?.kind ?? "-"}`);
    } else {
      console.log(`f${frame} <none>`);
    }
  }
}
