import { createInitialState, tick } from "../../../src/engine/core.ts";
import { traceAdvances } from "../traceReplay.ts";
import traceJson from "../traces/factory-brain-gold-walkup-speech-close-off.json" with { type: "json" };
import { APP_STAGES } from "../appTrace.ts";

const trace = traceJson as any;
let state = createInitialState({ appRoute: trace.appRoute });
let frame = 0;
const applyStage = (): void => {
  if (!trace.appStage || trace.appStage.frame !== frame) return;
  const stage = (APP_STAGES as any)[trace.appStage.id];
  if (!stage) throw new Error(`unknown app stage ${trace.appStage.id}`);
  state = stage(state);
};
applyStage();

const report = (label: string) => {
  const b = state.battleRoom!;
  console.log(`${label} frame=${frame} phase=${b.phase} elapsed=${b.elapsed}`);
};
report("start");
for (const advance of traceAdvances(trace.segments)) {
  state = tick(state, advance.buttons);
  frame = advance.frame;
  applyStage();
  if (frame === 40 || frame === 118 || frame === 113 || frame === 112 || frame === 125) report("tick");
}
