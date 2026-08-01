// ISSUES #56 item 2, round 3 (MAGNETON-side discriminator probe): app-side
// per-tick series for interactive-generated-intro-off around its own
// special-case-fitted window (PROGRESS #743/0c4dab29's frame 1492), read
// directly off the running engine - read-only, no src/ file touched.
//
// Mirrors analyze-issue56-frames-444-536-app-series.ts's technique but
// drives the REAL recorded trace (traces-groundtruth/battle1-intro.json +
// interactive-generated-intro-off.json's own appendSegments), the exact
// same replay tools/compare/appTrace.ts's renderAppTrace() performs for
// this fixture (no appStage - this fixture needs no synthetic state).
//
// Run: node --experimental-strip-types tools/probe/analyze-issue56-introoff-app-series.ts

import { readFileSync } from "node:fs";
import { createInitialState, tick, render } from "../../src/engine/core.ts";
import { traceAdvances } from "../../tools/compare/traceReplay.ts";
import { generatedBattleIntroSourceClock } from "../../src/engine/battleScene.ts";

const tracePath = new URL("../compare/traces/interactive-generated-intro-off.json", import.meta.url);
const traceFile = JSON.parse(readFileSync(tracePath, "utf8")) as {
  sourceTrace: string;
  sourceSegmentCount: number;
  appendSegments: { frames: number; buttons?: string[] }[];
  appRoute: string;
};
const sourcePath = new URL(traceFile.sourceTrace, tracePath);
const source = JSON.parse(readFileSync(sourcePath, "utf8")) as {
  segments: { frames: number; buttons?: string[] }[];
};
const segments = [
  ...source.segments.slice(0, traceFile.sourceSegmentCount),
  ...traceFile.appendSegments,
];

function rgbAt(rgba: Uint8Array, x: number, y: number): string {
  const o = (y * 240 + x) * 4;
  return `(${rgba[o]},${rgba[o + 1]},${rgba[o + 2]})`;
}

const WINDOW = { start: 1485, end: 1500 };

let state = createInitialState({ appRoute: traceFile.appRoute as "generated-orchestrator" });
console.log("frame,elapsed,t,px158_40,px160_40");

function logFrame(frame: number): void {
  const intro = state.factoryRoundBattleOrchestrator?.battleStartIntro;
  const elapsed = intro?.elapsed ?? -1;
  const t = generatedBattleIntroSourceClock(elapsed);
  const rgba = render(state);
  console.log([frame, elapsed, t, rgbAt(rgba, 158, 40), rgbAt(rgba, 160, 40)].join(","));
}

for (const advance of traceAdvances(segments)) {
  state = tick(state, advance.buttons);
  if (advance.frame >= WINDOW.start && advance.frame <= WINDOW.end) logFrame(advance.frame);
  if (advance.frame > WINDOW.end) break;
}
