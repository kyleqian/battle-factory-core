// S7 worktree probe, ISSUES #30: forensics on candidate A's own remaining
// ~228px residual (docs/feather-order-notes.md), now that the half-texel
// sampling-center lead is ELIMINATED (render-feather-halftexel-candidates.ts:
// every nonzero half-texel variant is strictly worse than the current
// floor-only convention) AND candidate A is ADOPTED IN THE ENGINE (ISSUES
// #30, this worktree session - `compareFeatherDrawOrder` now implements the
// simulated sSpriteOrder tiebreak directly, so `renderAppTrace`'s own output
// - "shipped" below - already IS candidate A's real render, not a proxy).
//
// Dumps a BUCKETED SAMPLE of mismatched pixels (target ~20-30, spread across
// several ticks rather than front-loaded on the window's first few ticks) for
// a real proportion estimate between the two signature classes the prior
// session found anecdotally (2-vs-2, 4 pixels total): (a) soft-gradient
// white/blue tones close to the feather sprite's own palette entries, vs (b)
// larger deltas landing on colors far from every feather palette entry
// (Onix's own gray body shading, at the priority-split occlusion boundary).
// Classification is a per-pixel heuristic (nearest feather-palette-entry
// Euclidean distance on the ORACLE's own color, thresholded) - the same
// qualitative test the prior session applied by eye to 4 pixels, just
// applied uniformly and at N=~20-30 for a real ratio instead of an anecdote.
//
// Still reuses `patchFullLayer`/`uniformPolicy(0,0)` from
// render-feather-halftexel-candidates.ts (the SAME matchesReal-gated patch
// used to compute the verified 228px floor) rather than a naive re-composite,
// so the pixels shown here are genuinely part of that verified residual, not
// an artifact of skipping the safety gate - even though shipped==candidate A
// now, the patch step still matters for cross-checking `matchesReal`
// isolation and for keeping this script's own methodology unchanged from the
// prior session's (so results are comparable).
//
// Usage: npx tsx tools/probe/forensics-feather-residual.ts
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { renderAppTrace } from "../compare/appTrace.ts";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { compareFeatherDrawOrder, turn6FeatherSprites } from "../../src/engine/featherDance.ts";
import { patchFullLayer, uniformPolicy } from "./render-feather-halftexel-candidates.ts";
import featherPaletteAsset from "../../src/assets/gen/battle-anim-white-feather.json" with { type: "json" };

const FEATHER_RENDER_LAG = 1;
const SAMPLE_TARGET = 30;
const PER_TICK_CAP = 3; // forces spreading across ticks instead of front-loading one tick
// Nearest-feather-palette-entry Euclidean distance (0-255 per channel) below
// which a pixel counts as "close to the feather art's own tones" (class a).
// The two REAL signatures found by the prior session's 4-pixel sample sat at
// delta <=66 (class a, e.g. (247,247,255) vs (255,255,255)) and delta
// 123-132 (class b, (132,123,123), Onix's own warm gray - nowhere near any
// feather palette entry). 40 sits cleanly between those two clusters.
const CLASS_A_DISTANCE_THRESHOLD = 40;

const FEATHER_PALETTE: [number, number, number][] = (featherPaletteAsset as { palette: { r: number; g: number; b: number }[] }).palette
  .map((p) => [p.r, p.g, p.b] as [number, number, number]);

function nearestPaletteDistance(r: number, g: number, b: number): number {
  let best = Infinity;
  for (const [pr, pg, pb] of FEATHER_PALETTE) {
    const d = Math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2);
    if (d < best) best = d;
  }
  return best;
}

interface CandidateDump {
  candidates: { a: Record<string, number[]> };
}

interface Sample {
  tick: number;
  x: number;
  y: number;
  candidateA: [number, number, number];
  oracle: [number, number, number];
  distToFeatherPalette: number;
  bucket: "a-soft-gradient" | "b-non-feather-signature";
}

