/** Dev-time extraction of the complete shared MUD_SAND sheet used by Sand Tomb. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadJascPal } from "../extract/jascPal.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outIndex = process.argv.indexOf("--out");
const output = outIndex >= 0 && process.argv[outIndex + 1]
  ? resolve(process.argv[outIndex + 1]!)
  : resolve(root, "src/animation/assets/sand-tomb-mud-sand.json");
const gfxPath = resolve(root, "reference/pokeemerald/graphics/battle_anims/sprites/mud_sand.4bpp");
const palPath = resolve(root, "reference/pokeemerald/graphics/battle_anims/sprites/mud_sand.pal");
const gfx = readFileSync(gfxPath);
const palette = loadJascPal(palPath);
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

if (gfx.length !== 0xa0 || palette.length !== 16
  || hash(gfx) !== "f343ee129eaf60f24352029ea3a6cad513368841b25b0ce4e14442a1bd5da099"
  || hash(readFileSync(palPath)) !== "b0d8265b3a364158880b483ad893234f058c5f75d6414f1e52d85ce6b97af24b") {
  throw new Error("MUD_SAND source asset drifted");
}

const tiles = Array.from({ length: 5 }, (_, tile) => {
  const pixels: number[] = [];
  for (let offset = tile * 32; offset < tile * 32 + 32; offset += 1) {
    pixels.push(gfx[offset]! & 0xf, gfx[offset]! >>> 4);
  }
  return pixels;
});
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  source: {
    graphics: "graphics/battle_anims/sprites/mud_sand.4bpp",
    palette: "graphics/battle_anims/sprites/mud_sand.pal",
    tag: { name: "ANIM_TAG_MUD_SAND", value: 10074 },
    symbols: ["gBattleAnimSpriteGfx_MudSand", "gBattleAnimSpritePal_MudSand"],
    note: "The sheet is shared; Sand Tomb has no exclusive art and gSwirlingDirtSpriteTemplate selects tile 0.",
  },
  hashes: { graphicsSha256: hash(gfx), paletteSourceSha256: hash(readFileSync(palPath)) },
  dimensions: { widthPixels: 40, heightPixels: 8, bitDepth: 4, bytes: gfx.length },
  tileset: { columns: 5, rows: 1, tiles }, palette,
  sandTombCell: { tileOffset: 0, dimensions: { widthPixels: 8, heightPixels: 8 }, pixels: tiles[0] },
})}\n`);
console.log(`wrote ${output}`);
