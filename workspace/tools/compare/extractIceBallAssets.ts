/** Dev-time extractor for MOVE_ICE_BALL's source-owned ANIM_TAG_ICE_CHUNK. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const source = resolve(root, "reference/pokeemerald/graphics/battle_anims/sprites/ice_chunk.png");
const output = resolve(root, "src/animation/assets/ice-ball.json");
const bytes = readFileSync(source);
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");
const image = decodeIndexedPng(source);
const sliced = sliceTiles(image);
if (image.width !== 32 || image.height !== 160 || image.bitDepth !== 4
  || image.palette.length !== 16 || sliced.tiles.length !== 80
  || bytes.length !== 864
  || sha256(bytes) !== "7fcdd6a5377b4c3fbbd5880a8bf4d11afdbbbb21567ac6e76692ad4ec4f88a0c") {
  throw new Error("Ice Ball source asset drifted");
}
const asset = {
  schema: "ice-ball-source-assets/v1",
  source: {
    path: "graphics/battle_anims/sprites/ice_chunk.png",
    sha256: sha256(bytes),
    graphics: "gBattleAnimSpriteGfx_IceChunk",
    palette: "gBattleAnimSpritePal_IceChunk",
    tag: "ANIM_TAG_ICE_CHUNK",
    tileBytes: 0x0a00,
  },
  chunk: {
    tileset: { columns: sliced.columns, rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
    frames: [0, 16, 32, 48, 64],
  },
};
writeFileSync(output, `${JSON.stringify(asset)}\n`);
console.log(`wrote ${output}`);
