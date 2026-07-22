// Dev-time extractor: SAND_ATTACK's own dirt-throw sprite (docs/turn13-notes.md
// §(a)/S7/S8 turn 13 Part A): `gSandAttackDirtSpriteTemplate`
// (reference/pokeemerald/src/battle_anim_ground.c:74-83) - tileTag/paletteTag
// ANIM_TAG_MUD_SAND, oam &gOamData_AffineOff_ObjNormal_8x8 (single 8x8 tile,
// no animation - `.anims = gDummySpriteAnimTable`, `.images = NULL`, so only
// tile 0 of the sheet is ever shown).
//
// Unlike every other battle-anim sprite this run has extracted so far, the
// tile source (`gBattleAnimSpriteGfx_MudSand`, src/graphics.c:502) has NO
// `.png` companion checked into this reference tree - only the already-
// compiled `graphics/battle_anims/sprites/mud_sand.4bpp` (160 bytes = 5
// raw 4bpp 8x8 tiles, uncompressed - `INCGFX_U32(..., ".lz")` LZ-compresses
// it at BUILD time, but the checked-in source file itself is the raw
// pre-compression 4bpp planar data) and `mud_sand.pal` (JASC-PAL, 16 colors).
// Only tile 0 is needed (AnimDirtScatter's own sprite always shows the
// template's default frame). Decoded directly here (GBA 4bpp tile: 8 rows of
// 4 bytes, each byte 2 pixels, low nibble first/left).
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-sandattack-dirt.ts
//
// Never imported at runtime - the production build only reads the JSON
// output under src/assets/gen/.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

function decode4bppTile(bytes: Buffer, tileOffset: number): number[] {
  const px = new Array<number>(64).fill(0);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const byte = bytes[tileOffset + row * 4 + col]!;
      px[row * 8 + col * 2] = byte & 0x0f;
      px[row * 8 + col * 2 + 1] = (byte >> 4) & 0x0f;
    }
  }
  return px;
}

const spritesDir = join(REF, "graphics", "battle_anims", "sprites");
const gfxBytes = readFileSync(join(spritesDir, "mud_sand.4bpp"));
if (gfxBytes.length % 32 !== 0) {
  throw new Error(`mud_sand.4bpp: expected a multiple of 32 bytes (8x8 4bpp tiles), got ${gfxBytes.length}`);
}
const tile0 = decode4bppTile(gfxBytes, 0);
const palette = loadJascPal(join(spritesDir, "mud_sand.pal"));
if (palette.length !== 16) throw new Error(`mud_sand.pal: expected 16 colors, got ${palette.length}`);

writeJson(join(ASSETS_GEN, "battle-anim-mud-sand.json"), {
  tileset: { columns: 1, rows: 1, tiles: [tile0] },
  palette,
});
