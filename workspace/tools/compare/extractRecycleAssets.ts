// Reproducible source extraction for MOVE_RECYCLE's exclusive arrow tag.
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
  : join(root, "src/animation/assets/recycle.json");
const sourcePath = join(
  root,
  "reference/pokeemerald/graphics/battle_anims/sprites/recycle.png",
);
const sourceBytes = readFileSync(sourcePath);
const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
if (sourceSha256 !== "0b6b8150d35197eea9fa20efbc6021309b473950b3b94e4cafe05910d9a8f8ce") {
  throw new Error("Recycle source PNG changed");
}
const image = decodeIndexedPng(sourcePath);
const sliced = sliceTiles(image);
if (image.width !== 64 || image.height !== 64
  || sliced.columns !== 8 || sliced.rows !== 8 || sliced.tiles.length !== 64) {
  throw new Error("Recycle source asset geometry changed");
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: {
    art: "graphics/battle_anims/sprites/recycle.png",
    pngSha256: sourceSha256,
    graphics: "gBattleAnimSpriteGfx_Recycle; ANIM_TAG_RECYCLE; 0x0800 bytes",
    palette: "gBattleAnimSpritePal_Recycle; ANIM_TAG_RECYCLE",
    template: "gRecycleSpriteTemplate; gOamData_AffineNormal_ObjBlend_64x64",
  },
  arrow: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
})}\n`);
console.log(`wrote ${output}`);
