/**
 * ISSUES #97 remainder (docs/turn5-resolve-offc-tail-diagnosis.md): the
 * app-side half of the `turn5-resolve-off-c` trailing-47-frame instrument,
 * sibling to `dump-turn5-resolve-offc-tail-probe.py`'s RAM ground truth.
 * Same "drive the real engine via createInitialState/tick, read state
 * directly, no `src/` edit" pattern `analyze-turn5-resolve-dispatch-app-
 * series.ts` established.
 *
 * Records, at every tick in [6720, 6815]:
 *   (i) `turn5PidgeottoHealthboxSlideDx(t)` (battleScene.ts:11147-11149)
 *       plus the raw `TURN5_PIDGEOTTO_SETTLE_TICK` anchor it's built on -
 *       the exact gate that makes `drawTurn6FieldBase` skip
 *       `drawSendOutHealthbox` for PIDGEOTTO entirely (battleScene.ts:14834-
 *       14835, `pidgeottoHealthboxDx !== null` check);
 *  (ii) `turn5MaterializeCoeff(t)` plus the three materialize/stretch/settle
 *       tick anchors, for cross-reference against the RAM probe's OBJ
 *       palette row 1 (PIDGEOTTO's own sprite-tint fade, already RAM-
 *       confirmed elsewhere - recorded here only as a receipt, not
 *       re-derived); and
 *  (iii) four corner/background RGBA pixel samples from the actual
 *       rendered framebuffer (`render(state)`, `core.ts:3538`) at
 *       screen coordinates chosen to avoid PIDGEOTTO_CORNER (144,19)'s
 *       sprite region and the top-left healthbox region, to directly show
 *       whether the app's OWN rendered background ever varies over time in
 *       this window (it should not - no call site in
 *       `drawTurn5RockSlideWindow`/`drawTurn6FieldBase` passes a
 *       time-varying blend into `drawTileBg`).
 *
 * Run: node --experimental-strip-types tools/probe/analyze-turn5-resolve-offc-tail-app-series.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createInitialState, tick, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { traceAdvances } from "../compare/traceReplay.ts";
import type { Trace } from "../compare/oracleClient.ts";
import {
  TURN5_BALL_HANDOFF_TICK,
  TURN5_PIDGEOTTO_SETTLE_TICK,
  TURN5_STRETCH_TICK,
  turn5PidgeottoHealthboxSlideDx,
  turn5MaterializeCoeff,
  turn5BgFadeY as appTurn5BgFadeY,
} from "../../src/engine/battleScene.ts";

// `turn5BgFadeY` is exported live from `battleScene.ts` as of the
// 2026-08-18 ISSUES #97 remainder fix (docs/turn5-resolve-offc-tail-
// diagnosis.md §4d) - this probe now reads the CURRENT app formula
// directly instead of a frozen local copy, so a rerun always reflects
// today's `src/` state, not the pre-fix snapshot this file used to pin.

const TRACE_PATH = new URL("../compare/traces/turn5-resolve-off-a.json", import.meta.url);
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

const RANGE: readonly [number, number] = [6720, 6815];
function inRange(t: number): boolean {
  return t >= RANGE[0] && t <= RANGE[1];
}

// Background pixel probes: screen corners well outside PIDGEOTTO_CORNER
// (144,19)'s ~64x64 sprite/ball/particle region and outside the top-left
// healthbox's own footprint (roughly x0-90, y0-40) - chosen to sample
// terrain/sky background pixels a BG-row-1/2/3 white flash would touch.
// `(230,4)`/`(230,108)` are OUTSIDE `staticBgPixel`'s own opaque footprint at
// these ticks (index-0/transparent, `drawStaticBgShiftedY`'s `if (!c)
// continue` skips them) - kept only as an "untouched corner" negative
// control. `(12,108)`/`(120,60)` land on opaque terrain tiles (confirmed via
// a grid scan this session) and DO carry the app's own `fadeY` blend.
const PIXEL_PROBES: ReadonlyArray<readonly [string, number, number]> = [
  ["negControl_topRight", 230, 4],
  ["opaqueTerrain_120_60", 120, 60],
  ["opaqueTerrain_12_108", 12, 108],
  ["negControl_bottomRight", 230, 108],
];

function samplePixels(fb: Uint8Array): Record<string, readonly [number, number, number, number]> {
  const out: Record<string, readonly [number, number, number, number]> = {};
  for (const [name, x, y] of PIXEL_PROBES) {
    const offset = (y * 240 + x) * 4;
    out[name] = [fb[offset]!, fb[offset + 1]!, fb[offset + 2]!, fb[offset + 3]!];
  }
  return out;
}

let state: EngineState = createInitialState({ appRoute: trace.appRoute });
let frame = 0;

const rows: Array<Record<string, unknown>> = [];

function recordIfInRange(): void {
  if (!inRange(frame)) return;
  const fb = render(state);
  rows.push({
    tick: frame,
    healthboxSlideDx: turn5PidgeottoHealthboxSlideDx(frame),
    materializeCoeff: turn5MaterializeCoeff(frame),
    bgFadeY: appTurn5BgFadeY(frame),
    materializeActive: frame >= TURN5_BALL_HANDOFF_TICK + 19 && frame < TURN5_PIDGEOTTO_SETTLE_TICK,
    stretchPhase: frame >= TURN5_STRETCH_TICK,
    pixels: samplePixels(fb),
  });
}

recordIfInRange();
for (const advance of traceAdvances(trace.segments)) {
  state = tick(state, advance.buttons);
  frame = advance.frame;
  recordIfInRange();
}

// Reduce to change-only rows for the pixel probes (any pixel differing from
// the FIRST recorded row's value at that same coordinate would prove the app
// itself varies its background over this window).
const baseline = rows[0]!.pixels as Record<string, readonly [number, number, number, number]>;
const pixelDrift: Record<string, Array<{ tick: number; was: unknown; now: unknown }>> = {};
for (const [name] of PIXEL_PROBES) {
  pixelDrift[name] = [];
  for (const row of rows) {
    const px = (row.pixels as Record<string, readonly [number, number, number, number]>)[name]!;
    const base = baseline[name]!;
    if (px[0] !== base[0] || px[1] !== base[1] || px[2] !== base[2] || px[3] !== base[3]) {
      pixelDrift[name]!.push({ tick: row.tick, was: base, now: px });
    }
  }
}

const outPath = new URL("../../artifacts/turn5-resolve-offc-tail-app-series.json", import.meta.url);
writeFileSync(outPath, JSON.stringify({
  sourceTrace: "tools/compare/traces/turn5-resolve-off-a.json (76-segment script shared by all 6 confirm/resolve-off traces plus turn5-reset-off, verified by sha256)",
  range: RANGE,
  constants: { TURN5_BALL_HANDOFF_TICK, TURN5_PIDGEOTTO_SETTLE_TICK, TURN5_STRETCH_TICK },
  pixelProbeCoords: PIXEL_PROBES,
  pixelDriftAnyTick: pixelDrift,
  rows,
}, null, 0));
console.log(`wrote ${rows.length} rows to ${outPath.pathname}`);
for (const [name, drift] of Object.entries(pixelDrift)) {
  console.log(`${name}: ${drift.length === 0 ? "NO drift across the whole window (frozen background)" : `${drift.length} drifted ticks`}`);
}
