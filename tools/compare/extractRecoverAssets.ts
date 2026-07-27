// Dev-time extractor for MOVE_RECOVER's two source-declared sprite tags.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = join(root, "reference", "pokeemerald", "graphics", "battle_anims", "sprites");
const output = join(root, "src", "animation", "assets");
mkdirSync(output, { recursive: true });

function decoded(name: string) {
  const image = decodeIndexedPng(join(source, name));
  const tiles = sliceTiles(image);
  return {
    tileset: {
      columns: tiles.columns,
      rows: tiles.rows,
      tiles: tiles.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  };
}

writeFileSync(join(output, "recover.json"), `${JSON.stringify({
  source: {
    orbs: "graphics/battle_anims/sprites/orbs.png; gPowerAbsorptionOrbSpriteTemplate; ANIM_TAG_ORBS",
    blueStar: "graphics/battle_anims/sprites/blue_star.png; gHealingBlueStarSpriteTemplate; ANIM_TAG_BLUE_STAR",
  },
  orbs: decoded("orbs.png"),
  blueStar: decoded("blue_star.png"),
})}\n`);
