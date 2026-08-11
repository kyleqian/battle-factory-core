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
  : join(root, "src/animation/assets/perish-song.json");

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
    carrier:
      "FRONTIER_MON_MURKROW_2 set 289; SPECIES_MURKROW 198; MOVE_PERISH_SONG 195; challenge 2",
    murkrowBack:
      "graphics/pokemon/murkrow/back.png + graphics/pokemon/murkrow/normal.pal",
    murkrowFront:
      "graphics/pokemon/murkrow/anim_front.png frame 0 + graphics/pokemon/murkrow/normal.pal",
    musicNotes2:
      "graphics/battle_anims/sprites/music_notes_2.png; ANIM_TAG_MUSIC_NOTES_2; gPerishSongMusicNoteSpriteTemplate",
  },
  murkrowBack: sprite(
    "graphics/pokemon/murkrow/back.png",
    "graphics/pokemon/murkrow/normal.pal",
  ),
  murkrowFront: sprite(
    "graphics/pokemon/murkrow/anim_front.png",
    "graphics/pokemon/murkrow/normal.pal",
  ),
  musicNotes2: sprite("graphics/battle_anims/sprites/music_notes_2.png"),
})}\n`);
console.log(`wrote ${out}`);
