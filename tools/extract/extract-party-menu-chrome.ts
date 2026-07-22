// Dev-time extractor: turn 15's forced-switch party-select screen chrome
// (docs/party-menu-notes.md) - background/panels/HP-bars/text/cursor-
// highlight/submenu box, pixel-harvested directly from the oracle at three
// representative stable ticks. Same "oracle is ground truth" full-frame
// harvest methodology as extract-menu-idle-window.ts/extract-fight-submenu-
// window.ts (this repo's established pattern for compound UI screens whose
// background is tedious/risky to hand-reconstruct tile-by-tile vs. just
// reading the real rendered pixels once) - see docs/party-menu-notes.md for
// why full-frame harvest was chosen over a from-scratch tile/palette
// rebuild for the panel chrome specifically (mon icons ARE independently
// extracted from ROM source - see extract-party-mon-icons.ts).
//
// Ticks chosen are deep within each screen's own settled idle-bounce
// plateau (not at a transition boundary), pixel-confirmed stable across
// several ticks each (docs/party-menu-notes.md §3):
//   - LIST_ONIX_TICK   20070 - "Choose a POKéMON." list, cursor on ONIX
//     (fainted, 0/117); MAGBY/BAYLEEF icons both showing their frame0.
//   - LIST_MAGBY_TICK  20206 - same list, cursor moved to MAGBY (DOWN
//     press); MAGBY's icon is now the selected/bouncing one.
//   - SUBMENU_TICK     20220 - "Do what with this Pokémon?" SEND
//     OUT/SUMMARY/CANCEL, cursor on SEND OUT.
//
// Regenerate: requires the live oracle service (POKEBENCH_ORACLE_URL).
//   node --experimental-strip-types tools/extract/extract-party-menu-chrome.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { readFileSync, writeFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces-groundtruth/battle1-turn15-dense.json", "utf8")) as Trace;

const TICKS = {
  listOnix: 20070,
  listMagby: 20206,
  submenu: 20220,
} as const;

trace.captureFrames = Object.values(TICKS);
const result = await runOracleTrace(trace);
const byTick = new Map(result.captures.map((c) => [c.frame, c]));

function need(tick: number) {
  const c = byTick.get(tick);
  if (!c) throw new Error(`oracle didn't capture tick ${tick}`);
  return c;
}

function fullFrameRgb(rgba: Buffer): number[] {
  const pixels: number[] = [];
  for (let i = 0; i < 240 * 160; i += 1) {
    pixels.push(rgba[i * 4]!, rgba[i * 4 + 1]!, rgba[i * 4 + 2]!);
  }
  return pixels;
}

const frames: Record<string, { tick: number; width: number; height: number; pixels: number[] }> = {};
for (const [name, tick] of Object.entries(TICKS)) {
  frames[name] = { tick, width: 240, height: 160, pixels: fullFrameRgb(need(tick).rgba) };
}

writeFileSync("src/assets/gen/party-menu-chrome.json", `${JSON.stringify(frames)}\n`);
console.log(`wrote src/assets/gen/party-menu-chrome.json (${Object.keys(frames).length} full 240x160 frames)`);
