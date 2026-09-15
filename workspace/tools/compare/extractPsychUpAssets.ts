/** Reproducible source extraction for MOVE_PSYCH_UP's SPIRAL object. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outAt = process.argv.indexOf("--out");
const out = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "src/animation/assets/psych-up.json");
const source = (path: string): string =>
  readFileSync(join(root, "reference/pokeemerald", path), "utf8");
const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const scripts = source("data/battle_anim_scripts.s");
const start = scripts.indexOf("Move_PSYCH_UP:\n");
const end = scripts.indexOf("\nMove_DIZZY_PUNCH:", start);
if (start < 0 || end < 0) throw new Error("Move_PSYCH_UP source body missing");
const body = scripts.slice(start, end);
for (const token of [
  "loadspritegfx ANIM_TAG_SPIRAL", "monbg ANIM_ATK_PARTNER",
  "blend_color_cycleexclude", "setalpha 12, 8",
  "createsprite gPsychUpSpiralSpriteTemplate",
  "createvisualtask AnimTask_SwayMon", "createvisualtask AnimTask_ScaleMonAndRestore",
  "createvisualtask AnimTask_BlendBattleAnimPal", "clearmonbg ANIM_ATK_PARTNER",
  "blendoff", "end",
]) if (!body.includes(token)) throw new Error(`Psych Up source drifted: ${token}`);

const psychic = source("src/battle_anim_psychic.c");
for (const token of [
  "sAffineAnim_PsychUpSpiral", "AFFINEANIMCMD_FRAME(0xFFFE, 0xFFFE, -10, 120)",
  "gPsychUpSpiralSpriteTemplate", "gOamData_AffineNormal_ObjBlend_64x64",
  ".callback = AnimSpriteOnMonPos",
]) if (!psychic.includes(token)) throw new Error(`Psych Up spiral source drifted: ${token}`);

const registry = source("src/data/battle_anim.h");
for (const token of [
  "{gBattleAnimSpriteGfx_Spiral, 0x0800, ANIM_TAG_SPIRAL}",
  "{gBattleAnimSpritePal_Spiral, ANIM_TAG_SPIRAL}",
]) if (!registry.includes(token)) throw new Error(`Psych Up registry drifted: ${token}`);

const image = decodeIndexedPng(join(
  root, "reference/pokeemerald/graphics/battle_anims/sprites/spiral.png",
));
const tiles = sliceTiles(image);
const extracted = {
  schema: "psych-up-source-assets/v1",
  source: {
    script: "data/battle_anim_scripts.s Move_PSYCH_UP",
    scriptSha256: sha256(body),
    sprite: "src/battle_anim_psychic.c gPsychUpSpiralSpriteTemplate",
    graphics: "graphics/battle_anims/sprites/spiral.png",
    rom: { gameCode: "AGB-BPEE", symbol: "Move_PSYCH_UP", start: "0x082caaea", endExclusive: "0x082cab5c" },
  },
  resource: { tag: 10196, tileBytes: 0x0800 },
  template: {
    symbol: "gPsychUpSpiralSpriteTemplate", shape: "64x64", affine: "normal",
    objMode: "objblend", callback: "AnimSpriteOnMonPos",
    affineCommand: { scaleDeltaX: -2, scaleDeltaY: -2, rotationDelta: -10, duration: 120 },
  },
  art: {
    dimensions: { width: image.width, height: image.height },
    tileset: {
      columns: tiles.columns,
      rows: tiles.rows,
      tiles: tiles.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(extracted, null, 2)}\n`);
console.log(`wrote ${out}`);
