/**
 * ISSUES #97 remainder, SIDE-lane instrument, follow-up to
 * `analyze-turn5-resolve-offc-materialize-tint-probe.ts`'s per-coordinate
 * coefficient inversion: that probe found a clean `oracle_coeff(t) ==
 * app_coeff(t-1)` signature at 3 sample coordinates for ticks 6776-6783
 * (the one span where `turn5PidgeottoFrame(t)` is constant and matches the
 * t=6785 baseline frame used for inversion) - the SAME "one-tick-early
 * falling edge" shape §4c/§4d already fixed for `TURN5_BG_FADE_Y`.
 *
 * This probe tests that "app(t) should have rendered what it actually
 * renders at t+1" hypothesis directly in PIXEL space, whole-frame, with NO
 * coefficient inversion or base-color assumption (so it isn't confounded by
 * `turn5PidgeottoFrame`'s frame-0/frame-1 toggle at 6761/6766/6776/6786 the
 * way the per-coordinate probe's fixed t=6785 baseline was for 6768-6775):
 * for each render tick t, diff oracle-t.png against BOTH app-t.png (today's
 * actual mismatch) and app-(t-1).png (the shift hypothesis). If the shifted
 * diff collapses relative to the unshifted one across a span, that span's
 * residual is a pure one-tick-late timing bug, not a value/curve error.
 *
 * Run: node --experimental-strip-types tools/probe/analyze-turn5-resolve-offc-materialize-shift-probe.ts <run-out-dir> <startTick> <endTick>
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { diffPngs } from "../compare/diff.ts";

const [, , runDirArg, startArg, endArg] = process.argv;
const runDir = runDirArg ?? join(import.meta.dirname, "../compare/out/latest");
const start = Number(startArg ?? 6763);
const end = Number(endArg ?? 6790);

function pad(t: number): string {
  return String(t).padStart(5, "0");
}
function load(name: string): Buffer {
  return readFileSync(join(runDir, name));
}

console.log("tick | unshifted(oracle[t] vs app[t]) | shifted(oracle[t] vs app[t-1])");
for (let t = start; t <= end; t += 1) {
  const oracle = load(`oracle-${pad(t)}.png`);
  const appNow = load(`app-${pad(t)}.png`);
  const unshifted = diffPngs(oracle, appNow);
  let shiftedLabel = "n/a (no t-1 frame)";
  try {
    const appPrev = load(`app-${pad(t - 1)}.png`);
    const shifted = diffPngs(oracle, appPrev);
    shiftedLabel = `${shifted.diffPixels}px`;
  } catch {
    // t-1 outside the captured range
  }
  console.log(`${t} | ${unshifted.diffPixels}px | ${shiftedLabel}`);
}
