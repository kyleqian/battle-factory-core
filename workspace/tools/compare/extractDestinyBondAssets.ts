/** Reproducible source extraction for MOVE_DESTINY_BOND presentation assets. */
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
  : join(root, "src/animation/assets/destiny-bond.json");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

const scriptsPath = join(root, "reference/pokeemerald/data/battle_anim_scripts.s");
const scripts = readFileSync(scriptsPath, "utf8");
const start = scripts.indexOf("Move_DESTINY_BOND:\n");
const end = scripts.indexOf("\nMove_MEMENTO:", start);
if (start < 0 || end < 0) throw new Error("Move_DESTINY_BOND source body missing");
const body = scripts.slice(start, end);
for (const token of [
  "loadspritegfx ANIM_TAG_WHITE_SHADOW",
  "fadetobg BG_GHOST",
  "AnimTask_DestinyBondWhiteShadow",
  "AnimTask_ShakeMonInPlace",
  "AnimTask_BlendBattleAnimPalExclude",
  "restorebg",
]) {
  if (!body.includes(token)) throw new Error(`Move_DESTINY_BOND lacks ${token}`);
}

const whiteShadowPath = join(root, "reference/pokeemerald/graphics/battle_anims/sprites/white_shadow.png");
const whiteShadow = decodeIndexedPng(whiteShadowPath);
const tiles = sliceTiles(whiteShadow);
const ghostPath = join(root, "src/assets/gen/battle-anim-ghost-bg.json");
const ghostBytes = readFileSync(ghostPath);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    script: "data/battle_anim_scripts.s:3176 Move_DESTINY_BOND",
    scriptSha256: sha256(body),
    whiteShadow: "graphics/battle_anims/sprites/white_shadow.png; gDestinyBondWhiteShadowSpriteTemplate; ANIM_TAG_WHITE_SHADOW",
    ghostBackground: "src/assets/gen/battle-anim-ghost-bg.json; source-extracted BG_GHOST",
  },
  whiteShadow: {
    tag: 10188,
    tileBytes: 1024,
    dimensions: { width: whiteShadow.width, height: whiteShadow.height },
    tileset: {
      columns: tiles.columns,
      rows: tiles.rows,
      tiles: tiles.tiles.map((tile) => [...tile.pixels]),
    },
    palette: whiteShadow.palette,
  },
  ghostBackground: {
    path: "src/assets/gen/battle-anim-ghost-bg.json",
    sha256: sha256(ghostBytes),
  },
})}\n`);
console.log(`wrote ${out}`);
