// Reproducible source extraction for MOVE_FLATTER's two sprite resources.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/flatter.json");

function sprite(path: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return { tileset: { columns: sliced.columns, rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]) }, palette: image.palette };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    spotlight: "graphics/battle_anims/sprites/spotlight.png; ANIM_TAG_SPOTLIGHT",
    confetti: "graphics/battle_anims/sprites/confetti.png; ANIM_TAG_CONFETTI",
  },
  spotlight: sprite("graphics/battle_anims/sprites/spotlight.png"),
  confetti: sprite("graphics/battle_anims/sprites/confetti.png"),
})}\n`);
console.log(`wrote ${out}`);
