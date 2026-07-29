import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/bubble-beam.json");
const sprite = (name: string) => {
  const image = decodeIndexedPng(join(ref, `graphics/battle_anims/sprites/${name}.png`));
  const tiles = sliceTiles(image);
  return { tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) }, palette: image.palette };
};
const mon = (path: string) => {
  const image = decodeIndexedPng(join(ref, path));
  const tiles = sliceTiles(image);
  return { tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) }, palette: loadJascPal(join(ref, "graphics/pokemon/surskit/normal.pal")) };
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({ source: { bubble: "graphics/battle_anims/sprites/bubble.png; ANIM_TAG_BUBBLE", smallBubbles: "graphics/battle_anims/sprites/small_bubbles.png; ANIM_TAG_SMALL_BUBBLES (byte-identical reuse with water-gun)", surskitBack: "graphics/pokemon/surskit/back.png; Factory set 42", surskitFront: "graphics/pokemon/surskit/anim_front.png; Factory set 42 resting frame 0" }, bubble: sprite("bubble"), smallBubbles: sprite("small_bubbles"), surskitBack: mon("graphics/pokemon/surskit/back.png"), surskitFront: mon("graphics/pokemon/surskit/anim_front.png") })}\n`);
console.log(`wrote ${out}`);
