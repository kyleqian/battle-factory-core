// Dev-time extractor: reads reference/pokeemerald's Battle Frontier battle
// background art (docs/battle-bringup-notes.md S3 "Background"). Every
// Factory battle (BATTLE_TYPE_FACTORY subset of BATTLE_TYPE_FRONTIER)
// unconditionally uses the "building" tileset + the *Frontier* palette
// variant, per DrawMainBattleBackground (src/battle_bg.c:760-767) - not the
// tileset's own bundled palette.pal (that's the plain-indoor variant used by
// ordinary gym/building trainer battles, a different code path).
//
// Two geometry facts below were confirmed empirically against a live oracle
// battle-1 trace (/tmp/s6-battle1.json, a from-scratch rebuild of
// docs/battle-bringup-notes.md's rent->walk->warp->transition->intro
// sequence - not committed, scratch per this run's conventions), NOT derived
// from source alone, because a naive reading of gBattleBgTemplates'
// `.screenSize = 1` for bg 3 (battle_bg.c:145-152) suggests the GBA-standard
// "512x256, 64 tiles wide" layout - which turned out to be backwards here:
// - **map.bin is 32 tiles wide x 64 tall**, not 64x32: a first attempt
//   assuming 64x32 (recomposing the file as two horizontally-adjacent 32x32
//   screen blocks, the standard trick for that GBA layout) scored a 0%
//   pixel match against the oracle's on-screen sky/cloud strip at every
//   possible scroll offset. Reparsing as a single linear 32-wide sequence
//   (equivalent to two 32x32 blocks stacked *vertically*) put tile 98 at
//   entry 0 - an exact pixel-for-pixel match (all 3 unique colors, all 8x8
//   pixels) against the oracle screenshot's true top-left on-screen tile.
// - **Each entry's `palette` nibble is 2 higher than this table's own local
//   subpalette index**: LoadCompressedPalette loads the 3 extracted
//   subpalettes at `BG_PLTT_ID(2)` (hardware slots 2/3/4), and map.bin's
//   entries encode that *absolute* slot number, not a 0-based index into
//   just the 3 loaded subpalettes - confirmed by the same tile-98 check
//   (only exact pixel match at hardware value 2 => local subpalette 0, not
//   at the raw value 2 used directly as a local index). The only other
//   value seen anywhere in this map is 0 (always paired with tile 0, a
//   blank filler covering the vertical range hidden behind the ground/
//   terrain layer drawn in front of this background) - referencing hardware
//   slot 0, which is genuinely outside the Frontier palette this extractor
//   pulls, but never visibly rendered given it's paired with an all-blank
//   tile. Normalized to local subpalette indices (`raw - 2`, clamped to >=0)
//   here so consumers don't need to know about the +2 hardware offset.
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-bg.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { parseTilemap, type Tilemap } from "./tilemap.ts";
import { loadJascPal } from "./jascPal.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

const BUILDING = join(REF, "graphics", "battle_environment", "building");

function loadTileset(pngPath: string) {
  const img = decodeIndexedPng(pngPath);
  const { columns, rows, tiles } = sliceTiles(img);
  return { columns, rows, tiles: tiles.map((t) => [...t.pixels]) };
}

function normalizePaletteOffset(tilemap: Tilemap, hardwareBase: number): Tilemap {
  return {
    width: tilemap.width,
    height: tilemap.height,
    entries: tilemap.entries.map((e) => ({ ...e, palette: Math.max(0, e.palette - hardwareBase) })),
  };
}

// Static background: DrawMainBattleBackground (battle_bg.c:764-766) -
// gBattleEnvironmentTiles_Building (tiles.png) + gBattleEnvironmentTilemap_
// Building (map.bin, 32x64 tiles - see header note) + gBattleEnvironmentPalette_
// Frontier (../stadium/battle_frontier.pal, loaded as 3 subpalettes = 48
// colors, "3 * PLTT_SIZE_4BPP" at battle_bg.c:766, hardware base slot 2).
const staticTileset = loadTileset(join(BUILDING, "tiles.png"));
const staticMapBuf = readFileSync(join(BUILDING, "map.bin"));
const staticTilemap = normalizePaletteOffset(parseTilemap(staticMapBuf, 32, 64), 2);
const framePalette = loadJascPal(join(REF, "graphics", "battle_environment", "stadium", "battle_frontier.pal"));
if (framePalette.length !== 48) {
  throw new Error(`battle_frontier.pal: expected 48 colors (3 subpalettes), got ${framePalette.length}`);
}
const usedPalNibbles = new Set(staticTilemap.entries.map((e) => e.palette));
for (const p of usedPalNibbles) {
  if (p > 2) throw new Error(`battle bg tilemap uses normalized palette index ${p}, expected only 0-2 (3 loaded subpalettes)`);
}

// Entry-slide variant: DrawBattleEntryBackground (battle_bg.c:1143-1149) -
// gBattleEnvironmentAnimTiles_Building (anim_tiles.png) + AnimTilemap_Building
// (anim_map.bin, a plain 32x32 tilemap = 2048 bytes = 1 screen block, no
// width/height ambiguity - only one block, so no recomposition question).
// DrawBattleEntryBackground's BATTLE_TYPE_FRONTIER branch (battle_bg.c:1143-
// 1149) never loads a palette for this BG1 layer - a prior session read that
// as "palette bank 4 is missing" (every tilemap entry's raw palette nibble is
// 4, and this table only has 3 local subpalettes 0-2) and left it untestable.
// That was a misdiagnosis, not a real gap: the anim_map.bin entries use the
// same hardware-absolute encoding as the static tilemap above (raw nibble -
// hardware base 2 = local index), because DrawMainBattleBackground already
// loaded gBattleEnvironmentPalette_Frontier at BG_PLTT_ID(2) for 3 subpalettes
// (hardware slots 2/3/4) before the intro slide runs, and nothing reloads
// palette RAM in between - so raw nibble 4 IS local subpalette index 2,
// already captured. Confirmed directly against RAM this session
// (tools/probe/ram-probe.py on gPlttBufferFaded + BG_PLTT_ID(4)'s byte
// offset, ticks 1073-1886 of the scene-dense script): the 16 live colors at
// hardware bank 4 are bit-exact equal to this table's local subpalette 2
// (framePalette.slice(32,48)) at every sampled tick - it's the SAME bank,
// never anything else. Normalized the same way as the static tilemap so
// downstream code doesn't need to special-case the +2 offset per table.
const animTileset = loadTileset(join(BUILDING, "anim_tiles.png"));
const animMapBuf = readFileSync(join(BUILDING, "anim_map.bin"));
const animTilemap = normalizePaletteOffset(parseTilemap(animMapBuf, 32, 32), 2);
const usedAnimPalNibbles = new Set(animTilemap.entries.map((e) => e.palette));
for (const p of usedAnimPalNibbles) {
  if (p > 2) throw new Error(`entrySlide tilemap uses normalized palette index ${p}, expected only 0-2 (3 loaded subpalettes)`);
}

writeJson(join(ASSETS_GEN, "battle-bg.json"), {
  // 3 subpalettes of 16 colors each, indexed by each tilemap entry's `palette`
  // (0-2, already normalized from the +2 hardware offset - see header note).
  palette: [framePalette.slice(0, 16), framePalette.slice(16, 32), framePalette.slice(32, 48)],
  static: { tileset: staticTileset, tilemap: staticTilemap },
  entrySlide: { tileset: animTileset, tilemap: animTilemap },
});
