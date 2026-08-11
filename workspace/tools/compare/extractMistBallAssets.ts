import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reference = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/mist-ball.json");

function sprite(path: string, palettePath: string) {
  const image = decodeIndexedPng(join(reference, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(join(reference, palettePath)),
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    latias: "graphics/pokemon/latias/{back.png,anim_front.png,normal.pal}; FRONTIER_MON_LATIAS_4 set 798",
    registeel: "graphics/pokemon/registeel/{back.png,anim_front.png,normal.pal}; legal bilateral target",
    projectile: "graphics/battle_anims/sprites/small_bubbles.png; ANIM_TAG_SMALL_BUBBLES; gMistBallSpriteTemplate",
    fog: "graphics/weather/fog_horizontal.png + fog.pal; graphics/battle_anims/backgrounds/fog.bin; shared source assets with HAZE",
  },
  latiasBack: sprite("graphics/pokemon/latias/back.png", "graphics/pokemon/latias/normal.pal"),
  latiasFront: sprite("graphics/pokemon/latias/anim_front.png", "graphics/pokemon/latias/normal.pal"),
  registeelBack: sprite("graphics/pokemon/registeel/back.png", "graphics/pokemon/registeel/normal.pal"),
  registeelFront: sprite("graphics/pokemon/registeel/anim_front.png", "graphics/pokemon/registeel/normal.pal"),
})}\n`);
console.log(`wrote ${out}`);
