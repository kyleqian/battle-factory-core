import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const outIndex = process.argv.indexOf("--out");
const output = outIndex >= 0 ? process.argv[outIndex + 1] : "src/animation/assets/swift-yellow-star.json";
if (!output) throw new Error("--out requires a path");
const image = decodeIndexedPng(resolve(root, "reference/pokeemerald/graphics/battle_anims/sprites/yellow_star.png"));
const tiles = sliceTiles(image);
const asset = {
  source: {
    art: "graphics/battle_anims/sprites/yellow_star.png",
    tag: { name: "ANIM_TAG_YELLOW_STAR", value: 10174 },
    graphics: { symbol: "gBattleAnimSpriteGfx_YellowStar", bytes: 0x200 },
    palette: { symbol: "gBattleAnimSpritePal_YellowStar", entries: 16 },
    template: "gSwiftStarSpriteTemplate / affine-normal ObjNormal 32x32",
  },
  tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) },
  palette: image.palette,
};
writeFileSync(resolve(root, output), `${JSON.stringify(asset)}\n`);
