// Reproducible source extraction for MOVE_AROMATHERAPY's only Factory carrier
// and the unrepresented ANIM_TAG_FLOWER sheet.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";
import { parseTilemap } from "../extract/tilemap.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outAt = process.argv.indexOf("--out");
const out = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "src/animation/assets/aromatherapy.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette,
  };
}

function flowerSheet() {
  const big = sprite(
    "graphics/battle_anims/sprites/flower_0.png",
    "graphics/battle_anims/sprites/flower.pal",
  );
  const small = sprite(
    "graphics/battle_anims/sprites/flower_1.png",
    "graphics/battle_anims/sprites/flower.pal",
  );
  // graphics_file_rules.mk concatenates flower_0.4bpp (four tiles) and
  // flower_1.4bpp (one tile); ANIMCMD_FRAME(4) selects the fifth tile.
  return {
    tileset: {
      columns: 5,
      rows: 1,
      tiles: [...big.tileset.tiles, ...small.tileset.tiles],
    },
    palette: big.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    vileplumeBack:
      "graphics/pokemon/vileplume/back.png + normal.pal; FRONTIER_MON_VILEPLUME_1 set 394",
    vileplumeFront:
      "graphics/pokemon/vileplume/anim_front.png frame 0 + normal.pal; FRONTIER_MON_VILEPLUME_1 set 394",
    flower:
      "graphics/battle_anims/sprites/flower_{0,1}.png concatenated by graphics_file_rules.mk + flower.pal; ANIM_TAG_FLOWER",
    sparkle2:
      "graphics/battle_anims/sprites/sparkle_1.png + sparkle_2.pal; ANIM_TAG_SPARKLE_2; gSparklingStarsSpriteTemplate",
    thinRing:
      "graphics/battle_anims/sprites/thin_ring.png; ANIM_TAG_THIN_RING; gBlendThinRingExpandingSpriteTemplate",
    cureBubbles:
      "graphics/battle_anims/masks/cure_bubbles.png + cure_bubbles.bin; StartMonScrollingBgMask",
  },
  vileplumeBack: sprite(
    "graphics/pokemon/vileplume/back.png",
    "graphics/pokemon/vileplume/normal.pal",
  ),
  vileplumeFront: sprite(
    "graphics/pokemon/vileplume/anim_front.png",
    "graphics/pokemon/vileplume/normal.pal",
  ),
  flower: flowerSheet(),
  sparkle2: sprite(
    "graphics/battle_anims/sprites/sparkle_1.png",
    "graphics/battle_anims/sprites/sparkle_2.pal",
  ),
  thinRing: sprite("graphics/battle_anims/sprites/thin_ring.png"),
  cureBubbles: {
    ...sprite("graphics/battle_anims/masks/cure_bubbles.png"),
    tilemap: parseTilemap(
      readFileSync(join(
        ref,
        "graphics/battle_anims/masks/cure_bubbles.bin",
      )),
      32,
      32,
    ),
  },
})}\n`);
console.log(`wrote ${out}`);
