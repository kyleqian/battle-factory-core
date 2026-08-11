import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { parseTilemap } from "../extract/tilemap.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/sandstorm.json");

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

const brew = sprite(
  "graphics/battle_anims/backgrounds/sandstorm_brew.png",
);
const flyingDirt = sprite(
  "graphics/battle_anims/sprites/flying_dirt.png",
);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    phanpyBack:
      "graphics/pokemon/phanpy/back.png; FRONTIER_MON_PHANPY set 120; SPECIES_PHANPY 231",
    phanpyFront:
      "graphics/pokemon/phanpy/anim_front.png frame 0; FRONTIER_MON_PHANPY set 120; SPECIES_PHANPY 231",
    flyingDirt:
      "graphics/battle_anims/sprites/flying_dirt.png; ANIM_TAG_FLYING_DIRT; gFlyingSandCrescentSpriteTemplate",
    background:
      "sandstorm_brew.png + sandstorm_brew.bin; gBattleAnimBgImage_Sandstorm/gBattleAnimBgTilemap_Sandstorm; palette is gBattleAnimSpritePal_FlyingDirt",
  },
  phanpyBack: sprite(
    "graphics/pokemon/phanpy/back.png",
    "graphics/pokemon/phanpy/normal.pal",
  ),
  phanpyFront: sprite(
    "graphics/pokemon/phanpy/anim_front.png",
    "graphics/pokemon/phanpy/normal.pal",
  ),
  flyingDirt,
  background: {
    tileset: brew.tileset,
    tilemap: parseTilemap(
      readFileSync(join(
        ref,
        "graphics/battle_anims/backgrounds/sandstorm_brew.bin",
      )),
      32,
      32,
    ),
    palette: flyingDirt.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
