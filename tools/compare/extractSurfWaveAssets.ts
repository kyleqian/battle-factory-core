// Byte-preserving source extraction for the create_surf_wave command only.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { loadJascPal } from "../extract/jascPal.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = join(root, "reference/pokeemerald/graphics/battle_anims/backgrounds");
const outFlag = process.argv.indexOf("--out");
const out = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/surf-wave.json");
const water = decodeIndexedPng(join(ref, "water.png"));
const sliced = sliceTiles(water);
const sourceRoot = join(root, "reference/pokeemerald");

function sprite(path: string, palettePath: string) {
  const image = decodeIndexedPng(join(sourceRoot, path));
  const tiles = sliceTiles(image);
  return {
    tileset: {
      columns: tiles.columns,
      rows: tiles.rows,
      tiles: tiles.tiles.map((tile) => [...tile.pixels]),
    },
    palette: loadJascPal(join(sourceRoot, palettePath)),
  };
}

function parseWideTilemap(bytes: Uint8Array) {
  const entries = [];
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      const block = x >>> 5;
      const offset = (block * 1024 + y * 32 + (x & 31)) * 2;
      const value = bytes[offset]! | (bytes[offset + 1]! << 8);
      entries.push({
        tile: value & 0x3ff,
        hFlip: (value & 0x400) !== 0,
        vFlip: (value & 0x800) !== 0,
        palette: (value >>> 12) & 0xf,
      });
    }
  }
  return { width: 64, height: 32, entries };
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: {
    command: "create_surf_wave palette=ANIM_SURF_PAL_SURF",
    carriers: [
      "FRONTIER_MON_WARTORTLE_2 set 281; SPECIES_WARTORTLE; MOVE_SURF",
      "FRONTIER_MON_MARSHTOMP_2 set 295; SPECIES_MARSHTOMP; MOVE_MUDDY_WATER",
    ],
    graphics: "graphics/battle_anims/backgrounds/water.png; gBattleAnimBgImage_Surf",
    playerTilemap: "graphics/battle_anims/backgrounds/water_player.bin; gBattleAnimBgTilemap_SurfPlayer",
    opponentTilemap: "graphics/battle_anims/backgrounds/water_opponent.bin; gBattleAnimBgTilemap_SurfOpponent",
    surfPalette: "water.png palette; gBattleAnimBgPalette_Surf",
    muddyWaterPalette: "graphics/battle_anims/backgrounds/water_muddy.pal; gBattleAnimBackgroundImageMuddyWater_Pal",
    excluded: "contest tilemap is not required by Battle Factory single battles; no software sprite asset is loaded by create_surf_wave",
  },
  water: {
    columns: sliced.columns, rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => ({ pixels: [...tile.pixels], subpalette: tile.subpalette })),
    surfPalette: water.palette,
    muddyWaterPalette: loadJascPal(join(ref, "water_muddy.pal")),
  },
  playerTilemap: parseWideTilemap(
    readFileSync(join(ref, "water_player.bin")),
  ),
  opponentTilemap: parseWideTilemap(
    readFileSync(join(ref, "water_opponent.bin")),
  ),
  wartortleBack: sprite(
    "graphics/pokemon/wartortle/back.png",
    "graphics/pokemon/wartortle/normal.pal",
  ),
  wartortleFront: sprite(
    "graphics/pokemon/wartortle/anim_front.png",
    "graphics/pokemon/wartortle/normal.pal",
  ),
})}\n`);
console.log(`wrote ${out}`);
