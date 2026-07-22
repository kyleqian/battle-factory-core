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
//   - LIST_MAGBY_MIDHOP_TICK 20196 - a genuine list plateau before the
//     later A press opens SEND OUT: MAGBY's selected y2=+1/frame-1 state.
//
// Regenerate: requires the live oracle service (POKEBENCH_ORACLE_URL).
//   node --experimental-strip-types tools/extract/extract-party-menu-chrome.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { readFileSync, writeFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import iconAsset from "../../src/assets/gen/party-mon-icons.json" with { type: "json" };
import statusOverlayAsset from "../../src/assets/gen/party-menu-status-overlay.json" with { type: "json" };
import magbyStatusOverlayAsset from "../../src/assets/gen/party-menu-status-overlay-magby.json" with { type: "json" };

const trace = JSON.parse(readFileSync("tools/compare/traces-groundtruth/battle1-turn15-dense.json", "utf8")) as Trace;

const TICKS = {
  listOnix: 20070,
  listMagby: 20206,
  submenu: 20220,
  listOnixMidHop: 20158,
  listMagbyMidHop: 20196,
} as const;

type Tileset = { columns: number; rows: number; tiles: number[][] };
type IconAsset = { frame0: Tileset; frame1: Tileset };
type Overlay = { x: number; y: number; width: number; height: number; pixels: number[] };
const icons = iconAsset as unknown as Record<string, IconAsset>;
const statusOverlay = statusOverlayAsset as Overlay;
const magbyStatusOverlay = magbyStatusOverlayAsset as Overlay;

/**
 * The persisted frame is deliberately icon-free.  We replace the opaque
 * source texels with this conspicuous value instead of leaving them in a
 * captured base: production and the independent composite must redraw every
 * one of them from the ROM-derived layer assets below.  Transparent texels
 * are never touched, so they retain the actual BG/panel chrome underneath.
 */
const ERASED_RGB: readonly [number, number, number] = [255, 0, 255];

type IconLayer = { species: string; frame: 0 | 1; selected: boolean; phase?: "minus3" | "plus1" };
const ICON_BASE: Record<string, { x: number; y: number }> = {
  ONIX: { x: 16, y: 40 }, MAGBY: { x: 104, y: 18 }, BAYLEEF: { x: 104, y: 42 },
};
const DESELECTED_OFFSET: Record<string, { x2: number; y2: number }> = {
  ONIX: { x2: 0, y2: -4 }, MAGBY: { x2: -4, y2: 0 }, BAYLEEF: { x2: -4, y2: 0 },
};
const SOURCE_LAYERS: Record<keyof typeof TICKS, { icons: IconLayer[]; status: Overlay }> = {
  listOnix: {
    icons: [
      { species: "ONIX", frame: 0, selected: true, phase: "minus3" },
      { species: "MAGBY", frame: 0, selected: false }, { species: "BAYLEEF", frame: 0, selected: false },
    ], status: statusOverlay,
  },
  listOnixMidHop: {
    icons: [
      { species: "ONIX", frame: 0, selected: true, phase: "plus1" },
      { species: "MAGBY", frame: 1, selected: false }, { species: "BAYLEEF", frame: 1, selected: false },
    ], status: statusOverlay,
  },
  listMagby: {
    icons: [
      { species: "ONIX", frame: 0, selected: false },
      { species: "MAGBY", frame: 0, selected: true, phase: "minus3" }, { species: "BAYLEEF", frame: 0, selected: false },
    ], status: statusOverlay,
  },
  listMagbyMidHop: {
    icons: [
      { species: "ONIX", frame: 0, selected: false },
      { species: "MAGBY", frame: 1, selected: true, phase: "plus1" }, { species: "BAYLEEF", frame: 1, selected: false },
    ], status: magbyStatusOverlay,
  },
  // The confirm edge is one render-lag tick after the RAM flip at 20220, so
  // the displayed OAM is still MAGBY/BAYLEEF frame-1 at the +1 hop phase.
  submenu: {
    icons: [
      { species: "ONIX", frame: 0, selected: false },
      { species: "MAGBY", frame: 1, selected: true, phase: "plus1" }, { species: "BAYLEEF", frame: 1, selected: false },
    ], status: magbyStatusOverlay,
  },
};

trace.captureFrames = Object.values(TICKS);
const result = await runOracleTrace(trace);
const byTick = new Map(result.captures.map((c) => [c.frame, c]));

function need(tick: number) {
  const c = byTick.get(tick);
  if (!c) throw new Error(`oracle didn't capture tick ${tick}`);
  return c;
}

function erasePixel(rgba: Buffer, x: number, y: number): void {
  if (x < 0 || y < 0 || x >= 240 || y >= 160) return;
  const p = (y * 240 + x) * 4;
  rgba[p] = ERASED_RGB[0]; rgba[p + 1] = ERASED_RGB[1]; rgba[p + 2] = ERASED_RGB[2];
}

function eraseIcon(rgba: Buffer, layer: IconLayer): void {
  const base = ICON_BASE[layer.species]!;
  const offset = layer.selected
    ? { x2: 0, y2: layer.phase === "minus3" ? -3 : 1 }
    : DESELECTED_OFFSET[layer.species]!;
  const tileset = layer.frame === 0 ? icons[layer.species]!.frame0 : icons[layer.species]!.frame1;
  const ox = base.x + offset.x2 - 16;
  const oy = base.y + offset.y2 - 16;
  for (let ty = 0; ty < tileset.rows; ty += 1) for (let tx = 0; tx < tileset.columns; tx += 1) {
    const tile = tileset.tiles[ty * tileset.columns + tx]!;
    for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) {
      if (tile[y * 8 + x] !== 0) erasePixel(rgba, ox + tx * 8 + x, oy + ty * 8 + y);
    }
  }
}

function eraseStatus(rgba: Buffer, topOverlay: Overlay): void {
  // The status OBJ is drawn twice in this turn's subsprite arrangement; keep
  // this in lockstep with the compositor/runtime layer ordering.
  for (const [baseY, overlay] of [[24, topOverlay], [statusOverlay.y, statusOverlay]] as const) for (let y = 0; y < overlay.height; y += 1) for (let x = 0; x < overlay.width; x += 1) {
    if (overlay.pixels[(y * overlay.width + x) * 4 + 3] !== 0) erasePixel(rgba, overlay.x + x, baseY + y);
  }
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
  const rgba = Buffer.from(need(tick).rgba);
  const layers = SOURCE_LAYERS[name as keyof typeof TICKS];
  for (const icon of layers.icons) eraseIcon(rgba, icon);
  eraseStatus(rgba, layers.status);
  frames[name] = { tick, width: 240, height: 160, iconFree: true, ...indexedFrame(rgba) };
}

writeFileSync("src/assets/gen/party-menu-chrome.json", `${JSON.stringify(frames)}\n`);
console.log(`wrote src/assets/gen/party-menu-chrome.json (${Object.keys(frames).length} full 240x160 frames)`);
