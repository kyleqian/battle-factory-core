/** Reproducible source extraction for MOVE_CURSE's two OBJ resources and BG mask. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";
import { parseTilemap } from "../extract/tilemap.ts";

const root = resolve(import.meta.dirname, "../..");
const reference = join(root, "reference/pokeemerald");
const at = process.argv.indexOf("--out");
const output = at >= 0 && process.argv[at + 1]
  ? resolve(process.argv[at + 1]!) : resolve(root, "src/animation/assets/curse.json");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const sprite = (path: string) => { const absolute = join(reference, path);
  const image = decodeIndexedPng(absolute); const tiles = sliceTiles(image);
  return { path, sha256: sha(readFileSync(absolute)), dimensions: { width: image.width, height: image.height },
    tileset: { columns: tiles.columns, rows: tiles.rows,
      tiles: tiles.tiles.map((tile) => [...tile.pixels]) }, palette: image.palette }; };

const scripts = readFileSync(join(reference, "data/battle_anim_scripts.s"), "utf8");
const start = scripts.indexOf("Move_CURSE:\n");
const end = scripts.indexOf("Move_SOFT_BOILED:\n", start);
if (start < 0 || end < 0) throw new Error("MOVE_CURSE source body missing");
const body = scripts.slice(start, end);
for (const token of ["loadspritegfx ANIM_TAG_NAIL", "loadspritegfx ANIM_TAG_GHOSTLY_SPIRIT",
  "gCurseNailSpriteTemplate", "gCurseGhostSpriteTemplate",
  "AnimTask_DrawFallingWhiteLinesOnAttacker"]) {
  if (!body.includes(token)) throw new Error(`MOVE_CURSE source drifted: ${token}`);
}
const maskPath = join(reference, "graphics/battle_anims/masks/curse.bin");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  schema: "curse-source-assets/v1",
  source: { script: "data/battle_anim_scripts.s Move_CURSE through Move_SOFT_BOILED",
    scriptSha256: sha(body) },
  nail: { tag: 10199, tileBytes: 0x400, template: "gCurseNailSpriteTemplate",
    shape: "32x16", objMode: "blend", ...sprite("graphics/battle_anims/sprites/nail.png") },
  ghost: { tag: 10200, tileBytes: 0x200, template: "gCurseGhostSpriteTemplate",
    shape: "32x32", objMode: "blend", ...sprite("graphics/battle_anims/sprites/ghostly_spirit.png") },
  fallingLines: { ...sprite("graphics/battle_anims/masks/curse.png"),
    tilemapPath: "graphics/battle_anims/masks/curse.bin", tilemapSha256: sha(readFileSync(maskPath)),
    tilemap: parseTilemap(readFileSync(maskPath), 32, 32), palette: [
      { r: 0, g: 0, b: 0, a: 0 }, { r: 255, g: 255, b: 255, a: 255 },
    ] },
}, null, 2)}\n`);
console.log(`wrote ${output}`);
