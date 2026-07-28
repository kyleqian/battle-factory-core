// Reproducible source extraction for the literal presentation assets loaded
// by MOVE_REFLECT. The blue wall intentionally reuses GreenLightWall's tile
// sheet and changes only its palette tag (battle_anim.h:1179,1472).
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
  : join(root, "src/animation/assets/reflect.json");

function sprite(path: string, palettePath?: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: palettePath ? loadJascPal(join(ref, palettePath)) : image.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    script: "data/battle_anim_scripts.s:5066-5080 Move_REFLECT",
    blueLightWall:
      "graphics/battle_anims/sprites/green_light_wall.png + blue_light_wall.pal; src/graphics.c:552,555; ANIM_TAG_BLUE_LIGHT_WALL; gReflectWallSpriteTemplate",
    sparkle4:
      "graphics/battle_anims/sprites/sparkle_4.png + sparkle_3.png palette; src/graphics.c:232,234; ANIM_TAG_SPARKLE_4; gReflectSparkleSpriteTemplate",
  },
  blueLightWall: sprite(
    "graphics/battle_anims/sprites/green_light_wall.png",
    "graphics/battle_anims/sprites/blue_light_wall.pal",
  ),
  // SPARKLE_4's graphics and palette use separate PNG sources: the palette
  // comes from gBattleAnimSpritePal_Sparkle3 (graphics.c:232).
  sparkle4: {
    ...sprite("graphics/battle_anims/sprites/sparkle_4.png"),
    palette: decodeIndexedPng(join(ref, "graphics/battle_anims/sprites/sparkle_3.png")).palette,
  },
  templates: {
    reflectWall: {
      source: "src/battle_anim_psychic.c:64-75",
      oam: "gOamData_AffineOff_ObjBlend_64x64",
      callback: "AnimDefensiveWall",
      subpriority: 1,
      args: ["x=40", "y=0", "ANIM_TAG_BLUE_LIGHT_WALL"],
    },
    reflectSparkle: {
      source: "src/battle_anim_psychic.c:110-135,581-615",
      oam: "gOamData_AffineOff_ObjNormal_32x32",
      frames: [0, 16, 32, 48, 64],
      frameDuration: 3,
      callback: "AnimWallSparkle",
      subpriority: 2,
    },
  },
})}\n`);
console.log(`wrote ${out}`);
