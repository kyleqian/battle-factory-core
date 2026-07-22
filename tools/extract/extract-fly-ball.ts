// Dev-time extractor: turn 14's FLY charge-half "round shadow" ball sprite
// (docs/turn14-notes.md's worktree-lane addendum): `gFlyBallUpSpriteTemplate`
// (reference/pokeemerald/src/battle_anim_flying.c:131-140) - tileTag/
// paletteTag ANIM_TAG_ROUND_SHADOW, oam &gOamData_AffineDouble_ObjNormal_64x64
// (a full 64x64 sprite, affine-double mode - the on-screen destination window
// doubles to 128x128, centered on the sprite's own nominal corner, same
// convention drawSpriteSheetAffineStretch's own `doubled` param already
// establishes for ENDEAVOR's squish). Source PNG (unlike mud_sand.4bpp) has a
// checked-in .png companion, so this reuses the standard decodeIndexedPng/
// sliceTiles pipeline every other battle-anim sprite sheet already uses.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-fly-ball.ts
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

const img = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "round_shadow.png"));
const { columns, rows, tiles } = sliceTiles(img);
writeJson(join(ASSETS_GEN, "battle-anim-fly-ball.json"), {
  tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
  palette: img.palette,
});
