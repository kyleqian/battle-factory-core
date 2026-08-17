// Scratch probe: render factory-brain-gold-walkup-speech-close-off.json
// frame-by-frame through the real engine (createInitialState/tick/render,
// same as tools/compare/appTrace.ts) and sample the same corner pixel
// (2,2) the oracle-side Python probe used, to compare the app's own
// gray-flicker coefficient sequence end-to-end against the banked oracle
// sequence without going through the compare tool's mismatch-count. Not
// committed as a permanent tool - see docs/noland-brain-intro-gold-ground-
// truth.md §8".
import { createInitialState, render, tick } from "../../../src/engine/core.ts";
import { traceAdvances } from "../traceReplay.ts";
import traceJson from "../traces/factory-brain-gold-walkup-speech-close-off.json" with { type: "json" };
import { APP_STAGES } from "../appTrace.ts";

// faded5 -> y (even values only, per grayFlickerY's own output range) for a
// pure-black (c5=0) pixel blended toward GRAY_TARGET5=11.
const FADED5_TO_Y = new Map<number, number>();
for (let y = 0; y <= 16; y += 2) FADED5_TO_Y.set((11 * y) >> 4, y);

// Oracle's own per-trace-frame y sequence, banked from
// pre-checkpoint-frame-*.png pixel (2,2) sampling (abs frames 2495-2620,
// preCheckpointFrameOffset 2495) - see docs §8" for the extraction script.
const ORACLE_Y: number[] = [
  ...Array(62).fill(0),
  2, 4, 6, 8, 10, 12, 14, 16, 14, 12, 10, 8, 6, 4, 2, 0,
  2, 4, 6, 8, 10, 12, 14, 16, 14, 12, 10, 8, 6, 4, 2, 0,
  2, 4, 6, 8, 10, 12, 14, 16, 14, 12, 10, 8, 6, 4, 2, 0,
  ...Array(16).fill(0),
];

const trace = traceJson as any;
let state = createInitialState({ appRoute: trace.appRoute });
let frame = 0;

const applyStage = (): void => {
  if (!trace.appStage || trace.appStage.frame !== frame) return;
  const stage = (APP_STAGES as any)[trace.appStage.id];
  if (!stage) throw new Error(`unknown app stage ${trace.appStage.id}`);
  state = stage(state);
};

const appY: number[] = [];
const sample = (): void => {
  const rgba = render(state);
  const off = (2 * 240 + 2) * 4;
  const r = rgba[off]!;
  const faded5 = r >> 3;
  appY.push(FADED5_TO_Y.get(faded5) ?? -1);
};

applyStage();
sample();

for (const advance of traceAdvances(trace.segments)) {
  state = tick(state, advance.buttons);
  frame = advance.frame;
  applyStage();
  sample();
}

let mismatches = 0;
for (let i = 0; i < ORACLE_Y.length; i += 1) {
  if (appY[i] !== ORACLE_Y[i]) {
    mismatches += 1;
    console.log(`mismatch frame ${i}: app=${appY[i]} oracle=${ORACLE_Y[i]}`);
  }
}
console.log(`checked ${ORACLE_Y.length} frames, ${mismatches} mismatches`);
