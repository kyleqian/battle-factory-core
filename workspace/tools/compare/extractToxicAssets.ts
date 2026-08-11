// Reproducible extraction for Toxic's two bubble tags and real set-134 carrier.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/toxic.json");
function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: { columns: sliced.columns, rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette,
  };
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    toxicBubble: "graphics/battle_anims/sprites/toxic_bubble.png; ANIM_TAG_TOXIC_BUBBLE",
    poisonBubble: "graphics/battle_anims/sprites/poison_bubble.png; ANIM_TAG_POISON_BUBBLE",
    clamperlBack: "graphics/pokemon/clamperl/back.png; FRONTIER_MON_CLAMPERL set 134",
    clamperlFront: "graphics/pokemon/clamperl/anim_front.png frame 0; FRONTIER_MON_CLAMPERL set 134",
  },
  toxicBubble: sprite("graphics/battle_anims/sprites/toxic_bubble.png"),
  poisonBubble: sprite("graphics/battle_anims/sprites/poison_bubble.png"),
  clamperlBack: sprite("graphics/pokemon/clamperl/back.png", "graphics/pokemon/clamperl/normal.pal"),
  clamperlFront: sprite("graphics/pokemon/clamperl/anim_front.png", "graphics/pokemon/clamperl/normal.pal"),
})}\n`);
console.log(`wrote ${out}`);
