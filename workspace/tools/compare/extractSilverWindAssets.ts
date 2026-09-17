/** Reproducible source extraction for MOVE_SILVER_WIND's Sparkle6 resource. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(import.meta.dirname, "../..");
const reference = join(root, "reference/pokeemerald");
const outAt = process.argv.indexOf("--out");
const out = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "src/animation/assets/silver-wind.json");
const source = (path: string): string => readFileSync(join(reference, path), "utf8");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

const scripts = source("data/battle_anim_scripts.s");
const start = scripts.indexOf("Move_SILVER_WIND:\n");
const end = scripts.indexOf("Move_SNATCH:\n", start);
if (start < 0 || end < 0) throw new Error("MOVE_SILVER_WIND source root missing");
const body = scripts.slice(start, end);
for (const token of [
  "loadspritegfx ANIM_TAG_SPARKLE_6", "fadetobg BG_BUG_OPPONENT",
  "fadetobg BG_BUG_PLAYER", "createsprite gSilverWindBigSparkSpriteTemplate",
  "createsprite gSilverWindMediumSparkSpriteTemplate",
  "createsprite gSilverWindSmallSparkSpriteTemplate",
]) if (!body.includes(token)) throw new Error(`MOVE_SILVER_WIND source drifted: ${token}`);

const registry = source("src/data/battle_anim.h");
for (const token of [
  "{gBattleAnimSpriteGfx_Sparkle6, 0x0080, ANIM_TAG_SPARKLE_6}",
  "{gBattleAnimSpritePal_Sparkle6, ANIM_TAG_SPARKLE_6}",
]) if (!registry.includes(token)) throw new Error(`Sparkle6 registry drifted: ${token}`);

const path = "graphics/battle_anims/sprites/sparkle_6.png";
const imagePath = join(reference, path);
const image = decodeIndexedPng(imagePath);
const tiles = sliceTiles(image);
if (tiles.tiles.length !== 8 || tiles.columns !== 2 || tiles.rows !== 4) {
  throw new Error("Sparkle6 source PNG shape drifted");
}
const result = {
  schema: "silver-wind-source-assets/v1",
  source: { move: "data/battle_anim_scripts.s Move_SILVER_WIND", moveSha256: sha256(body) },
  resources: {
    sparkle6: {
      tag: "ANIM_TAG_SPARKLE_6", tagValue: 10271, tileBytes: 0x80,
      source: path, sourceSha256: sha256(readFileSync(imagePath)),
      // The source registry deliberately uploads 0x80 bytes: the first 16x16
      // frame of the 16x32 PNG. All three templates use the dummy anim table.
      tileset: { columns: 2, rows: 2,
        tiles: tiles.tiles.slice(0, 4).map((tile) => [...tile.pixels]) },
      palette: image.palette,
    },
    bugBackground: {
      sourceIdentity: "BG_BUG_{OPPONENT,PLAYER} reuses Highspeed image with Bug palette and side tilemaps",
      extractedResource: "src/assets/gen/battle-anim-extreme-speed.json",
      palette: loadJascPal(join(reference, "graphics/battle_anims/backgrounds/bug.pal")),
    },
  },
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(result)}\n`);
console.log(`wrote ${out}`);
