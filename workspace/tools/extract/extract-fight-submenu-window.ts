// Dev-time extractor: the FIGHT (move-select) submenu's own window content
// (docs/battle-turn-notes.md §11) - the move-name/PP/type/cursor block for
// each of Onix's 4 fixed moves (ROCK_SLIDE/BIND/DRAGON_BREATH/SANDSTORM).
//
// Same "oracle is ground truth" full-frame/region-harvest methodology as
// extract-menu-idle-window.ts (this window is the direct sequel to that
// one): §11 finding 2 established this window-region bbox is BYTE-IDENTICAL
// for the entire dwell of a given selected slot (pixel-confirmed this
// session across every one of ROCK_SLIDE/BIND/SANDSTORM/DRAGON_BREATH's own
// dwell windows in battle1-fight-submenu-nav.json, including DRAGON_BREATH's
// two separate visits) - so unlike the settled action-menu's own idle
// bounce (a real per-tick generator), this window's TEXT/CURSOR content
// needs only ONE static patch per slot, not a per-tick table. The bounce
// regions above/beside this window (ONIX battler + healthbox, `battleMenu.ts`'s
// existing menuIdleBounce/menuIdleOnixBounce/menuIdleHealthboxBounce) are
// reused verbatim - this bbox (see WINDOW_BBOX below) sits entirely below
// both, pixel-confirmed no overlap.
//
// Regenerate: requires the live oracle service (POKEBENCH_ORACLE_URL).
//
//   node --experimental-strip-types tools/extract/extract-fight-submenu-window.ts

import { readFileSync, writeFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces-groundtruth/battle1-fight-submenu-nav.json", "utf8")) as Trace;

// WINDOW_BBOX pixel-derived this session: diffing tick 1887 (settled action
// menu, frozen mid-DMA-wait) against tick 1892 (submenu just revealed) with
// BOTH ticks sharing the identical onix/healthbox bounce state (menuIdleBounce
// agrees at 1887-1895) isolates exactly the submenu's own window content,
// bbox (1,113)-(231,158) inclusive - safely below the bounce regions' own
// max y=110 (menu-idle-onix-bounce.json/menu-idle-healthbox-bounce.json).
const WINDOW_BBOX = { x: 1, y: 113, width: 231, height: 46 };

// One representative tick per slot - pixel-confirmed byte-identical across
// each slot's ENTIRE dwell (both of DRAGON_BREATH's two separate visits
// cross-checked against each other too), so any tick within a dwell window
// works; these are just comfortably mid-dwell, away from the 1-tick nav
// render-lag boundaries.
const SLOT_TICKS: Record<string, number> = {
  ROCK_SLIDE: 1900,
  BIND: 1918,
  SANDSTORM: 1940,
  DRAGON_BREATH: 2010,
};

trace.captureFrames = Object.values(SLOT_TICKS);
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

const slots: Record<string, number[]> = {};
for (const [name, tick] of Object.entries(SLOT_TICKS)) {
  slots[name] = cropRgb(need(tick).rgba, WINDOW_BBOX.x, WINDOW_BBOX.y, WINDOW_BBOX.width, WINDOW_BBOX.height);
}

writeFileSync(
  "src/assets/gen/fight-submenu-window.json",
  `${JSON.stringify({ x: WINDOW_BBOX.x, y: WINDOW_BBOX.y, width: WINDOW_BBOX.width, height: WINDOW_BBOX.height, slots })}\n`,
);
console.log(`wrote src/assets/gen/fight-submenu-window.json (${WINDOW_BBOX.width}x${WINDOW_BBOX.height}, ${Object.keys(slots).length} slots)`);
