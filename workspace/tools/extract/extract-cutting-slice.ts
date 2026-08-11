// Dev-time extractor for turn 10's AERIAL_ACE animation groundwork
// (docs/battle-turn-notes.md §40 mechanism 5, docs/aerial-ace-notes.md): the
// ONE genuinely new asset that dossier's own 5-mechanism inventory needs -
// the "cutting slice" sprite's tile sheet and palette.
//
// PAPERCUT-DODGE: this is a deliberately standalone script, NOT folded into
// `extract-battle-anim-assets.ts` (that file has a known silent-drop bug on
// re-run, PAPERCUTS.md "extract-battle-anim-assets.ts re-run silently drops
// grovyleFrontAnim") - a fresh file means this asset can never be silently
// dropped by re-running an unrelated bulk script.
//
// Move_AERIAL_ACE (data/battle_anim_scripts.s:4350-4364) does:
//   loadspritegfx ANIM_TAG_CUT
//   createsprite gCuttingSliceSpriteTemplate, ANIM_ATTACKER, 2, 40, -32, 0
// gCuttingSliceSpriteTemplate (src/battle_anim_effects_1.c:1231-1240):
//   .tileTag = ANIM_TAG_CUT, .paletteTag = ANIM_TAG_CUT
//   .oam = &gOamData_AffineOff_ObjBlend_32x32 (src/data/battle_anim.h:534-546
//     - affineMode=ST_OAM_AFFINE_OFF (0), NOT AFFINE_NORMAL/AFFINE_DOUBLE;
//     objMode=ST_OAM_OBJ_BLEND (1); shape/size SQUARE 32x32 - checked
//     directly against the struct literal, not assumed, per PROGRESS #228's
//     lesson that affine-mode confusion is a real, recurring bug class here)
//   .anims = gCuttingSliceAnimTable -> gCuttingSliceAnimCmds (:1217-1229):
//     ANIMCMD_FRAME(0,5), ANIMCMD_FRAME(16,5), ANIMCMD_FRAME(32,5),
//     ANIMCMD_FRAME(48,5), ANIMCMD_END - 4 frames of 16 tiles each, 5 ticks/
//     frame, no loop.
//
// Tile source: gBattleAnimSpriteGfx_Cut (src/graphics.c:479,
// "graphics/battle_anims/sprites/cut.png", 0x0800 bytes = 2048/32B-per-4bpp-
// tile = 64 tiles = 4 stacked 32x32 frames, src/data/battle_anim.h:1150).
// Palette source: gBattleAnimSpritePal_Impact (src/graphics.c:465,
// "graphics/battle_anims/sprites/impact.png") - CUT's own .paletteTag maps
// to this SAME compiled palette array as ANIM_TAG_IMPACT's own tag (src/
// data/battle_anim.h:1440 vs :1443, both -> gBattleAnimSpritePal_Impact) -
// there is no separate "cut" palette file; the two impact/cut sprites share
// one physical palette in the ROM's own encoding, not a coincidence.
//
// Color rule: `decodeIndexedPng` already round-trips every palette entry
// through the real 5-bit GBA channel (gbaColor.ts's gbaRoundTrip, NOT a
// naive <<3), matching mGBA's own framebuffer expansion - this has been the
// proven pipeline for every other battle-anim asset in this file's sibling
// extractors. VRAM-verified below anyway (own §40's "runtime VRAM can
// invalidate static ROM extraction" gotcha, §7.25 precedent): see
// tools/probe/dump-cuttingslice-vram.py's output, cross-checked in
// docs/aerial-ace-notes.md against this script's own committed JSON.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-cutting-slice.ts
//
// Never imported at runtime - the production build only reads the JSON
// output under src/assets/gen/.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

const cutImage = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "cut.png"));
const { columns, rows, tiles } = sliceTiles(cutImage);
if (columns !== 4 || rows !== 16 || tiles.length !== 64) {
  throw new Error(`cut.png: expected 4x16 tiles (64 total, 4 stacked 32x32 frames), got ${columns}x${rows} (${tiles.length})`);
}
const FRAME_ROWS = 4; // 32x32 = 4x4 tiles
const FRAME_TILE_COUNT = 16;
const frames = [0, 1, 2, 3].map((i) => tiles.slice(i * FRAME_TILE_COUNT, (i + 1) * FRAME_TILE_COUNT).map((t) => [...t.pixels]));

// Palette comes from impact.png (see module doc: CUT's own .paletteTag ->
// gBattleAnimSpritePal_Impact, the SAME physical palette ANIM_TAG_IMPACT
// uses) - only its palette is needed, not its own (unrelated) tile content.
const impactImage = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "impact.png"));

writeJson(join(ASSETS_GEN, "battle-anim-cutting-slice.json"), {
  source: "graphics/battle_anims/sprites/cut.png (src/graphics.c:479, ANIM_TAG_CUT); palette graphics/battle_anims/sprites/impact.png (src/graphics.c:465, gBattleAnimSpritePal_Impact - CUT's own paletteTag resolves to this same array, src/data/battle_anim.h:1443)",
  template: "gCuttingSliceSpriteTemplate, src/battle_anim_effects_1.c:1231-1240",
  tileset: { columns, rows: FRAME_ROWS, tiles: frames[0] },
  frames: { columns, rows: FRAME_ROWS, list: frames },
  palette: impactImage.palette,
  oam: { shape: "32x32", size: "32x32", affine: false, affineMode: "OFF", objMode: "BLEND" },
  anim: {
    source: "gCuttingSliceAnimCmds, src/battle_anim_effects_1.c:1217-1229",
    frameTileOffsets: [0, 16, 32, 48],
    durationTicksPerFrame: 5,
    loops: false,
  },
});

console.log("extraction complete");
