// Source-only extractor for FAINT_ATTACK's `fadetobg BG_DARK` backdrop.
//
// Move_FAINT_ATTACK names BG_DARK in data/battle_anim_scripts.s.  The
// background table maps that id to dark.png (tiles + palette) and dark.bin
// (the 32x32 text-BG map).  LoadMoveBg installs them in charblock 2,
// screenblock 26, and BG palette bank 2.  Production consumes only this
// compact indexed asset; neither the reference checkout nor an oracle
// framebuffer is available at runtime.
//
// Run:
//   node --experimental-strip-types tools/extract/extract-faint-attack-assets.ts

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { to5Bit } from "./gbaColor.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF_BG = join(RUN_ROOT, "reference", "pokeemerald", "graphics", "battle_anims", "backgrounds");
const OUT = join(RUN_ROOT, "src", "assets", "gen", "battle-anim-bg-dark.json");

const image = decodeIndexedPng(join(REF_BG, "dark.png"));
const sliced = sliceTiles(image);
const packedTiles = Buffer.alloc(sliced.tiles.length * 32);
for (let tileIndex = 0; tileIndex < sliced.tiles.length; tileIndex += 1) {
  const pixels = sliced.tiles[tileIndex]!.pixels;
  for (let p = 0; p < 64; p += 2) {
    packedTiles[tileIndex * 32 + p / 2] = pixels[p]! | (pixels[p + 1]! << 4);
  }
}

const paletteBgr555 = image.palette.map(({ r, g, b }) => (
  to5Bit(r) | (to5Bit(g) << 5) | (to5Bit(b) << 10)
));
const map = readFileSync(join(REF_BG, "dark.bin"));
if (image.width !== 128 || image.height !== 128 || packedTiles.length !== 0x2000) {
  throw new Error(`unexpected BG_DARK geometry ${image.width}x${image.height}, ${packedTiles.length} tile bytes`);
}
if (map.length !== 0x800) throw new Error(`unexpected BG_DARK map size ${map.length}`);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({
  source: "graphics/battle_anims/backgrounds/dark.png + dark.bin (gBattleAnimBackgroundTable[BG_DARK])",
  charBlock2B64: packedTiles.toString("base64"),
  screenBlock26B64: map.toString("base64"),
  paletteBank2Bgr555: paletteBgr555,
})}\n`);
console.log(`wrote ${OUT}`);
