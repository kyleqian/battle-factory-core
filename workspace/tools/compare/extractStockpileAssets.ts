import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const outIndex = process.argv.indexOf("--out");
const output = outIndex >= 0 ? resolve(process.argv[outIndex + 1]!) : resolve(root, "src/animation/assets/stockpile-gray-orb.json");
const image = decodeIndexedPng(join(root, "reference/pokeemerald/graphics/battle_anims/sprites/gray_orb.png"));
const tiles = sliceTiles(image);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({
  source: "graphics/battle_anims/sprites/gray_orb.png; ANIM_TAG_GRAY_ORB; gStockpileAbsorptionOrbSpriteTemplate",
  tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) },
  palette: image.palette,
}) + "\n");
console.log("wrote " + output);
