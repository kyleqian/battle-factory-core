// Dev-time extractor: the opponent healthbox's *interior content* (name
// "GROVYLE", gender icon, "Lv50", full green HP bar) for the send-out
// window (docs/battle-scene-notes.md §7.6) is assembled at runtime by the
// real game from a HP/EXP-fill-level-dependent *subset* of several sheets'
// tiles in a different on-screen arrangement than any sheet's own raster
// order (`extract-battle-healthbox.ts`'s own header comment - confirmed
// again this session: brute-force placing `singlesOpponent`'s tileset in
// its own raster order at the pixel-confirmed settled corner (12,14) still
// mismatches 728/2574 opaque pixels). Reproducing that tile-remap pipeline
// (subsprite tables, per-column HP-bar-fill VRAM copies, FONT_SMALL name
// text, FONT_BOLD level digits) is real, non-trivial rendering-code work
// out of scope for this trace's own acceptance.
//
// This trace only ever shows ONE opponent healthbox content (GROVYLE,
// male, Lv50, full HP, no status) - so instead this extractor harvests the
// oracle's own already-assembled pixels directly (the same "oracle is
// ground truth" methodology `battleScene.ts` already uses throughout for
// brute-force-matched corners/tables), by diffing the oracle's settled
// capture (trace tick 1555, `tools/compare/out/sendout-baseline`) against
// the engine's own pure-background render (bg + player pic + window frame,
// nothing else - `sendout.json`'s trace at a tick before the healthbox
// exists yet) at the pixel-derived bounding box (13,16)-(113,44). Since
// every tick in the 23-tick slide-in window (1495-1517, brute-force
// verified below) matches this SAME crop at a purely-translated x with
// ZERO pixel mismatch, the content itself is static from creation - a pure
// asset, not an animation - so a flat opaque RGB rectangle blit (no alpha
// mask needed: background-matching pixels inside the bbox are byte-
// identical to what the engine already draws there) is sufficient and
// exact.
//
// Regenerate: requires the oracle baseline cache
// (`npm run compare -- tools/compare/traces/sendout.json
// tools/compare/out/sendout-baseline`, gitignored) to exist first, then:
//   node --experimental-strip-types tools/extract/extract-sendout-healthbox-content.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { renderAppTrace } from "../compare/appTrace.ts";
import type { Trace } from "../compare/oracleClient.ts";

const BASELINE_DIR = "tools/compare/out/sendout-baseline";
const OUT_PATH = "src/assets/gen/sendout-healthbox-opponent.json";

// Pixel-derived bounding box (this session): the full diff between the
// oracle's tick-1555 capture and the engine's pure-background render,
// excluding the (separately-solved) Grovyle sprite/text/player-ball-row
// regions, forms one contiguous healthbox-shaped blob with this bbox.
const BBOX = { x0: 13, y0: 16, x1: 113, y1: 44 };
const SETTLED_TICK = 1555;
// Pixel-derived (brute-force per-tick x-offset search, zero mismatch every
// tick): dx = -110 at tick 1495, +5px/tick, settled (dx=0) from tick 1517.
export const SLIDE_START_TICK = 1495;
export const SLIDE_START_DX = -110;
export const SLIDE_STEP = 5;
export const SLIDE_SETTLE_TICK = 1517;

if (!existsSync(`${BASELINE_DIR}/oracle-0${SETTLED_TICK}.png`)) {
  throw new Error(
    `missing ${BASELINE_DIR} oracle cache - regenerate via: npm run compare -- tools/compare/traces/sendout.json ${BASELINE_DIR}`,
  );
}

const trace = JSON.parse(readFileSync("tools/compare/traces/sendout.json", "utf8")) as Trace;
const captures = await renderAppTrace(trace);
const pureBg = captures.find((c) => c.frame === SETTLED_TICK);
if (!pureBg) throw new Error(`no app capture at tick ${SETTLED_TICK}`);

const oraclePng = PNG.sync.read(readFileSync(`${BASELINE_DIR}/oracle-0${SETTLED_TICK}.png`));

const w = BBOX.x1 - BBOX.x0;
const h = BBOX.y1 - BBOX.y0;
const pixels: number[] = [];
for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    const ox = BBOX.x0 + x;
    const oy = BBOX.y0 + y;
    const oi = (oy * 240 + ox) * 4;
    pixels.push(oraclePng.data[oi]!, oraclePng.data[oi + 1]!, oraclePng.data[oi + 2]!);
  }
}

writeFileSync(
  OUT_PATH,
  `${JSON.stringify({
    x: BBOX.x0,
    y: BBOX.y0,
    width: w,
    height: h,
    // Flat RGB triples, row-major, opaque (see header comment).
    pixels,
  })}\n`,
);
console.log(`wrote ${OUT_PATH} (${w}x${h})`);
