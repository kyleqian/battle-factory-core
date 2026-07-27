// Reproducible dev-time extraction for MOVE_KNOCK_OFF's staged player
// orientation. Runtime code consumes only the generated JSON.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/knock-off.json");

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

const data = {
  source: {
    strike: "graphics/battle_anims/sprites/slam_hit_2.png; gKnockOffStrikeSpriteTemplate",
    attacker: "graphics/pokemon/shuppet/back.png; gMonBackPic_Shuppet",
  },
  strike: sprite("graphics/battle_anims/sprites/slam_hit_2.png"),
  shuppetBack: sprite(
    "graphics/pokemon/shuppet/back.png",
    "graphics/pokemon/shuppet/normal.pal",
  ),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(data)}\n`);
console.log(`wrote ${out}`);
