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
  : join(root, "src/animation/assets/heal-bell.json");

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

const musicNotePalette = loadJascPal(join(
  ref,
  "graphics/battle_anims/sprites/music_notes_2.pal",
));
if (musicNotePalette.length !== 80) {
  throw new Error(`expected five MUSIC_NOTES_2 palette rows, got ${musicNotePalette.length}`);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    carrier:
      "FRONTIER_MON_CHIMECHO_2 set 314; SPECIES_CHIMECHO 411; MOVE_HEAL_BELL 215; challenge 2",
    bell:
      "graphics/battle_anims/sprites/bell.png; gBellSpriteTemplate; ANIM_TAG_BELL",
    musicNotes2:
      "graphics/battle_anims/sprites/music_notes_2.png + music_notes_2.pal; gHealBellMusicNoteSpriteTemplate; ANIM_TAG_MUSIC_NOTES_2",
    thinRing:
      "graphics/battle_anims/sprites/thin_ring.png; gThinRingExpandingSpriteTemplate/gBlendThinRingExpandingSpriteTemplate; ANIM_TAG_THIN_RING",
    sparkle2:
      "graphics/battle_anims/sprites/sparkle_1.png + sparkle_2.pal; gSparklingStarsSpriteTemplate; ANIM_TAG_SPARKLE_2",
    chimechoBack:
      "graphics/pokemon/chimecho/back.png + normal.pal; FRONTIER_MON_CHIMECHO_2",
    chimechoFront:
      "graphics/pokemon/chimecho/anim_front.png frame 0 + normal.pal; FRONTIER_MON_CHIMECHO_2",
  },
  bell: sprite("graphics/battle_anims/sprites/bell.png"),
  musicNotes2: {
    ...sprite("graphics/battle_anims/sprites/music_notes_2.png"),
    palettes: [0, 1, 2, 3, 4].map((index) =>
      musicNotePalette.slice(index * 16, index * 16 + 16)),
  },
  thinRing: sprite("graphics/battle_anims/sprites/thin_ring.png"),
  sparkle2: sprite(
    "graphics/battle_anims/sprites/sparkle_1.png",
    "graphics/battle_anims/sprites/sparkle_2.pal",
  ),
  chimechoBack: sprite(
    "graphics/pokemon/chimecho/back.png",
    "graphics/pokemon/chimecho/normal.pal",
  ),
  chimechoFront: sprite(
    "graphics/pokemon/chimecho/anim_front.png",
    "graphics/pokemon/chimecho/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
