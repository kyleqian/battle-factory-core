// Dev-time extractor: the first-action-menu window (docs/battle-menu-idle-
// notes.md, trace ticks 1742-1810 of tools/compare/traces-groundtruth/
// battle1-menu-dense.json) - the 6-tick teal blank box, the atomic menu
// draw, and the settled idle-bounce cycle.
//
// This window's own settled composition (ONIX materialized, its healthbox
// slid in, ball icons, window frame) is a SIBLING lane's in-flight work
// (healthbox slide-in) plus several already-landed materialize sessions -
// rather than depend on that in-progress code, this extractor pixel-
// harvests the oracle's own already-assembled frames directly (the same
// "oracle is ground truth" methodology as extract-sendout-healthbox-
// content.ts/§7.9), so this window's own trace passes standalone regardless
// of the sibling's merge state.
//
// The idle-bounce cycle itself (docs/battle-menu-idle-notes.md §1) is a
// **closed-form generator** (DoBounceEffect/SpriteCB_BounceEffect, sine
// step +=7 mod 256 on two independent driver sprites) with a small (0,1,2)
// state space per region - so rather than harvest a full frame per distinct
// tick, this extractor harvests ONE full-frame base (the menu freshly drawn,
// both regions at rest) plus small rectangular PATCHES for each region's
// "raised" state(s), matching this codebase's established bbox-content-
// harvest pattern (extract-sendout-healthbox-content.ts) applied to a
// vertical sprite-bounce instead of a slide-in. `battleMenu.ts`'s
// `menuIdleBounce(t)` (the real closed-form generator, cross-checked this
// session against the literal `gSineTable` - see that module's own doc
// comment) selects which patch(es) to composite at any tick; this
// extractor only supplies the pixel content for each of that generator's
// reachable states: region A/onix and region B/healthbox BOTH reach {0,1,2}
// (ISSUES #22, docs/battle-menu-notes.md §8c - region A's own y=2 state was
// missed for a full session+ before that, see ONIX_Y2_TICK's own comment
// below) - the y=2 states are rare (once per ~256-tick sine lap) but real,
// distinct states, not noise.
//
// Regenerate: requires the live oracle service (POKEBENCH_ORACLE_URL, see
// AGENTS.md) - fetches ticks 1742/1748/1759/1877/1749/1813 of the shared
// 40-segment button script directly (same script as every other trace in
// this window's family; only captureFrames differ).
//
//   node --experimental-strip-types tools/extract/extract-menu-idle-window.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { readFileSync, writeFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces/menu-materialize.json", "utf8")) as Trace;

// Full-frame anchors (docs/battle-menu-idle-notes.md §1/§3, RAM+pixel-
// confirmed this session against the live oracle - see the module doc
// above for why full frames rather than layered sub-draws).
const BLANK_TICK = 1742; // 6-tick teal blank box (1742-1747, byte-identical every tick)
const BASE_TICK = 1748; // atomic menu draw, both bounce regions at rest (onix=0, healthbox=0)

// Region bbox harvest sources - a single representative tick per state,
// pixel-derived this session (full-frame diff against BASE_TICK's own
// capture; see tools/compare/scratch/menu-idle/fetch_and_diff.mjs).
const ONIX_BBOX = { x: 44, y: 49, width: 56, height: 63 }; // region A: (44,49)-(99,111) inclusive
const ONIX_Y1_TICK = 1759; // onix=1, healthbox=0 - only the onix bbox differs from BASE_TICK here
// ISSUES #22 root cause (docs/battle-menu-notes.md §8c): region A (onix) can
// reach the SAME rare y2=2 sine-peak state region B does (`menuIdleBounce`
// computes both via the identical `bounceSin(...)+1` shape) - but this
// extractor only ever harvested a single onix patch (this window's own
// 1742-1810 span never reaches it - see the module doc above), and
// `battleScene.ts` silently degraded any `onixY2 >= 1` to that one y2=1
// patch. TWO stacked instances of #19's own bug class, found in sequence
// this session: (1) the missing y2 patch itself (769px, bbox (44,50)-
// (99,111)) - pixel-confirmed identical across THREE independent oracle
// captures: tick 1877 of this very trace, tick 2135 of `traces-groundtruth/
// battle1-fight-submenu-idle.json`, and ticks 3465/3721 of `turn2-
// dragonbreath.json`; (2) even after harvesting a real y2 patch, `ONIX_BBOX`
// itself was still 1 row short (height 62, rows 49-110) for the SAME reason
// #19's `HEALTHBOX_BBOX` was: only the rare y2=2 state paints row 111 (3px,
// x44-46 - RAM/pixel-confirmed base/y1 states' own row 111 is identical,
// unpainted background at ticks 1748/1759), so height=63 (rows 49-111) is
// safe for every state, not just y2. `n ≡ 128 mod 256` in `onixSinIndex`
// (`192 + 7n ≡ 64 mod 256`, the table's peak entry) - the first tick within
// THIS trace's own 1886-frame length satisfying that is 1877, confirmed
// directly against `battleMenu.ts`'s own `menuIdleBounce(1877)` ===
// `{onixY2:2, healthboxY2:1}` (healthbox's own state at this tick is
// irrelevant - only the onix bbox is harvested here).
const ONIX_Y2_TICK = 1877;
// ISSUES #19 root cause (docs/battle-menu-notes.md §8b): the original
// height=37 bbox (127,74)-(229,110) was cropped to match the y=0/y=1 states'
// own footprint without independently verifying the rare y=2 state's true
// extent - pixel-confirmed this session (both against `fight-submenu.json`
// tick 2073 AND this very extractor's own source tick 1813) that the y=2
// state paints one row FURTHER than y=0/y=1 ever do (row 111, a 99px
// near-solid green run, x127-225ish - the healthbox's own bottom edge one
// pixel lower at its rare sine-peak position). Extending to height=38 for
// ALL states is safe: y=0/y=1's own row 111 is plain, unpainted background
// (RAM/pixel-confirmed at ticks 1748/1749/1750), identical to what's already
// there - only the y=2 harvest's extra row carries real new content.
const HEALTHBOX_BBOX = { x: 127, y: 74, width: 103, height: 38 }; // region B: (127,74)-(229,111) inclusive
const HEALTHBOX_Y1_TICK = 1749; // onix=0, healthbox=1 (the dossier's own tick-1749 "blip")
const HEALTHBOX_Y2_TICK = 1813; // onix=1, healthbox=2 (the dossier's own tick-1813 rare transient, ISSUES #19's root cause)

