// Reproducible source extraction for MOVE_SCARY_FACE's real challenge-0
// Factory set-133 RHYHORN carrier, side-selected BG1, and loaded eye tags.
// SHUCKLE is intentionally reused from the exact SELF_DESTRUCT compositor.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { parseTilemap } from "../extract/tilemap.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/scary-face.json");

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

const background = sprite("graphics/battle_anims/backgrounds/scary_face.png");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    rhyhornBack:
      "graphics/pokemon/rhyhorn/back.png; FRONTIER_MON_RHYHORN_1 set 133; SPECIES_RHYHORN 111",
    rhyhornFront:
      "graphics/pokemon/rhyhorn/anim_front.png frame 0; FRONTIER_MON_RHYHORN_1 set 133; SPECIES_RHYHORN 111",
    target:
      "reuse src/animation/assets/selfDestruct.json SHUCKLE back/front",
    background:
      "graphics/battle_anims/backgrounds/scary_face.png + scary_face_{player,opponent}.bin; gBattleAnimBg{Image,Palette,Tilemap}_ScaryFace*",
    eyeSparkle:
      "graphics/battle_anims/sprites/eye_sparkle.png; ANIM_TAG_EYE_SPARKLE; gEyeSparkleSpriteTemplate",
    smallRedEye:
      "graphics/battle_anims/sprites/small_red_eye.png; ANIM_TAG_SMALL_RED_EYE; gGlareEyeDotSpriteTemplate",
  },
  rhyhornBack: sprite(
    "graphics/pokemon/rhyhorn/back.png",
    "graphics/pokemon/rhyhorn/normal.pal",
  ),
  rhyhornFront: sprite(
    "graphics/pokemon/rhyhorn/anim_front.png",
    "graphics/pokemon/rhyhorn/normal.pal",
  ),
  background: {
    ...background,
    playerTilemap: parseTilemap(readFileSync(
      join(ref, "graphics/battle_anims/backgrounds/scary_face_player.bin"),
    ), 32, 32),
    opponentTilemap: parseTilemap(readFileSync(
      join(ref, "graphics/battle_anims/backgrounds/scary_face_opponent.bin"),
    ), 32, 32),
  },
  eyeSparkle: sprite("graphics/battle_anims/sprites/eye_sparkle.png"),
  smallRedEye: sprite("graphics/battle_anims/sprites/small_red_eye.png"),
})}\n`);
console.log(`wrote ${out}`);
