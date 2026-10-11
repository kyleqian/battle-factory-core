// stg107 (docs/stg107-struggle.md): dev-time extractor for Move_STRUGGLE's one NEW asset, ANIM_TAG_MOVEMENT_WAVES
// (gMovementWavesSpriteTemplate, src/battle_anim_effects_2.c:1158; no other move uses it).
//
// Standalone on purpose (the lick / sweat-drop precedent): never folded into a bulk extractor that could silently drop it.
//   gBattleAnimSpriteGfx_MovementWaves (src/graphics.c:732, "graphics/battle_anims/sprites/movement_waves.png", .4bpp.lz, 0x0600 bytes
//   = 48 tiles; src/data/battle_anim.h:1227) = three 32x32 frames of 16 tiles stacked vertically (the png is 32x96);
//   gBattleAnimSpritePal_MovementWaves (src/graphics.c:733, the same png's .gbapal; src/data/battle_anim.h:1520).
//   .oam = gOamData_AffineOff_ObjNormal_32x32; .anims = gMovementWavesAnimTable (:1152): anim 0 = frames (tile offsets) 0, 16, 32, 16,
//   anim 1 = 16, 32, 16, 0 with hFlip, 8 ticks each, ANIMCMD_END (AnimMovementWaves_Step restarts it data[0] = gBattleAnimArgs[2] times).
// Colors go through decodeIndexedPng's gbaRoundTrip (the proven pipeline of every sibling battle-anim asset).
//
// usage: node --experimental-strip-types tools/extract/stg107-extract-movement-waves.ts [<out.json>]
//   default <out.json> = src/assets/gen/battle-anim-movement-waves.json (the land step's new asset; stg107 writes it only into its
//   git-archive copy). Never imported at runtime.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const out = process.argv[2] ?? join(RUN_ROOT, "src", "assets", "gen", "battle-anim-movement-waves.json");

const image = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "movement_waves.png"));
const { columns, rows, tiles } = sliceTiles(image);
if (columns !== 4 || rows !== 12 || tiles.length !== 48) {
  throw new Error(`movement_waves.png: expected 4x12 tiles (48 = three stacked 32x32 frames), got ${columns}x${rows} (${tiles.length})`);
}
const FRAME_TILES = 16;
const frames = [0, 1, 2].map((i) => tiles.slice(i * FRAME_TILES, (i + 1) * FRAME_TILES).map((t) => [...t.pixels]));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: "graphics/battle_anims/sprites/movement_waves.png (src/graphics.c:732, ANIM_TAG_MOVEMENT_WAVES); palette the same png's gbapal (src/graphics.c:733)",
  template: "gMovementWavesSpriteTemplate, src/battle_anim_effects_2.c:1158-1166",
  tileset: { columns, rows: 4, tiles: frames[0] },
  frames: { columns, rows: 4, list: frames },
  palette: image.palette,
  oam: { shape: "32x32", size: "32x32", affine: false, affineMode: "OFF", objMode: "NORMAL" },
  anim: {
    source: "gMovementWavesAnimCmds1 / gMovementWavesAnimCmds2, src/battle_anim_effects_2.c:1134-1150",
    tables: [[{ tileOffset: 0, hFlip: false }, { tileOffset: 16, hFlip: false }, { tileOffset: 32, hFlip: false }, { tileOffset: 16, hFlip: false }],
      [{ tileOffset: 16, hFlip: true }, { tileOffset: 32, hFlip: true }, { tileOffset: 16, hFlip: true }, { tileOffset: 0, hFlip: true }]],
    durationTicksPerFrame: 8,
    loops: false,
  },
})}\n`);
console.log(`wrote ${out}`);
