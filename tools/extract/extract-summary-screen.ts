// Dev-time extractor: reads reference/pokeemerald's Pokémon Summary Screen
// art (as reached from the Battle Factory draft menu's SUMMARY option -
// SUMMARY_MODE_LOCK_MOVES, all 4 pages navigable) and writes committed,
// decoded artifacts under src/assets/gen/. Run with:
//   node --experimental-strip-types tools/extract/extract-summary-screen.ts
//
// Never imported at runtime - the production build only reads its JSON output.
// See docs/summary-screen-notes.md for the source citations behind each
// asset's shape (BG layers, window templates, sprite inventory, timings).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { parseTilemap } from "./tilemap.ts";
import { loadJascPal } from "./jascPal.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");
const SUMMARY_DIR = join(REF, "graphics", "summary_screen");

mkdirSync(ASSETS_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

// --- BG: shared tileset (tiles.png, 8 subpalettes of 16) + the 4 reachable
// page tilemaps (pokemon_summary_screen.c:1327 DecompressAndCopyTileDataToVram
// loads gSummaryScreen_Gfx to BG1's charblock; :1354 LoadCompressedPalette
// loads gSummaryScreen_Pal across BG palette slots 0-7; :1333/1342/1346/1350
// LZDecompressWram the 4 page tilemaps into sMonSummaryScreen->
// bgTilemapBuffers[page][0] - egg-only page_info_egg.bin is NOT extracted,
// out of scope for rentals per the roadmap). The source .bin files here are
// the pre-LZ raw 32x32 GBA tilemaps (2048 bytes each), parsed exactly like
// battle_factory_screen's menu.bin.
{
  const tilesImage = decodeIndexedPng(join(SUMMARY_DIR, "tiles.png"));
  const { columns, rows, tiles } = sliceTiles(tilesImage);
  const subpalettes: Array<{ r: number; g: number; b: number }[]> = [];
  for (let i = 0; i < 8; i += 1) {
    subpalettes.push(tilesImage.palette.slice(i * 16, i * 16 + 16));
  }

  const pageFiles: Record<string, string> = {
    info: "page_info.bin",
    skills: "page_skills.bin",
    battleMoves: "page_battle_moves.bin",
    contestMoves: "page_contest_moves.bin",
  };
  const pages: Record<string, ReturnType<typeof parseTilemap>> = {};
  for (const [name, file] of Object.entries(pageFiles)) {
    const buf = readFileSync(join(SUMMARY_DIR, file));
    pages[name] = parseTilemap(buf, 32, 32);
  }

  writeJson(join(ASSETS_GEN, "summary-bg.json"), {
    tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
    subpalettes,
    pages,
  });
}

// --- Type + contest-category icon sprites (pokemon_summary_screen.c:891-895
// sSpriteSheet_MoveTypes = gMoveTypes_Gfx, one 32x16px (4x2 8x8-tile) chunk
// per type/category, TYPE_* order from include/constants/pokemon.h followed
// by the 5 contest categories; each source PNG embeds its own palette here
// for asset completeness, but at runtime all 23 share one OAM palette
// (graphics/types/move_types.gbapal, referenced by index via
// sMoveTypeToOamPaletteNum, not extracted here - binary .gbapal, not JASC).
{
  const TYPES_DIR = join(REF, "graphics", "types");
  const TYPE_FILES: Record<string, string> = {
    NORMAL: "normal",
    FIGHTING: "fight",
    FLYING: "flying",
    POISON: "poison",
    GROUND: "ground",
    ROCK: "rock",
    BUG: "bug",
    GHOST: "ghost",
    STEEL: "steel",
    MYSTERY: "mystery",
    FIRE: "fire",
    WATER: "water",
    GRASS: "grass",
    ELECTRIC: "electric",
    PSYCHIC: "psychic",
    ICE: "ice",
    DRAGON: "dragon",
    DARK: "dark",
  };
  const CONTEST_CATEGORY_FILES: Record<string, string> = {
    COOL: "contest_cool",
    BEAUTY: "contest_beauty",
    CUTE: "contest_cute",
    SMART: "contest_smart",
    TOUGH: "contest_tough",
  };

  function extractIconSheet(files: Record<string, string>) {
    const out: Record<string, { tileset: { columns: number; rows: number; tiles: number[][] }; palette: { r: number; g: number; b: number }[] }> = {};
    for (const [key, file] of Object.entries(files)) {
      const image = decodeIndexedPng(join(TYPES_DIR, `${file}.png`));
      const { columns, rows, tiles } = sliceTiles(image);
      out[key] = {
        tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
        palette: image.palette,
      };
    }
    return out;
  }

  writeJson(join(ASSETS_GEN, "summary-type-icons.json"), {
    types: extractIconSheet(TYPE_FILES),
    contestCategories: extractIconSheet(CONTEST_CATEGORY_FILES),
  });
}

// --- Mon markings sprite (mon_markings.c:25-26 sMonMarkings_Gfx from
// graphics/interface/mon_markings.png; pokemon_summary_screen.c:4050 passes
// its OWN palette override sMarkings_Pal = graphics/summary_screen/
// markings.pal instead of the tileset's embedded one - both extracted).
{
  const markingsImage = decodeIndexedPng(join(REF, "graphics", "interface", "mon_markings.png"));
  const { columns, rows, tiles } = sliceTiles(markingsImage);
  const markingsPal = loadJascPal(join(SUMMARY_DIR, "markings.pal"));
  writeJson(join(ASSETS_GEN, "summary-markings.json"), {
    tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
    embeddedPalette: markingsImage.palette,
    spritePalette: markingsPal,
  });
}

// --- A/B button prompt icons (pokemon_summary_screen.c:725-728 sButtons_Gfx,
// blitted by PrintAOrBButtonIcon at :2821-2830 for the Cancel/Info/Switch
// prompts visible on the Info/Battle-Moves/Contest-Moves pages).
{
  function extractButton(file: string) {
    const image = decodeIndexedPng(join(SUMMARY_DIR, file));
    const { columns, rows, tiles } = sliceTiles(image);
    return {
      tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
      palette: image.palette,
    };
  }
  writeJson(join(ASSETS_GEN, "summary-buttons.json"), {
    a: extractButton("a_button.png"),
    b: extractButton("b_button.png"),
  });
}

console.log("extraction complete");
