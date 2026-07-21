// S7 slice R rung (b) prep (turn 10's AERIAL_ACE animation) — mandatory
// first step for whoever picks this up next, same convention as
// tools/probe/verify-turn9-postlunge.ts. Re-derives the pinned facts in
// docs/aerial-ace-notes.md straight from a FRESH `bin/oracle run` (no stale
// PNGs, no trusting the doc's own prose) and fails loudly if the real
// hardware's pixels ever stop matching this session's own findings.
// Pixel-only (no RAM reads — this runs from plain `node`, not the mgba-venv
// python interpreter tools/probe/dump-cuttingslice-vram.py needs); the
// cutting-slice sprite's own x2/y2/tileNum table is RAM-sourced and cross-
// cited in docs/aerial-ace-notes.md, not re-asserted here — this script
// checks the PIXEL-VISIBLE consequences (onset/offset/plateau ticks) a
// render implementation must reproduce.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn10-aerialace.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn10-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

// The whole AERIAL_ACE animation window, per docs/aerial-ace-notes.md's own
// fresh full-frame diff pass (flat through 12360, dense 12361-12384, flat
// again from 12385).
const WINDOW = range(12355, 12389);
trace.captureFrames = WINDOW;

function diffCount(png: Buffer, basePng: Buffer, box?: { x0: number; y0: number; x1: number; y1: number }): number {
  const img = PNG.sync.read(png);
  const base = PNG.sync.read(basePng);
  const { x0, y0, x1, y1 } = box ?? { x0: 0, y0: 0, x1: 240, y1: 160 };
  let diffs = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * 240 + x) * 4;
      if (img.data[i] !== base.data[i] || img.data[i + 1] !== base.data[i + 1] || img.data[i + 2] !== base.data[i + 2]) diffs += 1;
    }
  }
  return diffs;
}

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

async function main() {
  console.log(`Running fresh oracle capture over ${WINDOW.length} ticks...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c;
  };

  const base = get(12355).png; // pre-window baseline (docs/aerial-ace-notes.md: flat through 12360)
  const diff = (t: number, box?: { x0: number; y0: number; x1: number; y1: number }) => diffCount(get(t).png, base, box);

  // --- Window bracketing: flat before, dense during, flat again after ---
  for (const t of [12356, 12357, 12358, 12359, 12360]) {
    check(`pre-window tick ${t} is flat (0 diff vs 12355 baseline)`, diff(t) === 0, `got ${diff(t)}`);
  }
  check("first visible pixel change is render 12361, NOT 12360 (fresh finding, corrects the naive render=RAM+1 assumption for this window's own onset)", diff(12360) === 0 && diff(12361) > 0, `12360=${diff(12360)}, 12361=${diff(12361)}`);
  for (const t of [12385, 12386, 12387, 12388, 12389]) {
    check(`post-window tick ${t} settled flat again (0 diff vs 12355 baseline)`, diff(t) === 0, `got ${diff(t)}`);
  }

  // --- Mechanism 4 (background palette-blend pulse): the RE-BISECTED
  // plateau window, narrower than §40's own cited task-active span. Full BG
  // band (y:0-111, excludes the message-box strip) must show a near-full-band
  // darken (>=75% of 26880px) at 12368-12370 ONLY, not at the ticks
  // immediately either side. ---
  const BG_BAND = { x0: 0, y0: 0, x1: 240, y1: 112 };
  const BG_TOTAL = 240 * 112;
  for (const t of [12368, 12369, 12370]) {
    const d = diff(t, BG_BAND);
    check(`palette-pulse plateau at ${t}: >=75% of the BG band differs from baseline`, d >= BG_TOTAL * 0.75, `got ${d}/${BG_TOTAL} (${((d / BG_TOTAL) * 100).toFixed(1)}%)`);
  }
  for (const t of [12367, 12371]) {
    const d = diff(t, BG_BAND);
    check(`palette-pulse NOT at plateau at ${t} (narrower window than §40's cited 12367-12375)`, d < BG_TOTAL * 0.5, `got ${d}/${BG_TOTAL} (${((d / BG_TOTAL) * 100).toFixed(1)}%)`);
  }

  // --- Mechanism 5 (cutting-slice sprite): destroyed/gone by 12384 - the
  // sprite's own footprint region (a generous bbox covering its whole
  // diagonal travel, x:40-150 y:50-125 per docs/aerial-ace-notes.md's own
  // x2/y2 table) must be back to baseline outside Onix's own still-shaking
  // real-sprite box (44-99,49-111, mechanism 2, NOT modeled by this
  // groundwork step) - so this check only covers the slice-only extension
  // past Onix's own box, x:99-150.
  const SLICE_ONLY_BAND = { x0: 99, y0: 49, x1: 150, y1: 125 };
  check("slice sprite fully gone by 12384 (its own footprint past Onix's own box is back to baseline)", diff(12384, SLICE_ONLY_BAND) === 0, `got ${diff(12384, SLICE_ONLY_BAND)}`);

  console.log(`\n${WINDOW.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