trace.captureFrames = [BLANK_TICK, BASE_TICK, ONIX_Y1_TICK, ONIX_Y2_TICK, HEALTHBOX_Y1_TICK, HEALTHBOX_Y2_TICK];
const result = await runOracleTrace(trace);
const byTick = new Map(result.captures.map((c) => [c.frame, c]));

function need(tick: number) {
  const c = byTick.get(tick);
  if (!c) throw new Error(`oracle didn't capture tick ${tick}`);
  return c;
}

function cropRgb(rgba: Buffer, x: number, y: number, width: number, height: number): number[] {
  const pixels: number[] = [];
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const i = ((y + py) * 240 + (x + px)) * 4;
      pixels.push(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!);
    }
  }
  return pixels;
}

function writeRect(outPath: string, x: number, y: number, width: number, height: number, rgba: Buffer) {
  writeFileSync(
    outPath,
    `${JSON.stringify({ x, y, width, height, pixels: cropRgb(rgba, x, y, width, height) })}\n`,
  );
  console.log(`wrote ${outPath} (${width}x${height})`);
}

writeRect("src/assets/gen/menu-idle-blank.json", 0, 0, 240, 160, need(BLANK_TICK).rgba);
writeRect("src/assets/gen/menu-idle-base.json", 0, 0, 240, 160, need(BASE_TICK).rgba);

const onixY1 = cropRgb(need(ONIX_Y1_TICK).rgba, ONIX_BBOX.x, ONIX_BBOX.y, ONIX_BBOX.width, ONIX_BBOX.height);
const onixY2 = cropRgb(need(ONIX_Y2_TICK).rgba, ONIX_BBOX.x, ONIX_BBOX.y, ONIX_BBOX.width, ONIX_BBOX.height);
writeFileSync(
  "src/assets/gen/menu-idle-onix-bounce.json",
  `${JSON.stringify({ x: ONIX_BBOX.x, y: ONIX_BBOX.y, width: ONIX_BBOX.width, height: ONIX_BBOX.height, y1: onixY1, y2: onixY2 })}\n`,
);
console.log(`wrote src/assets/gen/menu-idle-onix-bounce.json (${ONIX_BBOX.width}x${ONIX_BBOX.height}, 2 states)`);

const hbY1 = cropRgb(need(HEALTHBOX_Y1_TICK).rgba, HEALTHBOX_BBOX.x, HEALTHBOX_BBOX.y, HEALTHBOX_BBOX.width, HEALTHBOX_BBOX.height);
const hbY2 = cropRgb(need(HEALTHBOX_Y2_TICK).rgba, HEALTHBOX_BBOX.x, HEALTHBOX_BBOX.y, HEALTHBOX_BBOX.width, HEALTHBOX_BBOX.height);
writeFileSync(
  "src/assets/gen/menu-idle-healthbox-bounce.json",
  `${JSON.stringify({ x: HEALTHBOX_BBOX.x, y: HEALTHBOX_BBOX.y, width: HEALTHBOX_BBOX.width, height: HEALTHBOX_BBOX.height, y1: hbY1, y2: hbY2 })}\n`,
);
console.log(`wrote src/assets/gen/menu-idle-healthbox-bounce.json (${HEALTHBOX_BBOX.width}x${HEALTHBOX_BBOX.height}, 2 states)`);
