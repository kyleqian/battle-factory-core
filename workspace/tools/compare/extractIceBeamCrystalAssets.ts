/** Reproduce the source-composed ANIM_TAG_ICE_CRYSTALS sheet used by Ice Beam. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outFlag = process.argv.indexOf("--out");
const output = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/assets/gen/battle-anim-ice-crystals.json");
const sha256 = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const sourceDir = join(root, "reference/pokeemerald/graphics/battle_anims/sprites");

const expectedPngHashes = [
  "79adc6a4936a0f9c47a50982975dd4e3ef3f27d035469cdce2f9dc5673814d53",
  "76f726ab0fff23fcf65f4abba01a508d7c89bab02495e89c1ef60f704ff6df9b",
  "350558e14c29c0c4d34fe147b3287ce8794b797ef14df69268445e0d3160436f",
  "38212e761a6a6c267982c0643859a8c1c767494a258f6afcc95e24871fe2df2c",
  "64ca6ffd7a09fdd55878cf9488c4e62e5b339e7787881389060f30ce20b26f96",
] as const;

const parts = expectedPngHashes.map((expectedHash, part) => {
  const path = join(sourceDir, `ice_crystals_${part}.png`);
  if (sha256(readFileSync(path)) !== expectedHash) throw new Error(`ice_crystals_${part}.png changed`);
  return sliceTiles(decodeIndexedPng(path));
});
const palettePath = join(sourceDir, "ice_crystals.pal");
if (sha256(readFileSync(palettePath)) !== "5e36131edecc3e43eaed8b6acba844420518fefb414ae9943dc429f29797baf0") {
  throw new Error("ice_crystals.pal changed");
}
if (parts.map(({ columns, rows, tiles }) => [columns, rows, tiles.length]).join(";") !== "2,2,4;1,2,2;1,2,2;2,2,4;1,2,2"
  || parts.some(({ tiles }) => tiles.some(({ subpalette }) => subpalette !== 0))) {
  throw new Error("Ice crystal source geometry changed");
}

const tiles = parts.flatMap((part) => part.tiles.map((tile) => [...tile.pixels]));
if (tiles.length !== 14) throw new Error("compiled Ice Crystal sheet must contain 14 tiles / 0x01c0 bytes");
const asset = {
  source: "graphics/battle_anims/sprites/ice_crystals_{0..4}.png concatenated by graphics_file_rules.mk (src/graphics.c:484-485, ANIM_TAG_ICE_CRYSTALS)",
  tileset: { columns: 2, rows: 7, tiles },
  palette: loadJascPal(palettePath),
  frames: {
    large: { tile: 4, width: 8, height: 16 },
    small: { tile: 6, width: 8, height: 8 },
  },
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(asset)}\n`);
console.log(`wrote ${output}`);
