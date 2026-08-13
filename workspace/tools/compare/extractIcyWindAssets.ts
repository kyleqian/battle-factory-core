// Reproducible source extraction for Move_ICY_WIND's BG_ICE and spike art.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { parseTilemap } from "../extract/tilemap.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/icy-wind.json");

function sprite(path: string) {
  const image = decodeIndexedPng(join(ref, path));
  const sliced = sliceTiles(image);
  return {
    tileset: { columns: sliced.columns, rows: sliced.rows, tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
    palette: image.palette,
  };
}

const backgroundImage = decodeIndexedPng(join(ref, "graphics/battle_anims/backgrounds/ice.png"));
const backgroundTiles = sliceTiles(backgroundImage);
const spike = sprite("graphics/battle_anims/sprites/ice_spikes.png");
const iceCrystalPalette = decodeIndexedPng(join(ref, "graphics/battle_anims/sprites/ice_crystals_0.png")).palette;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    background: "graphics/battle_anims/backgrounds/ice.png + ice.bin; BG_ICE",
    spike: "graphics/battle_anims/sprites/ice_spikes.png; gIceGroundSpikeSpriteTemplate",
    spikePalette: "ANIM_TAG_ICE_SPIKES loads gBattleAnimSpritePal_IceCrystals",
  },
  background: {
    tileset: { columns: backgroundTiles.columns, rows: backgroundTiles.rows, tiles: backgroundTiles.tiles.map((tile) => [...tile.pixels]) },
    palette: backgroundImage.palette,
    tilemap: parseTilemap(readFileSync(join(ref, "graphics/battle_anims/backgrounds/ice.bin")), 32, 32),
  },
  spike: { ...spike, palette: iceCrystalPalette },
})}\n`);
console.log(`wrote ${out}`);
