// Reproducible source extraction for Move_THUNDER's BG_THUNDER asset.
// Lightning keeps the already-proven gLightningSpriteTemplate/art contract;
// this file owns only the source background bytes needed by the later
// compositor.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { parseTilemap } from "../extract/tilemap.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/thunder.json");

function backgroundSprite(path: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    background:
      "graphics/battle_anims/backgrounds/thunder.png + thunder.bin; BG_THUNDER; gBattleAnimBg{Image,Palette,Tilemap}_Thunder",
    lightning:
      "reuse gLightningSpriteTemplate and AnimLightning_Step; source-identical to THUNDER_PUNCH",
  },
  background: {
    ...backgroundSprite("graphics/battle_anims/backgrounds/thunder.png"),
    tilemap: parseTilemap(readFileSync(
      join(ref, "graphics/battle_anims/backgrounds/thunder.bin"),
    ), 32, 32),
  },
})}\n`);
console.log(`wrote ${out}`);
