// Dev-time extractor for MOVE_SLASH's (staged, round A) ONE new asset: the
// "slash slice" sprite's tile sheet and palette (gSlashSliceSpriteTemplate's
// ANIM_TAG_SLASH art).
//
// PAPERCUT-DODGE: this is a deliberately standalone script, NOT folded into
// `extract-battle-anim-assets.ts` (that file has a known silent-drop bug on
// re-run, PAPERCUTS.md "extract-battle-anim-assets.ts re-run silently drops
// grovyleFrontAnim") - a fresh file means this asset can never be silently
// dropped by re-running an unrelated bulk script.
//
// Move_SLASH (data/battle_anim_scripts.s):
//   loadspritegfx ANIM_TAG_SLASH
//   createsprite gSlashSliceSpriteTemplate, ANIM_TARGET, 2, 1, -8, 0
//   playsewithpan SE_M_RAZOR_WIND, SOUND_PAN_TARGET
//   delay 4
//   createsprite gSlashSliceSpriteTemplate, ANIM_TARGET, 2, 1, 8, 0
//   createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 18, 1
//   playsewithpan SE_M_RAZOR_WIND, SOUND_PAN_TARGET
//   waitforvisualfinish
//   end
//
// gSlashSliceSpriteTemplate (src/battle_anim_effects_1.c:1598-1607):
//   .tileTag = ANIM_TAG_SLASH, .paletteTag = ANIM_TAG_SLASH
//   .oam = &gOamData_AffineOff_ObjNormal_32x32 (src/data/battle_anim.h:30-42 -
//     affineMode=ST_OAM_AFFINE_OFF (0), objMode=ST_OAM_OBJ_NORMAL (0); shape/
//     size SQUARE 32x32 - checked directly against the struct literal, not
//     assumed, per the lane's lesson that affine-mode confusion is a real,
//     recurring bug class here; note this is NOT ObjBlend unlike the cutting
//     slice)
//   .anims = gSlashSliceAnimTable (:1592) -> gSlashSliceAnimCmds1 (:1577-1584):
//     ANIMCMD_FRAME(0,4), ANIMCMD_FRAME(16,4), ANIMCMD_FRAME(32,4),
//     ANIMCMD_FRAME(48,4), ANIMCMD_END - 4 frames of 16 tiles each, 4 ticks/
//     frame, no loop. (Move_SLASH's createsprite passes animation index 0.)
//
// Tile source: gBattleAnimSpriteGfx_Slash (src/graphics.c:609,
// "graphics/battle_anims/sprites/slash.png", 0x0800 bytes = 2048/32B-per-4bpp-
// tile = 64 tiles = 4 stacked 32x32 frames, src/data/battle_anim.h:1195).
// Palette source: gBattleAnimSpritePal_Slash (src/graphics.c:610, the SAME
// png's embedded ".gbapal.lz" palette, src/data/battle_anim.h:1488) - unlike
// CUT, slash.png carries its own palette, so it comes from slash.png's PLTE.
//
// Color rule: `decodeIndexedPng` already round-trips every palette entry
// through the real 5-bit GBA channel (gbaColor.ts's gbaRoundTrip, NOT a naive
// <<3), matching mGBA's own framebuffer expansion - this has been the proven
// pipeline for every other battle-anim asset in this file's sibling
// extractors.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-slash-slice.ts
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

const slashImage = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "slash.png"));
const { columns, rows, tiles } = sliceTiles(slashImage);
if (columns !== 4 || rows !== 16 || tiles.length !== 64) {
  throw new Error(`slash.png: expected 4x16 tiles (64 total, 4 stacked 32x32 frames), got ${columns}x${rows} (${tiles.length})`);
}
const FRAME_ROWS = 4; // 32x32 = 4x4 tiles
const FRAME_TILE_COUNT = 16;
const frames = [0, 1, 2, 3].map((i) => tiles.slice(i * FRAME_TILE_COUNT, (i + 1) * FRAME_TILE_COUNT).map((t) => [...t.pixels]));

writeJson(join(ASSETS_GEN, "battle-anim-slash-slice.json"), {
  source: "graphics/battle_anims/sprites/slash.png (src/graphics.c:609, ANIM_TAG_SLASH); palette same png's embedded gbapal (src/graphics.c:610, gBattleAnimSpritePal_Slash, src/data/battle_anim.h:1488)",
  template: "gSlashSliceSpriteTemplate, src/battle_anim_effects_1.c:1598-1607",
  tileset: { columns, rows: FRAME_ROWS, tiles: frames[0] },
  frames: { columns, rows: FRAME_ROWS, list: frames },
  palette: slashImage.palette,
  oam: { shape: "32x32", size: "32x32", affine: false, affineMode: "OFF", objMode: "NORMAL" },
  anim: {
    source: "gSlashSliceAnimCmds1, src/battle_anim_effects_1.c:1577-1584",
    frameTileOffsets: [0, 16, 32, 48],
    durationTicksPerFrame: 4,
    loops: false,
  },
});

console.log("extraction complete");
