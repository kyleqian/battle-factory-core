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
//   - LIST_ONIX_MIDHOP_TICK  20158 - same "cursor on ONIX" screen as
//     LIST_ONIX_TICK, but sampled mid-hop: RAM-probed (`dump-party-icon-
//     bounce.py`, docs/party-menu-notes.md's newest section) selected-icon
//     y2=+1 (vs. LIST_ONIX_TICK's y2=-3) - the OTHER half of the bounce
//     cycle, used to decomposition-test the derived hop model itself
//     (not just round-trip stability). Deliberately NOT 20150-20151 or
//     20165-20166 (MAGBY/BAYLEEF's own frame-flip transition instants,
//     which land 1 render tick later than the RAM's own bookkeeping - see
//     docs/party-menu-notes.md's render-lag finding) - picked mid-plateau
//     for every icon's own timer, not just ONIX's.
//   - LIST_MAGBY_MIDHOP_TICK 20215 - same "cursor on MAGBY" screen as
//     LIST_MAGBY_TICK, RAM-probed selected-icon (now MAGBY) y2=+1 (vs.
//     LIST_MAGBY_TICK's y2=-3) - same purpose, for MAGBY's own bounce.
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
  listOnixMidHop: 20158,
  listMagbyMidHop: 20215,
} as const;

trace.captureFrames = Object.values(TICKS);
const result = await runOracleTrace(trace);
const byTick = new Map(result.captures.map((c) => [c.frame, c]));

function need(tick: number) {
  const c = byTick.get(tick);
  if (!c) throw new Error(`oracle didn't capture tick ${tick}`);
  return c;
}

function indexedFrame(rgba: Buffer): { palette: number[]; indices: string } {
  const palette: number[] = [];
  const indexByRgb = new Map<string, number>();
  const indices = new Uint8Array(240 * 160);
  for (let p = 0; p < indices.length; p += 1) {
    const i = p * 4;
    const key = `${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`;
    let index = indexByRgb.get(key);
    if (index === undefined) {
      index = palette.length / 3;
      if (index >= 256) throw new Error("party chrome frame has >256 colors");
      indexByRgb.set(key, index);
      palette.push(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!);
    }
    indices[p] = index;
  }
  return { palette, indices: Buffer.from(indices).toString("base64") };
}

const frames: Record<string, { tick: number; width: number; height: number; palette: number[]; indices: string }> = {};
for (const [name, tick] of Object.entries(TICKS)) {
  frames[name] = { tick, width: 240, height: 160, ...indexedFrame(need(tick).rgba) };
}

writeFileSync("src/assets/gen/party-menu-chrome.json", `${JSON.stringify(frames)}\n`);
console.log(`wrote src/assets/gen/party-menu-chrome.json (${Object.keys(frames).length} full 240x160 frames)`);
