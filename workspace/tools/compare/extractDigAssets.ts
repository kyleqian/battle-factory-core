/** Deterministic extraction for the only Dig-specific raster asset: DIRT_MOUND. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outAt = process.argv.indexOf("--out");
const out = outAt >= 0 && process.argv[outAt + 1]
  ? resolve(process.argv[outAt + 1]!)
  : join(root, "src/animation/assets/dig-dirt-mound.json");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");

const scripts = readFileSync(join(ref, "data/battle_anim_scripts.s"), "utf8");
const start = scripts.indexOf("Move_DIG:\n");
const end = scripts.indexOf("Move_MEDITATE:\n", start);
if (start < 0 || end < 0) throw new Error("Move_DIG source body missing");
const body = scripts.slice(start, end);
for (const token of [
  "loadspritegfx ANIM_TAG_DIRT_MOUND",
  "createsprite gDirtMoundSpriteTemplate",
  "choosetwoturnanim DigSetUp, DigUnleash",
]) if (!body.includes(token)) throw new Error(`Move_DIG lacks ${token}`);

const ground = readFileSync(join(ref, "src/battle_anim_ground.c"), "utf8");
const registry = readFileSync(join(ref, "src/data/battle_anim.h"), "utf8");
const graphics = readFileSync(join(ref, "src/graphics.c"), "utf8");
for (const token of [
  "const struct SpriteTemplate gDirtMoundSpriteTemplate",
  ".tileTag = ANIM_TAG_DIRT_MOUND",
  ".paletteTag = ANIM_TAG_DIRT_MOUND",
  ".oam = &gOamData_AffineOff_ObjNormal_32x16",
  ".callback = AnimDigDirtMound",
]) if (!ground.includes(token)) throw new Error(`Dirt Mound template lacks ${token}`);
for (const token of [
  "{gBattleAnimSpriteGfx_DirtMound, 0x0200, ANIM_TAG_DIRT_MOUND}",
  "{gBattleAnimSpritePal_DirtMound, ANIM_TAG_DIRT_MOUND}",
]) if (!registry.includes(token)) throw new Error(`Dirt Mound resource table lacks ${token}`);
for (const token of [
  'gBattleAnimSpriteGfx_DirtMound[] = INCGFX_U32("graphics/battle_anims/sprites/dirt_mound.png", ".4bpp.lz")',
  'gBattleAnimSpritePal_DirtMound[] = INCGFX_U32("graphics/battle_anims/sprites/dirt_mound.png", ".gbapal.lz")',
]) if (!graphics.includes(token)) throw new Error(`Dirt Mound graphics source lacks ${token}`);

const image = decodeIndexedPng(join(ref, "graphics/battle_anims/sprites/dirt_mound.png"));
const tiles = sliceTiles(image);
if (image.width !== 32 || image.height !== 32 || tiles.columns !== 4 || tiles.rows !== 4 || tiles.tiles.length !== 16) {
  throw new Error("ANIM_TAG_DIRT_MOUND source geometry drifted");
}

const existingMudSand = readFileSync(join(root, "src/assets/gen/battle-anim-mud-sand.json"));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  schema: "dig-dirt-mound-asset/v1",
  source: {
    script: "data/battle_anim_scripts.s Move_DIG / DigSetUp + DigUnleash",
    scriptSha256: sha(body),
    dirtMound: "graphics/battle_anims/sprites/dirt_mound.png; gBattleAnimSpriteGfx_DirtMound/gBattleAnimSpritePal_DirtMound; ANIM_TAG_DIRT_MOUND; gDirtMoundSpriteTemplate",
    reusedMudSand: "source-identical src/assets/gen/battle-anim-mud-sand.json; ANIM_TAG_MUD_SAND; gDirtPlumeSpriteTemplate; intentionally not copied",
    reusedImpact: "graphics/battle_anims/sprites/impact.png; ANIM_TAG_IMPACT; gBasicHitSplatSpriteTemplate animation 2; intentionally not copied",
  },
  dirtMound: {
    tag: 10281,
    tileBytes: 512,
    dimensions: { width: image.width, height: image.height },
    tileset: { columns: tiles.columns, rows: tiles.rows, tiles: tiles.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
    template: { oam: "gOamData_AffineOff_ObjNormal_32x16", callback: "AnimDigDirtMound", halves: [0, 1] },
  },
  reusedMudSand: { path: "src/assets/gen/battle-anim-mud-sand.json", sha256: sha(existingMudSand) },
})}\n`);
console.log(`wrote ${out}`);
