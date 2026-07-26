// Source-only asset for SetPsychicBackground's BG_PSYCHIC (the CONFUSION/
// PSYCHIC/FUTURE_SIGHT group-A blend_color_cycle siblings' shared new
// background) - a single static 32x20-tile 4bpp tilemap, no scroll variants
// (unlike EXTREME_SPEED's opponent/player pair).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { parseTilemap } from "./tilemap.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const ref = join(root, "reference", "pokeemerald", "graphics", "battle_anims", "backgrounds");
const out = join(root, "src", "assets", "gen", "battle-anim-psychic-bg.json");

const image = decodeIndexedPng(join(ref, "psychic.png"));
const sliced = sliceTiles(image);
const tilemapRaw = parseTilemap(readFileSync(join(ref, "psychic.bin")), 32, 20);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  source: "SetPsychicBackground -> BG_PSYCHIC (gBattleAnimBgImage_Psychic/Palette/Tilemap_Psychic)",
  tileset: {
    columns: sliced.columns,
    rows: sliced.rows,
    tiles: sliced.tiles.map((tile) => [...tile.pixels]),
  },
  palette: image.palette,
  tilemap: {
    ...tilemapRaw,
    // LoadMoveBg-family loaders install this move's one 16-color palette at
    // hardware BG palette bank 2 (GetBattleBgPaletteNum() returns 2 outside
    // Contests, battle_anim_mons.c:1024) - same convention already applied
    // for EXTREME_SPEED's BG_HIGHSPEED tilemaps.
    entries: tilemapRaw.entries.map((entry) => ({
      ...entry,
      palette: entry.palette === 0 ? 0 : entry.palette - 2,
    })),
  },
})}\n`);
console.log(`wrote ${out}`);
