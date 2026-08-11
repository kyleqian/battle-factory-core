// Dev-time extractor: reads reference/pokeemerald's generic stat-change
// banner assets (docs/battle-menu-notes.md §10a/§10c - `StatsChangeAnimation_
// Step1-3`, `src/battle_anim_utility_funcs.c:415-628`). The banner is a real
// BG1 layer - a shared 64-tile gfx sheet (`gStatAnim_Gfx`) + one of two plain
// 32x32 tilemaps (`gStatAnim_Increase_Tilemap`/`_Decrease_Tilemap`, chosen by
// stat-up vs. stat-down) + one of 8 per-stat 16-color palettes - loaded into
// an OBJ-window-clipped BG1 that `StatsChangeAnimation_Step3` scrolls
// (`gBattle_BG1_Y += tVelocity`) every tick, including the "flat" hold.
//
// Unlike `extract-battle-bg.ts`'s LZ77-compressed VRAM-facing `.lz`/`.4bpp.lz`
// build outputs, reference/pokeemerald's own graphics/ directory keeps every
// one of these as a plain, uncompressed dev-time source asset (`tiles.png`, a
// 128x32 4-bit-indexed PNG = 16x4 = 64 tiles; `increase.bin`/`decrease.bin`, a
// plain 2048-byte/32x32 GBA tilemap identical in format to `extract-battle-
// bg.ts`'s own `anim_map.bin`; `*.pal`, JASC-PAL text) - the same "source is
// already decompressed, only the ROM build compresses it" situation that
// extractor's own header note describes, so no LZ77 decoder is needed here
// either, just the same tileset/tilemap/palette loaders.
//
// Extracts the full family (all 8 stat palettes + both tilemaps) since it's
// cheap (all plain, small files) and future battles (2-7) exercise other
// stats - this slice (S7 slice B, DOUBLE_TEAM/EFFECT_EVASION_UP) only wires
// up the `evasion`/`increase` pair, but the rest costs nothing extra to pull
// now.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-stat-anim.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { parseTilemap } from "./tilemap.ts";
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

const STAT_CHANGE_DIR = join(REF, "graphics", "battle_anims", "stat_change");

// gStatAnim_Gfx (graphics.c:869) - the shared 64-tile sheet every stat/
// direction reuses; only the tilemap + palette vary.
const gfxImg = decodeIndexedPng(join(STAT_CHANGE_DIR, "tiles.png"));
const { columns, rows, tiles } = sliceTiles(gfxImg);
const tileset = { columns, rows, tiles: tiles.map((t) => [...t.pixels]) };

// gStatAnim_Increase_Tilemap / gStatAnim_Decrease_Tilemap (graphics.c:870-871)
// - plain 32x32 tilemaps, same format as extract-battle-bg.ts's anim_map.bin.
// Only one palette is ever loaded at a time (LoadCompressedPalette into a
// single BG_PLTT_ID slot, battle_anim_utility_funcs.c:501-527), so unlike
// battle-bg's 3-subpalette table there's no hardware-offset normalization to
// undo here - each tilemap entry's raw `palette` nibble is meaningless (only
// one palette is ever resident) and consumers should ignore it, always
// indexing the single active stat's own 16-color palette directly.
const increaseTilemap = parseTilemap(readFileSync(join(STAT_CHANGE_DIR, "increase.bin")), 32, 32);
const decreaseTilemap = parseTilemap(readFileSync(join(STAT_CHANGE_DIR, "decrease.bin")), 32, 32);

function loadPal16(name: string) {
  const pal = loadJascPal(join(STAT_CHANGE_DIR, `${name}.pal`));
  if (pal.length !== 16) throw new Error(`${name}.pal: expected 16 colors, got ${pal.length}`);
  return pal;
}

const palettes = {
  attack: loadPal16("attack"),
  defense: loadPal16("defense"),
  accuracy: loadPal16("accuracy"),
  speed: loadPal16("speed"),
  evasion: loadPal16("evasion"),
  spAttack: loadPal16("sp_attack"),
  spDefense: loadPal16("sp_defense"),
  multiple: loadPal16("multiple"),
};

writeJson(join(ASSETS_GEN, "stat-anim-banner.json"), {
  tileset,
  tilemaps: { increase: increaseTilemap, decrease: decreaseTilemap },
  palettes,
});
