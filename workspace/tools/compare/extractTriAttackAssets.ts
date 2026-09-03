/** Reproduce the two Tri Attack-specific source sheets. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const flag = process.argv.indexOf("--out");
const output = flag >= 0 && process.argv[flag + 1]
  ? resolve(process.argv[flag + 1]!)
  : resolve(root, "src/animation/assets/tri-attack.json");
const sourceDir = resolve(root, "reference/pokeemerald/graphics/battle_anims/sprites");
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

function extract(name: string, expectedHash: string) {
  const path = join(sourceDir, name);
  const bytes = readFileSync(path);
  if (sha(bytes) !== expectedHash) throw new Error(`${name} source changed`);
  const image = decodeIndexedPng(path);
  const sliced = sliceTiles(image);
  return {
    tileset: { columns: sliced.columns, rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  };
}

const asset = {
  source: {
    triangle: "graphics/battle_anims/sprites/tri_attack_triangle.png",
    fire: "graphics/battle_anims/sprites/fire.png",
  },
  triangle: extract("tri_attack_triangle.png", "a5f87f24a739b5142af31846afd98527ab105da5e6443b001456f583c8b4752b"),
  fire: extract("fire.png", "6d547fd21ab13be12e64c7a40689dc9941cea28e77ff032238627f0e3dc27e82"),
};
const serialized = `${JSON.stringify(asset)}\n`;
if (process.argv.includes("--check")) {
  if (!existsSync(output) || readFileSync(output, "utf8") !== serialized) {
    throw new Error(`Tri Attack assets differ from authoritative sources: ${output}`);
  }
  console.log("Tri Attack assets match authoritative sources");
  process.exit(0);
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, serialized);
console.log(`wrote ${output}`);
