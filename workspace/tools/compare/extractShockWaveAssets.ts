/** Reproducible source extraction for MOVE_SHOCK_WAVE's four OBJ resources. */
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
  : join(root, "src/animation/assets/shock-wave.json");
const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const source = (path: string): string => readFileSync(join(reference, path), "utf8");
const requireTokens = (label: string, text: string, tokens: readonly string[]): void => {
  for (const token of tokens) if (!text.includes(token)) throw new Error(`${label} drifted: ${token}`);
};
const sprite = (path: string, palettePath?: string) => {
  const imagePath = join(reference, path);
  const image = decodeIndexedPng(imagePath);
  const tiles = sliceTiles(image);
  return {
    source: path,
    sourceSha256: sha256(readFileSync(imagePath)),
    tileset: { columns: tiles.columns, rows: tiles.rows,
      tiles: tiles.tiles.map((tile) => [...tile.pixels]) },
    palette: palettePath
      ? palettePath.endsWith(".pal")
        ? loadJascPal(join(reference, palettePath))
        : decodeIndexedPng(join(reference, palettePath)).palette
      : image.palette,
  };
};

const scripts = source("data/battle_anim_scripts.s");
const electric = source("src/battle_anim_electric.c");
const graphics = source("src/graphics.c");
const registry = source("src/data/battle_anim.h");
const start = scripts.indexOf("Move_SHOCK_WAVE:\n");
const end = scripts.indexOf("Move_HARDEN:\n", start);
if (start < 0 || end < 0) throw new Error("MOVE_SHOCK_WAVE source root missing");
const body = scripts.slice(start, end);
requireTokens("MOVE_SHOCK_WAVE", body, [
  "loadspritegfx ANIM_TAG_CIRCLE_OF_LIGHT",
  "loadspritegfx ANIM_TAG_ELECTRIC_ORBS",
  "loadspritegfx ANIM_TAG_SPARK",
  "loadspritegfx ANIM_TAG_LIGHTNING",
]);
requireTokens("Shock Wave templates", electric, [
  "gElectricChargingParticlesSpriteTemplate",
  "gGrowingShockWaveOrbSpriteTemplate",
  "gShockWaveProgressingBoltSpriteTemplate",
  "gLightningSpriteTemplate",
]);
requireTokens("Shock Wave resources", `${graphics}\n${registry}`, [
  "gBattleAnimSpriteGfx_ElectricOrbs",
  "gBattleAnimSpriteGfx_CircleOfLight",
  "gBattleAnimSpriteGfx_Spark",
  "gBattleAnimSpriteGfx_Lightning",
  "gBattleAnimSpritePal_ElectricOrbs",
  "gBattleAnimSpritePal_Spark",
  "gBattleAnimSpritePal_Lightning2",
]);

const spark0 = sprite("graphics/battle_anims/sprites/spark_0.png",
  "graphics/battle_anims/sprites/spark.pal");
const spark1 = sprite("graphics/battle_anims/sprites/spark_1.png",
  "graphics/battle_anims/sprites/spark.pal");
const spark = {
  source: "graphics/battle_anims/sprites/spark.4bpp = spark_0.png + spark_1.png",
  sourceSha256: sha256(readFileSync(join(reference, "graphics/battle_anims/sprites/spark.4bpp"))),
  tileset: { columns: 1, rows: 24,
    tiles: [...spark0.tileset.tiles, ...spark1.tileset.tiles] },
  palette: spark0.palette,
};
if (spark.tileset.tiles.length * 32 !== 0x300) throw new Error("ANIM_TAG_SPARK tile span drifted");

const result = {
  schema: "shock-wave-source-assets/v1",
  source: {
    move: "data/battle_anim_scripts.s Move_SHOCK_WAVE",
    moveSha256: sha256(body),
    templates: "src/battle_anim_electric.c",
  },
  resources: {
    circleOfLight: { tag: "ANIM_TAG_CIRCLE_OF_LIGHT", tagValue: 10212, tileBytes: 0x800 },
    electricOrbs: { tag: "ANIM_TAG_ELECTRIC_ORBS", tagValue: 10211, tileBytes: 0x80 },
    spark: { tag: "ANIM_TAG_SPARK", tagValue: 10001, tileBytes: 0x300 },
    lightning: { tag: "ANIM_TAG_LIGHTNING", tagValue: 10037, tileBytes: 0xa00 },
  },
  art: {
    circleOfLight: sprite("graphics/battle_anims/sprites/circle_of_light.png"),
    electricOrbs: sprite("graphics/battle_anims/sprites/electric_orbs.png"),
    spark,
    lightning: sprite("graphics/battle_anims/sprites/lightning.png",
      "graphics/battle_anims/sprites/lightning_2.png"),
  },
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
console.log(`wrote ${out}`);
