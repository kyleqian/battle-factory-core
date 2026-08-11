// Reproducible source extraction for MOVE_METAL_SOUND's own wave sprite.
// Battler art and battle chrome remain the generated source assets already
// used by the Scene-ON compositor.
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
  : join(root, "src/animation/assets/metal-sound.json");

const source = decodeIndexedPng(
  join(ref, "graphics/battle_anims/sprites/metal_sound_waves.png"),
);
const sliced = sliceTiles(source);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    waves:
      "graphics/battle_anims/sprites/metal_sound_waves.png; "
      + "gMetalSoundSpriteTemplate; ANIM_TAG_METAL_SOUND_WAVES",
  },
  waves: {
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: source.palette,
  },
})}\n`);
console.log(`wrote ${out}`);