async function main() {
  execFileSync("python3", ["tools/probe/dump-feather-order-candidates.py"], { stdio: "inherit" });
  const dumpAll = JSON.parse(readFileSync("tools/probe/out/feather-order-candidates.json", "utf8")) as Record<string, CandidateDump>;
  const candAOrder = dumpAll.turn6!.candidates.a;
  const noShift = uniformPolicy(0, 0);

  const base = JSON.parse(readFileSync("tools/compare/traces/turn6-menu.json", "utf8")) as Trace;
  const captureFrames = range(7421, 7549);
  const trace: Trace = { segments: base.segments, captureFrames };

  const [oracleResult, appCaptures] = await Promise.all([runOracleTrace(trace), renderAppTrace(trace)]);
  const appByFrame = new Map(appCaptures.map((c) => [c.frame, c]));

  const samples: Sample[] = [];
  for (const oc of oracleResult.captures) {
    if (samples.length >= SAMPLE_TARGET) break;
    const app = appByFrame.get(oc.frame);
    if (!app) continue;
    const shippedRgba = app.rgba instanceof Uint8Array ? app.rgba : new Uint8Array(app.rgba);
    const oracleRgba = oc.rgba;
    const ramTick = oc.frame - FEATHER_RENDER_LAG;
    const liveSprites = turn6FeatherSprites(oc.frame);
    if (liveSprites.length === 0) continue;

    const frame = new Uint8Array(shippedRgba);
    const order = candAOrder[String(ramTick)] ?? [];
    patchFullLayer(frame, shippedRgba, liveSprites, order, noShift, ramTick);

    const shippedOrder = liveSprites.slice().sort(compareFeatherDrawOrder);
    let printedHeader = false;
    let tickCount = 0;
    for (let y = 0; y < 160 && tickCount < PER_TICK_CAP && samples.length < SAMPLE_TARGET; y += 1) {
      for (let x = 0; x < 240 && tickCount < PER_TICK_CAP && samples.length < SAMPLE_TARGET; x += 1) {
        const o = (y * 240 + x) * 4;
        if (frame[o] === oracleRgba[o] && frame[o + 1] === oracleRgba[o + 1] && frame[o + 2] === oracleRgba[o + 2]) continue;
        if (!printedHeader) {
          console.log(`\n=== tick ${oc.frame} (RAM tick ${ramTick}) ===`);
          console.log(`live feathers: ${liveSprites.map((s) => `slot${s.slot}(pri${s.priority})`).join(", ")}`);
          console.log(`engine (candidate A) draw order: ${shippedOrder.map((s) => s.slot).join(",")}`);
          printedHeader = true;
        }
        const candidateA: [number, number, number] = [frame[o]!, frame[o + 1]!, frame[o + 2]!];
        const oracleColor: [number, number, number] = [oracleRgba[o]!, oracleRgba[o + 1]!, oracleRgba[o + 2]!];
        const dist = nearestPaletteDistance(...oracleColor);
        const bucket: Sample["bucket"] = dist <= CLASS_A_DISTANCE_THRESHOLD ? "a-soft-gradient" : "b-non-feather-signature";
        samples.push({ tick: oc.frame, x, y, candidateA, oracle: oracleColor, distToFeatherPalette: dist, bucket });
        tickCount += 1;
        console.log(
          `  mismatch @ (${x},${y}): candidateA=(${candidateA.join(",")}) oracle=(${oracleColor.join(",")}) shipped=(${shippedRgba[o]},${shippedRgba[o + 1]},${shippedRgba[o + 2]}) nearestFeatherPaletteDist=${dist.toFixed(1)} -> ${bucket}`,
        );
        for (const s of liveSprites) {
          const dx = x - s.centerX;
          const dy = y - s.centerY;
          if (Math.abs(dx) <= 16 && Math.abs(dy) <= 16) {
            console.log(`    nearby slot${s.slot}: center=(${s.centerX},${s.centerY}) matrix a=${s.pa} b=${s.pb} c=${s.pc} d=${s.pd} priority=${s.priority} dx=${dx} dy=${dy}`);
          }
        }
      }
    }
  }

  const classA = samples.filter((s) => s.bucket === "a-soft-gradient").length;
  const classB = samples.length - classA;
  console.log(`\n=== bucketed proportion (N=${samples.length} sampled residual pixels, target ${SAMPLE_TARGET}, cap ${PER_TICK_CAP}/tick across the 7421-7549 window) ===`);
  console.log(`  class (a) soft-gradient (near feather palette, dist<=${CLASS_A_DISTANCE_THRESHOLD}): ${classA} (${((100 * classA) / samples.length).toFixed(0)}%)`);
  console.log(`  class (b) non-feather signature (dist>${CLASS_A_DISTANCE_THRESHOLD}, Onix-boundary candidate): ${classB} (${((100 * classB) / samples.length).toFixed(0)}%)`);
  const ticksTouched = new Set(samples.map((s) => s.tick)).size;
  console.log(`  spread across ${ticksTouched} distinct ticks`);
}

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i += 1) out.push(i);
  return out;
}

main().catch((e) => { console.error(e); process.exit(1); });
