// Reproducible source extraction for Move_SOLAR_BEAM's ORBS tag and its
// target-side Impact background variants.  This is dev-time only; production
// imports the generated JSON under src/animation/assets.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";
import { parseTilemap } from "../extract/tilemap.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const out = join(root, "src/animation/assets/solar-beam.json");

function indexed(path: string, palettePath?: string) {
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

const impact = indexed("graphics/battle_anims/backgrounds/impact.png", "graphics/battle_anims/backgrounds/solarbeam.pal");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    orbs: "graphics/battle_anims/sprites/orbs.png; ANIM_TAG_ORBS; gPowerAbsorptionOrbSpriteTemplate/gSolarBeamBigOrbSpriteTemplate/gSolarBeamSmallOrbSpriteTemplate",
    background: "graphics/battle_anims/backgrounds/impact.png + impact_{opponent,player}.bin; BG_SOLAR_BEAM_*; solarbeam.pal",
  },
  orbs: indexed("graphics/battle_anims/sprites/orbs.png"),
  background: {
    ...impact,
    opponentTilemap: parseTilemap(readFileSync(join(ref, "graphics/battle_anims/backgrounds/impact_opponent.bin")), 32, 20),
    playerTilemap: parseTilemap(readFileSync(join(ref, "graphics/battle_anims/backgrounds/impact_player.bin")), 32, 20),
  },
})}\n`);
console.log(`wrote ${out}`);
