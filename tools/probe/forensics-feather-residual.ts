// S7 worktree probe, ISSUES #30: forensics on candidate A's own remaining ~230px
// residual (docs/feather-order-notes.md), now that the half-texel sampling-center
// lead is ELIMINATED (render-feather-halftexel-candidates.ts: every nonzero
// half-texel variant is strictly worse than the current floor-only convention).
// Dumps a handful of mismatched pixels' exact expected-vs-got colors plus the
// covering feathers' own matrix/position state, for a future session's mechanism
// classification (same discipline as ISSUES #23's characterization). Reuses
// `patchFullLayer`/`uniformPolicy(0,0)` from render-feather-halftexel-candidates.ts
// (the SAME matchesReal-gated patch used to compute the verified 228px floor) rather
// than a naive re-composite, so the pixels shown here are genuinely part of that
// verified residual, not an artifact of skipping the safety gate.
//
// Usage: npx tsx tools/probe/forensics-feather-residual.ts
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { renderAppTrace } from "../compare/appTrace.ts";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { compareFeatherDrawOrder, turn6FeatherSprites } from "../../src/engine/featherDance.ts";
import { patchFullLayer, uniformPolicy } from "./render-feather-halftexel-candidates.ts";

const FEATHER_RENDER_LAG = 1;

interface CandidateDump {
  candidates: { a: Record<string, number[]> };
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

  let shown = 0;
  for (const oc of oracleResult.captures) {
    if (shown >= 4) break;
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
    for (let y = 0; y < 160 && shown < 4; y += 1) {
      for (let x = 0; x < 240 && shown < 4; x += 1) {
        const o = (y * 240 + x) * 4;
        if (frame[o] === oracleRgba[o] && frame[o + 1] === oracleRgba[o + 1] && frame[o + 2] === oracleRgba[o + 2]) continue;
        if (!printedHeader) {
          console.log(`\n=== tick ${oc.frame} (RAM tick ${ramTick}) ===`);
          console.log(`live feathers: ${liveSprites.map((s) => `slot${s.slot}(pri${s.priority})`).join(", ")}`);
          console.log(`shipped draw order (desc-slot rule): ${shippedOrder.map((s) => s.slot).join(",")}`);
          console.log(`candidate A order (this RAM tick, front-to-back sSpriteOrder): ${order.join(",")}`);
          printedHeader = true;
        }
        shown += 1;
        console.log(`  mismatch @ (${x},${y}): candidateA=(${frame[o]},${frame[o + 1]},${frame[o + 2]}) oracle=(${oracleRgba[o]},${oracleRgba[o + 1]},${oracleRgba[o + 2]}) shipped=(${shippedRgba[o]},${shippedRgba[o + 1]},${shippedRgba[o + 2]})`);
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
}

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i += 1) out.push(i);
  return out;
}

main().catch((e) => { console.error(e); process.exit(1); });
