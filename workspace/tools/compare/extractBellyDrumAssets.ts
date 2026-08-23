// Reproducible source extraction for MOVE_BELLY_DRUM's two loaded OBJ tags.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { expand5to8 } from "../extract/gbaColor.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/belly-drum.json");

function sprite(path: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  };
}

function rgb(r: number, g: number, b: number) {
  return { r: expand5to8(r), g: expand5to8(g), b: expand5to8(b) };
}

const musicNotes = sprite("graphics/battle_anims/sprites/music_notes.png");
const rainbowColors = [
  [rgb(31, 31, 31), rgb(31, 26, 28), rgb(31, 22, 26), rgb(31, 17, 24), rgb(31, 13, 22)],
  [rgb(31, 31, 31), rgb(25, 31, 26), rgb(20, 31, 21), rgb(15, 31, 16), rgb(10, 31, 12)],
  [rgb(31, 31, 31), rgb(31, 31, 24), rgb(31, 31, 17), rgb(31, 31, 10), rgb(31, 31, 3)],
  [rgb(31, 31, 31), rgb(26, 28, 31), rgb(21, 26, 31), rgb(16, 24, 31), rgb(12, 22, 31)],
] as const;
const rainbowPalettes = rainbowColors.map((colors) => {
  const palette = musicNotes.palette.map((color) => ({ ...color }));
  for (let index = 0; index < colors.length; index += 1) {
    palette[index + 1] = colors[index]!;
  }
  return palette;
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    musicNotes: "graphics/battle_anims/sprites/music_notes.png; ANIM_TAG_MUSIC_NOTES",
    rainbowPalettes: "gParticlesColorBlendTable[0..3], battle_anim_effects_1.c",
    purpleHandOutline:
      "graphics/battle_anims/sprites/purple_hand_outline.png; ANIM_TAG_PURPLE_HAND_OUTLINE",
  },
  musicNotes: {
    tileset: musicNotes.tileset,
    palettes: rainbowPalettes,
  },
  purpleHandOutline: sprite("graphics/battle_anims/sprites/purple_hand_outline.png"),
})}\n`);
console.log(`wrote ${out}`);
