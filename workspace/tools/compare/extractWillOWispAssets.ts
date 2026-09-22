/** Reproduce Will-O-Wisp's two source sprite sheets. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const flag = process.argv.indexOf("--out");
const output = flag >= 0 && process.argv[flag + 1]
  ? resolve(process.argv[flag + 1]!)
  : resolve(root, "src/animation/assets/will-o-wisp.json");
const sourceDir = resolve(root, "reference/pokeemerald/graphics/battle_anims/sprites");
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

function extract(name: string, expectedHash: string) {
  const path = join(sourceDir, name);
  const bytes = readFileSync(path);
  if (sha(bytes) !== expectedHash) throw new Error(`${name} source changed`);
  const image = decodeIndexedPng(path);
  const sliced = sliceTiles(image);
  return { tileset: { columns: sliced.columns, rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]) }, palette: image.palette };
}

const asset = {
  source: {
    orb: "graphics/battle_anims/sprites/wisp_orb.png; ANIM_TAG_WISP_ORB",
    fire: "graphics/battle_anims/sprites/wisp_fire.png; ANIM_TAG_WISP_FIRE",
  },
  orb: extract("wisp_orb.png", "117e94dfea7e9eed00a6ac99aafe3a5bde54fde2050703bf381132aa8658f09e"),
  fire: extract("wisp_fire.png", "7d767c48efb22c312bd10dc21e4858a0a5adae6582ea300cecb31559a5a50d78"),
};
const serialized = `${JSON.stringify(asset)}\n`;
if (process.argv.includes("--check")) {
  if (!existsSync(output) || readFileSync(output, "utf8") !== serialized) {
    throw new Error(`Will-O-Wisp assets differ from authoritative sources: ${output}`);
  }
  console.log("Will-O-Wisp assets match authoritative sources");
  process.exit(0);
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, serialized);
console.log(`wrote ${output}`);
