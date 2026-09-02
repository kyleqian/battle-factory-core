/** Reproducible extraction for Hyper Beam's ANIM_TAG_ORBS asset. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const source = "graphics/battle_anims/sprites/orbs.png";
const image = decodeIndexedPng(join(root, "reference/pokeemerald", source));
const sliced = sliceTiles(image);
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/hyper-beam.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: `${source}; ANIM_TAG_ORBS; gHyperBeamOrbSpriteTemplate`,
  orbs: { tileset: { columns: sliced.columns, rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]) }, palette: image.palette },
})}\n`);
console.log(`wrote ${out}`);

