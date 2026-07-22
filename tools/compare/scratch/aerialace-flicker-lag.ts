// Mission B (worktree PROBE follow-up): pin the render lag for the RAM-
// confirmed Onix post-hit invisibility flicker (RAM 12407-12434, 4 blocks
// of 4-invisible/4-visible, period 8 — same shape as turn9Ep2OnixInvisible,
// docs/battle-turn-notes.md). Dense-capture around each RAM boundary tick
// to find exactly which render tick first shows Onix gone/back.
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../oracleClient.ts";

const trace = JSON.parse(
  readFileSync("tools/compare/traces-groundtruth/battle1-turn10-dense.json", "utf8"),
) as Trace;
const WINDOW: number[] = [];
for (let t = 12404; t <= 12420; t++) WINDOW.push(t);
trace.captureFrames = WINDOW;

const { captures } = await runOracleTrace(trace);
const byFrame = new Map(captures.map((c) => [c.frame, PNG.sync.read(c.png)]));

const ONIX_BOX = { x0: 44, y0: 49, x1: 99, y1: 111 };
function nonBackdropCount(img: any): number {
  // Count non-black-ish opaque pixels in Onix's own box as a cheap "is Onix
  // drawn here at all" proxy — compare against a known-visible reference tick.
  let n = 0;
  for (let y = ONIX_BOX.y0; y < ONIX_BOX.y1; y++) {
    for (let x = ONIX_BOX.x0; x < ONIX_BOX.x1; x++) {
      const o = (y * 240 + x) * 4;
      n += img.data[o] || img.data[o + 1] || img.data[o + 2] ? 1 : 0;
    }
  }
  return n;
}

const ref = byFrame.get(12404)!;
function diffFromRef(img: any): number {
  let d = 0;
  for (let y = ONIX_BOX.y0; y < ONIX_BOX.y1; y++) {
    for (let x = ONIX_BOX.x0; x < ONIX_BOX.x1; x++) {
      const o = (y * 240 + x) * 4;
      if (img.data[o] !== ref.data[o] || img.data[o + 1] !== ref.data[o + 1] || img.data[o + 2] !== ref.data[o + 2]) d += 1;
    }
  }
  return d;
}

for (const t of WINDOW) {
  const img = byFrame.get(t)!;
  console.log(`render ${t}: diffFromRef12404=${diffFromRef(img)} nonBackdrop=${nonBackdropCount(img)}`);
}
