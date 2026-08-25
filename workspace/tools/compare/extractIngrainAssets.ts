// Reproducible source extraction for MOVE_INGRAIN's ROOTS and ORBS tags.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outFlag = process.argv.indexOf("--out");
const output = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/ingrain.json");

function extract(
  filename: "roots.png" | "orbs.png",
  expectedSha256: string,
  expectedWidth: number,
  expectedHeight: number,
) {
  const sourcePath = join(root, "reference/pokeemerald/graphics/battle_anims/sprites", filename);
  const sourceBytes = readFileSync(sourcePath);
  const pngSha256 = createHash("sha256").update(sourceBytes).digest("hex");
  if (pngSha256 !== expectedSha256) throw new Error(`${filename} source PNG changed`);
  const image = decodeIndexedPng(sourcePath);
  const sliced = sliceTiles(image);
  if (image.width !== expectedWidth || image.height !== expectedHeight
    || sliced.columns !== expectedWidth / 8 || sliced.rows !== expectedHeight / 8) {
    throw new Error(`${filename} source asset geometry changed`);
  }
  return {
    pngSha256,
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  };
}

const roots = extract(
  "roots.png",
  "085fbb67a415cdff54c0462cc36835de29f033554805f8bb6b9bf934fbc71e23",
  32,
  128,
);
const orbs = extract(
  "orbs.png",
  "91c48d207d5e6e0c2e5ca6804e431df390a8dddc9db6b20e30c0ba9d52e6b2d5",
  16,
  48,
);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: {
    roots: "graphics/battle_anims/sprites/roots.png; ANIM_TAG_ROOTS",
    orbs: "graphics/battle_anims/sprites/orbs.png; ANIM_TAG_ORBS",
    templates: "gIngrainRootSpriteTemplate; gIngrainOrbSpriteTemplate",
  },
  roots,
  orbs,
})}\n`);
console.log(`wrote ${output}`);
