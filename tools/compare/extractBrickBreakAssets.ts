// Reproducible source extraction for Brick Break's independent TORN_METAL
// shard sheet. The remaining literal art is shared source-derived animation
// infrastructure: Reflect's blue wall, Absorb's IMPACT/Lombre, and Cross
// Chop's HANDS_AND_FEET.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/brick-break.json");

const image = decodeIndexedPng(
  join(ref, "graphics/battle_anims/sprites/torn_metal.png"),
);
const sliced = sliceTiles(image);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    tornMetal:
      "graphics/battle_anims/sprites/torn_metal.png; ANIM_TAG_TORN_METAL; four gBrickBreakWallShardSpriteTemplate cells",
    palette:
      "graphics/battle_anims/sprites/blue_light_wall.pal; gBattleAnimSpritePal_BlueLightWall registered for ANIM_TAG_TORN_METAL",
    reuse:
      "reflect.json blueLightWall; absorb.json Lombre/impact; cross-chop.json handsAndFeet; shared ONIX/field chrome",
  },
  tornMetal: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(
      join(ref, "graphics/battle_anims/sprites/blue_light_wall.pal"),
    ),
  },
})}\n`);
console.log(`wrote ${out}`);
