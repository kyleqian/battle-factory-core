/** Reproducible source extraction for MOVE_SIGNAL_BEAM's paired orb art. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const reference = join(root, "reference/pokeemerald");
const outAt = process.argv.indexOf("--out");
const out = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "src/animation/assets/signal-beam.json");
const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const source = (path: string): string => readFileSync(join(reference, path), "utf8");
const requireTokens = (label: string, text: string, tokens: readonly string[]): void => {
  for (const token of tokens) if (!text.includes(token)) throw new Error(`${label} drifted: ${token}`);
};

const scripts = source("data/battle_anim_scripts.s");
const water = source("src/battle_anim_water.c");
const graphics = source("src/graphics.c");
const registry = source("src/data/battle_anim.h");
const start = scripts.indexOf("Move_SIGNAL_BEAM:\n");
const end = scripts.indexOf("Move_ABSORB:\n", start);
if (start < 0 || end < 0) throw new Error("MOVE_SIGNAL_BEAM source root missing");
const body = scripts.slice(start, end);
requireTokens("MOVE_SIGNAL_BEAM", body, [
  "loadspritegfx ANIM_TAG_GLOWY_RED_ORB",
  "loadspritegfx ANIM_TAG_GLOWY_GREEN_ORB",
  "createsprite gSignalBeamRedOrbSpriteTemplate",
  "createsprite gSignalBeamGreenOrbSpriteTemplate",
]);
requireTokens("Signal Beam templates", water, [
  "const struct SpriteTemplate gSignalBeamRedOrbSpriteTemplate",
  "const struct SpriteTemplate gSignalBeamGreenOrbSpriteTemplate",
  ".oam = &gOamData_AffineOff_ObjNormal_8x8",
  ".callback = AnimToTargetInSinWave",
]);
requireTokens("Signal Beam resources", `${graphics}\n${registry}`, [
  "gBattleAnimSpriteGfx_GlowyRedOrb",
  "gBattleAnimSpritePal_GlowyRedOrb",
  "gBattleAnimSpritePal_GlowyGreenOrb",
  "{gBattleAnimSpriteGfx_GlowyRedOrb, 0x0020, ANIM_TAG_GLOWY_RED_ORB}",
  "{gBattleAnimSpriteGfx_GlowyRedOrb, 0x0020, ANIM_TAG_GLOWY_GREEN_ORB}",
]);

const imagePath = join(reference, "graphics/battle_anims/sprites/glowy_red_orb.png");
const greenPalettePath = join(reference, "graphics/battle_anims/sprites/glowy_green_orb.pal");
const image = decodeIndexedPng(imagePath);
const tiles = sliceTiles(image);
const result = {
  schema: "signal-beam-source-assets/v1",
  source: {
    move: "data/battle_anim_scripts.s Move_SIGNAL_BEAM + SignalBeamOrbs",
    moveSha256: sha256(body),
    templates: "src/battle_anim_water.c gSignalBeam{Red,Green}OrbSpriteTemplate",
    image: "graphics/battle_anims/sprites/glowy_red_orb.png",
    imageSha256: sha256(readFileSync(imagePath)),
    greenPalette: "graphics/battle_anims/sprites/glowy_green_orb.pal",
    greenPaletteSha256: sha256(readFileSync(greenPalettePath)),
  },
  resources: {
    red: { tag: "ANIM_TAG_GLOWY_RED_ORB", tagValue: 10264, tileBytes: 0x20 },
    green: { tag: "ANIM_TAG_GLOWY_GREEN_ORB", tagValue: 10265, tileBytes: 0x20 },
  },
  templates: {
    red: { symbol: "gSignalBeamRedOrbSpriteTemplate", shape: "8x8", affine: false, objMode: "objnormal", callback: "AnimToTargetInSinWave" },
    green: { symbol: "gSignalBeamGreenOrbSpriteTemplate", shape: "8x8", affine: false, objMode: "objnormal", callback: "AnimToTargetInSinWave" },
  },
  art: {
    tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) },
    redPalette: image.palette,
    greenPalette: loadJascPal(greenPalettePath),
  },
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
console.log(`wrote ${out}`);
