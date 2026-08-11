// Dev-time extractor for MOVE_LICK's (staged, round A) ONE new asset: the
// "lick" sprite's tile sheet and palette (gLickSpriteTemplate's ANIM_TAG_LICK
// art).
//
// PAPERCUT-DODGE: this is a deliberately standalone script, NOT folded into
// `extract-battle-anim-assets.ts` (that file has a known silent-drop bug on
// re-run, PAPERCUTS.md "extract-battle-anim-assets.ts re-run silently drops
// grovyleFrontAnim") - a fresh file means this asset can never be silently
// dropped by re-running an unrelated bulk script.
//
// Move_LICK (data/battle_anim_scripts.s):
//   loadspritegfx ANIM_TAG_LICK
//   delay 15
//   playsewithpan SE_M_LICK, SOUND_PAN_TARGET
//   createsprite gLickSpriteTemplate, ANIM_TARGET, 2, 0, 0
//   createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 1, 0, 16, 1
//   waitforvisualfinish
//   end
//
// gLickSpriteTemplate (src/battle_anim_ghost.c:116-125):
//   .tileTag = ANIM_TAG_LICK, .paletteTag = ANIM_TAG_LICK
//   .oam = &gOamData_AffineOff_ObjNormal_16x32 (src/data/battle_anim.h:142-
//     153 - affineMode=ST_OAM_AFFINE_OFF (0), objMode=ST_OAM_OBJ_NORMAL (0),
//     shape=SPRITE_SHAPE(16x32), size=SPRITE_SIZE(16x32); confirmed directly
//     against the struct literal, NOT assumed, per the lane's lesson that
//     affine-mode and 16x32-vs-32x32 confusion is a real, recurring bug class
//     here). This is NOT 32x32 and NOT ObjBlend.
//   .anims = sAnims_Lick -> sAnim_Lick (src/battle_anim_ghost.c:101-110):
//     ANIMCMD_FRAME(0,2), ANIMCMD_FRAME(8,2), ANIMCMD_FRAME(16,2),
//     ANIMCMD_FRAME(24,2), ANIMCMD_FRAME(32,2), ANIMCMD_END - 5 frames of 8
//     tiles each, 2 ticks/frame, no loop. (Move_LICK's createsprite passes
//     animation index 0.)
//   .callback = AnimLick (:462-466): InitSpritePosToAnimTarget(sprite, TRUE)
//     then AnimLick_Step (:468-): after the anim ends the sprite goes
//     invisible and then toggles `invisible` on a data[0]/data[1]/data[2]
//     counter ladder (case 0 flips every 2 ticks, case 1 every 4 ticks, five
//     flips per case) before DestroyAnimSprite.
//
// Tile source: gBattleAnimSpriteGfx_Lick (src/graphics.c:594,
// "graphics/battle_anims/sprites/lick.png", 0x0500 bytes = 1280/32B-per-4bpp-
// tile = 40 tiles = 5 stacked 16x32 frames of 8 tiles each, src/data/
// battle_anim.h:1189). Palette source: gBattleAnimSpritePal_Lick (src/
// graphics.c:595, the SAME png's embedded ".gbapal.lz" palette, src/data/
// battle_anim.h:1482).
//
// Color rule: `decodeIndexedPng` already round-trips every palette entry
// through the real 5-bit GBA channel (gbaColor.ts's gbaRoundTrip, NOT a naive
// <<3), matching mGBA's own framebuffer expansion - this has been the proven
// pipeline for every other battle-anim asset in this file's sibling
// extractors.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-lick-sprite.ts
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

const lickImage = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "lick.png"));
const { columns, rows, tiles } = sliceTiles(lickImage);
if (columns !== 2 || rows !== 20 || tiles.length !== 40) {
  throw new Error(`lick.png: expected 2x20 tiles (40 total, 5 stacked 16x32 frames), got ${columns}x${rows} (${tiles.length})`);
}
const FRAME_ROWS = 4; // 16x32 = 2x4 tiles
const FRAME_TILE_COUNT = 8;
const frames = [0, 1, 2, 3, 4].map((i) => tiles.slice(i * FRAME_TILE_COUNT, (i + 1) * FRAME_TILE_COUNT).map((t) => [...t.pixels]));

writeJson(join(ASSETS_GEN, "battle-anim-lick.json"), {
  source: "graphics/battle_anims/sprites/lick.png (src/graphics.c:594, ANIM_TAG_LICK); palette same png's embedded gbapal (src/graphics.c:595, gBattleAnimSpritePal_Lick, src/data/battle_anim.h:1482)",
  template: "gLickSpriteTemplate, src/battle_anim_ghost.c:116-125",
  tileset: { columns, rows: FRAME_ROWS, tiles: frames[0] },
  frames: { columns, rows: FRAME_ROWS, list: frames },
  palette: lickImage.palette,
  oam: { shape: "16x32", size: "16x32", affine: false, affineMode: "OFF", objMode: "NORMAL" },
  anim: {
    source: "sAnim_Lick, src/battle_anim_ghost.c:101-110",
    frameTileOffsets: [0, 8, 16, 24, 32],
    durationTicksPerFrame: 2,
    loops: false,
  },
});

console.log("extraction complete");
