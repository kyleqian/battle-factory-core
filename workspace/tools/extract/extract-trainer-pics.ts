// Dev-time extractor: reads reference/pokeemerald's trainer-sprite art for
// battle 1's two trainer intro slide-ins (docs/battle-bringup-notes.md S3):
// the opponent's battle front-pic (Bug Catcher class, via
// GetFrontierTrainerFrontSpriteId -> gFacilityClassToPicIndex[FACILITY_CLASS_
// BUG_CATCHER] = TRAINER_PIC_BUG_CATCHER -> gTrainerFrontPicTable) and the
// player's back-pic (Brendan - confirmed the male protagonist by
// extract-prebattle-room.ts's overworld sprite check).
// Run with:
//   node --experimental-strip-types tools/extract/extract-trainer-pics.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { sliceTiles } from "./tiles.ts";
import { loadJascPal } from "./jascPal.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

// --- Opponent: Bug Catcher front pic -----------------------------------------
// gTrainerFrontPic_BugCatcher / gTrainerPalette_BugCatcher (src/graphics.c:220-221)
// both come from the same source PNG's own embedded palette (INCGFX_U32(...,
// ".gbapal.lz") reads bug_catcher.png's PLTE directly - unlike mon pics there
// is no separate sibling .pal file for trainer front pics). gTrainerFrontPicCoords
// (src/data/trainer_graphics/front_pic_tables.h:76) is {.size=8,.y_offset=1}
// for every single trainer class incl. BUG_CATCHER - literally 64x64/8px,
// not a MON_COORDS_SIZE-packed value like the mon tables - so there is no
// meaningful "whole table" to extract here beyond this one constant.
for (const [file, output] of [
  ["bug_catcher", "bug-catcher"],
  ["fisherman", "fisherman"],
] as const) {
  const img = decodeIndexedPng(join(REF, "graphics", "trainers", "front_pics", `${file}.png`));
  if (img.width !== 64 || img.height !== 64) {
    throw new Error(`${file}.png: expected 64x64, got ${img.width}x${img.height}`);
  }
  const { columns, rows, tiles } = sliceTiles(img);
  writeJson(join(ASSETS_GEN, `trainer-pic-${output}.json`), {
    tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
    palette: img.palette,
    yOffsetPx: 8, // gTrainerFrontPicCoords entries use y_offset=1.
  });
}

// --- Player: Brendan back pic ------------------------------------------------
// gTrainerBackPic_Brendan (src/data/graphics/trainers.h:280) is a raw (never
// compressed) 64x256 sheet - 4 stacked 64x64 frames (send-out throw
// animation, gTrainerBackPicTable_Brendan in back_pic_anims.h). Oracle
// cross-check (frame-01600.png of a fresh /tmp/s6-battle1.json trace,
// trainer-slide-in-settled "BUG CATCHER DESTIN would like to battle!" frame):
// frame index **3** (the last of the 4), not 0, is the static slide-in pose -
// 100% exact pixel match at (48,48); frames 0-2 (the throw animation's other
// poses) each mismatch ~52% of pixels against that same frame. Extracting
// the whole sheet (all 4 frames) rather than guessing one sidesteps needing
// this confirmed up front. Palette is a *separate* file here
// (graphics/trainers/palettes/brendan.pal), unlike the front pic above -
// confirmed by src/data/graphics/trainers.h:215 (gTrainerPalette_Brendan
// reads brendan.pal, not brendan.png's own PLTE).
{
  const img = decodeIndexedPng(join(REF, "graphics", "trainers", "back_pics", "brendan.png"));
  if (img.width !== 64 || img.height % 64 !== 0) {
    throw new Error(`brendan.png: expected 64-wide, height a multiple of 64, got ${img.width}x${img.height}`);
  }
  const frameCount = img.height / 64;
  const { columns, rows, tiles } = sliceTiles(img);
  const palette = loadJascPal(join(REF, "graphics", "trainers", "palettes", "brendan.pal"));
  writeJson(join(ASSETS_GEN, "trainer-pic-brendan-back.json"), {
    frameCount,
    tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
    palette,
    yOffsetPx: 32, // gTrainerBackPicCoords[TRAINER_BACK_PIC_BRENDAN].y_offset=4 * 8px
  });
}
