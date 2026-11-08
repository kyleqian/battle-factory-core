/** Reproducible full-sheet extraction for Helping Hand's `ANIM_TAG_TAG_HAND`. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outIndex = process.argv.indexOf("--out");
const output = outIndex >= 0 && process.argv[outIndex + 1]
  ? resolve(process.argv[outIndex + 1]!)
  : resolve(root, "tests/fixtures/data/helping-hand-tag-hand.json");
const sourcePath = resolve(root, "reference/pokeemerald/graphics/battle_anims/sprites/tag_hand.png");
const source = readFileSync(sourcePath);
const image = decodeIndexedPng(sourcePath);
const tiles = sliceTiles(image);
const sha256 = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");

if (image.width !== 32 || image.height !== 64 || tiles.columns !== 4
  || tiles.rows !== 8 || tiles.tiles.length !== 32 || image.palette.length !== 16) {
  throw new Error("TAG_HAND source geometry changed");
}

const pixels = (offset: number, count: number) => tiles.tiles.slice(offset, offset + count)
  .map((tile) => [...tile.pixels]);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: {
    graphics: "graphics/battle_anims/sprites/tag_hand.png",
    tag: { name: "ANIM_TAG_TAG_HAND", value: 10247 },
    graphicsSymbol: "gBattleAnimSpriteGfx_TagHand",
    paletteSymbol: "gBattleAnimSpritePal_Finger",
    template: "gHelpingHandClapSpriteTemplate; gOamData_AffineOff_ObjNormal_32x32",
    callback: "AnimHelpingHandClap; tileNum += 16 after callback phase 5 tick 15",
  },
  hashes: { sourcePngSha256: sha256(source) },
  dimensions: { widthPixels: image.width, heightPixels: image.height, bitDepth: 4, tiles: 32 },
  tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) },
  palette: image.palette,
  cells: {
    initial: { tileOffset: 0, widthPixels: 32, heightPixels: 32, tiles: pixels(0, 16) },
    clap: { tileOffset: 16, widthPixels: 32, heightPixels: 32, tiles: pixels(16, 16) },
  },
})}\n`);
console.log(`wrote ${output}`);
