// Reproducible dev-time extraction for MOVE_SCREECH purple-ring source art.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/screech.json");
const image = decodeIndexedPng(
  join(ref, "graphics/battle_anims/sprites/gold_ring.png"),
);
const sliced = sliceTiles(image);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({
  source: {
    purpleRing:
      "graphics/battle_anims/sprites/gold_ring.png + "
      + "graphics/battle_anims/sprites/purple_ring.pal; "
      + "gScreechRingSpriteTemplate; ANIM_TAG_PURPLE_RING",
  },
  purpleRing: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(
      join(ref, "graphics/battle_anims/sprites/purple_ring.pal"),
    ),
  },
}) + "\n");
console.log("wrote " + out);
