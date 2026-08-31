// Reproducible dev-time extraction for MOVE_SAFEGUARD's Guard Ring art.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/safeguard.json");
const image = decodeIndexedPng(
  join(ref, "graphics/battle_anims/sprites/guard_ring.png"),
);
const sliced = sliceTiles(image);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({
  source: {
    guardRing:
      "graphics/battle_anims/sprites/guard_ring.png; "
      + "gGuardRingSpriteTemplate; ANIM_TAG_GUARD_RING",
  },
  guardRing: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
}) + "\n");
console.log("wrote " + out);
