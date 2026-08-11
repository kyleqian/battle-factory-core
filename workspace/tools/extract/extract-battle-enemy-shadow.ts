/**
 * Dev-time extraction of the source enemy-mon shadow and the species whose
 * gEnemyMonElevation entry enables it. Runtime code consumes only the JSON.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const image = PNG.sync.read(readFileSync(
  "reference/pokeemerald/graphics/battle_interface/enemy_mon_shadow.png",
));
const elevationSource = readFileSync(
  "reference/pokeemerald/src/data/pokemon_graphics/enemy_mon_elevation.h",
  "utf8",
);

const mask: number[] = [];
for (let y = 0; y < image.height; y += 1) {
  for (let x = 0; x < image.width; x += 1) {
    const offset = (y * image.width + x) * 4;
    if (
      image.data[offset] !== 0
      || image.data[offset + 1] !== 0
      || image.data[offset + 2] !== 0
    ) mask.push(y * image.width + x);
  }
}

const sampleOffset = mask[0]! * 4;
const rgb5 = (channel: number): number => {
  const value = Math.round(channel * 31 / 255);
  return (value << 3) | (value >> 2);
};
const elevatedSpecies = Array.from(
  elevationSource.matchAll(/\[(SPECIES_[A-Z0-9_]+)\]\s*=\s*[1-9][0-9]*/g),
  (match) => match[1]!,
);

writeFileSync(
  "src/assets/gen/battle-enemy-shadow.json",
  `${JSON.stringify({
    source: {
      graphics: "graphics/battle_interface/enemy_mon_shadow.png",
      elevation: "src/data/pokemon_graphics/enemy_mon_elevation.h",
      placement:
        "LoadAndCreateEnemyShadowSprites: singles opponent center (176,40+29), 32x8",
    },
    width: image.width,
    height: image.height,
    mask,
    color: {
      r: rgb5(image.data[sampleOffset]!),
      g: rgb5(image.data[sampleOffset + 1]!),
      b: rgb5(image.data[sampleOffset + 2]!),
    },
    elevatedSpecies,
  })}\n`,
);
