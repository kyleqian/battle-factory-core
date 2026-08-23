// Reproducible source extraction for MOVE_TEETER_DANCE's loaded note/duck
// resources and its lowest legal Level-50 carrier, SPINDA set 145.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/teeter-dance.json");

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
    carrier: "FRONTIER_MON_SPINDA set 145; SPECIES_SPINDA 308; MOVE_TEETER_DANCE 298",
    musicNotes:
      "graphics/battle_anims/sprites/music_notes.png; ANIM_TAG_MUSIC_NOTES; gFastFlyingMusicNotesSpriteTemplate",
    duck:
      "graphics/battle_anims/sprites/duck.png; ANIM_TAG_DUCK; gDizzyPunchDuckSpriteTemplate (loaded, not created by Move_TEETER_DANCE)",
    spindaBack: "graphics/pokemon/spinda/back.png; FRONTIER_MON_SPINDA set 145",
    spindaFront: "graphics/pokemon/spinda/anim_front.png frame 0; FRONTIER_MON_SPINDA set 145",
  },
  musicNotes: sprite("graphics/battle_anims/sprites/music_notes.png"),
  duck: sprite("graphics/battle_anims/sprites/duck.png"),
  spindaBack: sprite("graphics/pokemon/spinda/back.png", "graphics/pokemon/spinda/normal.pal"),
  spindaFront: sprite("graphics/pokemon/spinda/anim_front.png", "graphics/pokemon/spinda/normal.pal"),
})}\n`);
console.log(`wrote ${out}`);
