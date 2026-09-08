// Reproducible source extraction for MOVE_UPROAR's two sprite resources.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/uproar.json");

function sprite(path: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: { columns: sliced.columns, rows: sliced.rows, tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    thinRing: "graphics/battle_anims/sprites/thin_ring.png; gUproarRingSpriteTemplate; ANIM_TAG_THIN_RING",
    jaggedMusicNote: "graphics/battle_anims/sprites/jagged_music_note.png; gJaggedMusicNoteSpriteTemplate; ANIM_TAG_JAGGED_MUSIC_NOTE",
  },
  thinRing: sprite("graphics/battle_anims/sprites/thin_ring.png"),
  jaggedMusicNote: sprite("graphics/battle_anims/sprites/jagged_music_note.png"),
})}\n`);
console.log(`wrote ${out}`);
