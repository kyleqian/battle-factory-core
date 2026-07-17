// Dev-time extractor: the Summary screen's move-list corner icons and the
// move-select cursor art - flagged as not-yet-extracted by
// docs/summary-screen-notes.md's Extraction section (everything else there
// is already covered by extract-summary-screen.ts, an existing extractor
// this session leaves untouched). Writes new files under src/assets/gen/.
// Run with:
//   node --experimental-strip-types tools/extract/extract-summary-move-icons.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { parseTilemap } from "./tilemap.ts";

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

// --- Move-list power/accuracy + appeal/jam corner "windows" (raw pre-LZ u16
// tilemaps, INCBIN_U16 - src/graphics.c:1253-1255). Both are read through
// `sPowerAccSlidingWindow`/`sAppealJamSlidingWindow`
// (pokemon_summary_screen.c:388-403: .width = 10, .height = 7, row-major
// `gfx[width*row + col]`) by `CopyNColumnsToTilemap`
// (pokemon_summary_screen.c:2405-2427), which only ever reads rows 0-6 -
// each file is 160 bytes = 10x8 u16 entries, one row (80 bytes) longer than
// the 10x7 actually consumed; extracted as the full 10x8 the file contains
// (not truncated to 10x7) since the source-confirmed row width is 10 and
// keeping the untouched trailing row is more faithful than guessing it away.
{
  for (const [key, file] of [
    ["battle", "effect_battle.bin"],
    ["contest", "effect_contest.bin"],
  ] as const) {
    const buf = readFileSync(join(SUMMARY_DIR, file));
    const tilemap = parseTilemap(buf, 10, 8);
    writeJson(join(ASSETS_GEN, `summary-move-effect-${key}.json`), {
      tilemap,
      readRows: 7, // CopyNColumnsToTilemap only ever touches rows 0-6; row 7 is unread file padding.
    });
  }
}

// --- "CANCEL" 5-move-display toggle tilemap (effect_cancel.bin,
// src/graphics.c:1255-ish / TilemapFiveMovesDisplay,
// pokemon_summary_screen.c:2583-2607): NOT a rectangular BG tilemap like the
// two above - the code indexes it directly as three back-to-back 20-entry
// slices (source offsets 0/20/40, i in [0,20)) copied into three destination
// rows, so there is no single confirmed width x height for the whole file.
// The file is 128 bytes = 64 raw u16 entries, of which only indices 0-59
// (three 20-entry slices) are ever read by TilemapFiveMovesDisplay; extracted
// as a flat decoded array (same tile/hFlip/vFlip/palette bitfields as
// tilemap.ts's parseTilemap) rather than forcing an unconfirmed 2D shape.
{
  const buf = readFileSync(join(SUMMARY_DIR, "effect_cancel.bin"));
  if (buf.length % 2 !== 0) throw new Error(`effect_cancel.bin is ${buf.length} bytes, expected an even length`);
  const entries = [];
  for (let i = 0; i < buf.length / 2; i += 1) {
    const value = buf[i * 2]! | (buf[i * 2 + 1]! << 8);
    entries.push({
      tile: value & 0x3ff,
      hFlip: (value & 0x400) !== 0,
      vFlip: (value & 0x800) !== 0,
      palette: (value >> 12) & 0xf,
    });
  }
  writeJson(join(ASSETS_GEN, "summary-move-effect-cancel.json"), {
    entries,
    slices: [
      { name: "insertA", offset: 0, length: 20 },
      { name: "insertB", offset: 20, length: 20 },
      { name: "removeA", offset: 20, length: 20 },
      { name: "removeB", offset: 40, length: 20 },
    ],
  });
}

// --- Move-select cursor sprite sheet (move_select.png, embedded palette -
// gSummaryMoveSelect_Gfx/_Pal, src/graphics.c:1125-1126; 10-frame anim table
// sSpriteAnimTable_MoveSelector, pokemon_summary_screen.c:990-1001). Reached
// only inside move-select mode (docs/summary-screen-notes.md section 2's
// Sprites list) - inert-but-reachable per section 1, not drawn on Info/
// Skills/plain Moves-page views.
{
  const image = decodeIndexedPng(join(SUMMARY_DIR, "move_select.png"));
  const { columns, rows, tiles } = sliceTiles(image);
  writeJson(join(ASSETS_GEN, "summary-move-select.json"), {
    tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
    palette: image.palette,
  });
}

console.log("extraction complete");
