// Real content-assembly path for the opponent healthbox (ISSUES #16) - see
// docs/healthbox-assembly-notes.md for the full root-cause dossier and
// RAM/VRAM evidence. This is NOT wired into battleScene.ts this round (the
// brief keeps the pixel-harvested `sendout-healthbox-opponent.json` as the
// shipping render path) - it's the proven-so-far replacement candidate,
// exercised only by tests/healthboxAssembly.test.ts.
//
// Landed, byte-exact (RAM/VRAM-confirmed, see the doc) for the full-HP/
// no-status case: the base frame (a flat blit of the existing
// `singlesOpponent` sheet - no tile remap, the frame sheet's own raster
// order IS the on-screen order), the HP bar (full-HP tile selection +
// its own 3-entry SubspriteTable placement, drawn ON TOP of the frame -
// pixel-evidence contradicts round 1's OAM-index z-order guess, see the
// doc), and the nickname/gender + level text (the game's own small-font
// window-printer path, replicated pixel-for-pixel including the
// dynamic-color gender-symbol override). `composeOpponentHealthbox` still
// throws on any parameter combination this pipeline can't yet render
// (hpFraction != 1, any status) rather than silently producing wrong pixels.

import type { RgbColor } from "./bg.ts";
import fontSmallData from "../data/gen/font-small.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };

interface Tileset {
  columns: number;
  rows: number;
  tiles: number[][];
}

interface SheetAsset {
  tileset: Tileset;
  palette: RgbColor[];
}

export interface HealthboxAssets {
  /** `battle-healthbox.json`'s `singlesOpponent` - the static frame sheet. */
  frame: SheetAsset;
  /** `battle-healthbox.json`'s `hpbar` - the HP-bar fill tileset+palette. */
  hpbar: SheetAsset;
}

export interface HealthboxContentParams {
  /** Species/nickname text - drawn via the real FONT_SMALL window-printer path. */
  name: string;
  level: number;
  gender: "male" | "female" | "none";
  /** 0-1. Only 1 (full HP) is implemented. */
  hpFraction: number;
  /** Only "none" is implemented (no status icon drawn). */
  status: "none" | "sleep" | "poison" | "burn" | "freeze" | "paralysis";
}

/** RAM/VRAM-derived screen-space layout, relative to the healthbox's own corner (12,14) for this trace's opponent slot - see the doc's table. */
const FRAME_ORIGIN = { x: 12, y: 14 };
const FRAME_SIZE = { width: 128, height: 32 };

const fontSmall = fontSmallData as {
  cellSize: number;
  letterSpacing: number;
  glyphs: number[][];
  widths: number[];
};
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);

/**
 * FONT_SMALL's Latin-glyph cell height (`DecompressGlyph_Small`,
 * text.c:1713: `gCurGlyph.height = 13` on the non-Japanese path) - a
 * font-encoding constant, not stored in font-small.json (which only carries
 * each glyph's raw `cellSize`-square bitmap).
 */
const SMALL_FONT_GLYPH_HEIGHT = 13;

/**
 * The combined "Lv" glyph used by level text (`UpdateLvlInHealthbox`,
 * battle_interface.c:1113-1114: `CHAR_EXTRA_SYMBOL` (0xF9) + `CHAR_LV_2`
 * (0x05) - text.c:1455's `CHAR_EXTRA_SYMBOL` escape resolves the next byte
 * as glyph code `byte | 0x100` = 0x105 = 261). Not a normal charmap entry
 * (charmap.json only covers printable characters) - a font-encoding
 * constant true for every level's text, not GROVYLE-specific.
 */
const LV_GLYPH_CODE = 261;

/**
 * hpbar.png tile indices for a fully-filled green bar: cap (1,2) + 6x
 * fully-filled segment (11) - VRAM-confirmed, MoveBattleBarGraphically's
 * full-HP case (battle_interface.c:2275-2306).
 */
export const HP_BAR_FULL_TILES = [1, 2, 11, 11, 11, 11, 11, 11];

/**
 * The healthbar sprite's own SubspriteTable for the opponent side
 * (`sHealthBar_Subsprites_Opponent`, battle_interface.c:491-517), resolved
 * to canvas-local corners via the same transform `AddSubspritesToOamBuffer`
 * uses (sprite.c:1679-1755): `base{X,Y} = oam.{x,y} - centerToCornerVec{X,Y}`
 * (the sprite's own *center*, not corner - confirmed via the
 * `dump-healthbox-vram.py` probe: bar oam (x,y)=(36,26),
 * centerToCornerVec=(-16,-4) => base=(52,30); frame origin (12,14) =>
 * canvas-local center (40,16)), then `corner = base + subsprite.{x,y}`.
 * The third subsprite (8x8, tileOffset 8, x=-32) is VRAM-confirmed fully
 * transparent (bar's own local tile 8 is all-zero nibbles) - omitted here
 * since it never contributes a visible pixel.
 */
const HP_BAR_SUBSPRITES = [
  { localTiles: HP_BAR_FULL_TILES.slice(0, 4), cornerX: 24, cornerY: 16 },
  { localTiles: HP_BAR_FULL_TILES.slice(4, 8), cornerX: 56, cornerY: 16 },
];

/**
 * The healthbox window-printer's fixed layout (`sHealthboxWindowTemplate`,
 * `AddTextPrinterAndCreateWindowOnHealthbox`, `UpdateNickInHealthbox`/
 * `UpdateLvlInHealthbox` - battle_interface.c:760-768, 1912-1965,
 * 1105-1137). `TextIntoHealthboxObject`'s two-part CpuCopy (a hardware
 * tile-alignment optimization, not a real pixel remap - verified this
 * session by direct pixel diff against the harvested block) nets out to a
 * plain rectangular blit of window-local rows 5-15 (text print y=3, so rows
 * 0-4 - the glyphs' own top 2px - are dropped entirely and never reach the
 * screen) and columns 0..(windowWidthTiles*8) to the destination sprite's
 * own canvas-local corner, 1:1, no further offset.
 */
const TEXT_COLORS = { bg: 2, fg: 1, shadow: 3 };
const TEXT_VIS_Y0 = 5;
const TEXT_VIS_Y1 = 16;
const TEXT_PRINT_Y = 3;
/** Nickname+gender: opponent path copies 7 tiles (56px) into healthboxLeft's own tile1 (canvas-local x=8). */
const NAME_TEXT_DEST_X = 8;
const NAME_TEXT_VIS_WIDTH = 56;
/** Level: opponent path copies 3 tiles (24px) into healthboxRight's own tile0 (canvas-local x=64, since Right's corner = Left's + (64,0)). */
const LEVEL_TEXT_DEST_X = 64;
const LEVEL_TEXT_VIS_WIDTH = 24;

/**
 * Gender-symbol color override: `gText_HealthboxGender_Male`/`_Female`
 * (strings.c:1247-1248) embed a `{COLOR DYNAMIC_COLOR2}`/`{COLOR
 * DYNAMIC_COLOR1}` control code (TEXT_DYNAMIC_COLOR_2=0xB=11,
 * TEXT_DYNAMIC_COLOR_1=0xA=10 - characters.h:244-245) right before the
 * glyph, which sets the printer's fgColor to that literal palette index for
 * the rest of the string (text.c:980-984). Palette indices 11/10 in this
 * sprite's own bank are a saturated blue/pink (VRAM/pixel-confirmed against
 * the harvested block) - distinct from the plain fg (index 1, dark gray)
 * used for the rest of the nickname.
 */
const GENDER_SYMBOL_FG: Record<"male" | "female", number> = { male: 11, female: 10 };
const GENDER_SYMBOL_CHAR: Record<"male" | "female", string> = { male: "♂", female: "♀" };

function drawTileset(canvas: (RgbColor | null)[], canvasWidth: number, canvasHeight: number, sheet: SheetAsset, ox: number, oy: number): void {
  const { tileset, palette } = sheet;
  for (let ty = 0; ty < tileset.rows; ty += 1) {
    for (let tx = 0; tx < tileset.columns; tx += 1) {
      const tile = tileset.tiles[ty * tileset.columns + tx]!;
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const idx = tile[y * 8 + x]!;
          if (idx === 0) continue; // index0 = transparent, GBA 4bpp convention
          const px = ox + tx * 8 + x;
          const py = oy + ty * 8 + y;
          if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) continue;
          canvas[py * canvasWidth + px] = palette[idx] ?? null;
        }
      }
    }
  }
}

/** Draws a single horizontal row of (already-selected) hpbar tiles - the healthbar subsprite's own local tile layout. */
function drawHpBarSubsprite(canvas: (RgbColor | null)[], canvasWidth: number, canvasHeight: number, hpbar: SheetAsset, localTiles: number[], ox: number, oy: number): void {
  for (let i = 0; i < localTiles.length; i += 1) {
    const tile = hpbar.tileset.tiles[localTiles[i]!]!;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const idx = tile[y * 8 + x]!;
        if (idx === 0) continue;
        const px = ox + i * 8 + x;
        const py = oy + y;
        if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) continue;
        canvas[py * canvasWidth + px] = hpbar.palette[idx] ?? null;
      }
    }
  }
}

interface GlyphRun {
  code: number;
  fg?: number;
}

function nameGlyphRun(name: string, gender: "male" | "female" | "none"): GlyphRun[] {
  const run: GlyphRun[] = [];
  for (const ch of name) {
    const code = charmap.get(ch);
    if (code !== undefined) run.push({ code });
  }
  if (gender !== "none") {
    const code = charmap.get(GENDER_SYMBOL_CHAR[gender]);
    if (code !== undefined) run.push({ code, fg: GENDER_SYMBOL_FG[gender] });
  }
  return run;
}

/** `UpdateLvlInHealthbox` (battle_interface.c:1105-1119): "Lv" glyph + up to 3 decimal digits, right-aligned within a 3-digit field (`xPos = 5 * (3 - digitCount)`). */
function levelGlyphRun(level: number): { run: GlyphRun[]; printX: number } {
  const digits = String(level);
  if (!/^\d{1,3}$/.test(digits)) {
    throw new Error(`composeOpponentHealthbox: level must be a 1-3 digit positive integer, got ${level}`);
  }
  const run: GlyphRun[] = [{ code: LV_GLYPH_CODE }];
  for (const d of digits) {
    const code = charmap.get(d);
    if (code === undefined) throw new Error(`composeOpponentHealthbox: no glyph for digit ${d}`);
    run.push({ code });
  }
  const printX = 5 * (3 - digits.length);
  return { run, printX };
}

/**
 * Renders one healthbox text field (nickname+gender, or level) directly
 * onto the healthbox canvas, replicating the net pixel effect of the real
 * window-printer + two-part VRAM copy (see `TEXT_COLORS` etc. above): the
 * destination sub-rect is filled with the bg color first (the window's own
 * `FillWindowPixelBuffer`), then glyphs are drawn on top, clipped to the
 * copied window rows (5-15) and columns (0..visWidth) - anything outside
 * that footprint is left untouched (still whatever the frame drew there).
 */
function drawHealthboxText(canvas: (RgbColor | null)[], canvasWidth: number, canvasHeight: number, palette: RgbColor[], run: GlyphRun[], printX: number, destX: number, visWidth: number): void {
  for (let wy = TEXT_VIS_Y0; wy < TEXT_VIS_Y1; wy += 1) {
    for (let wx = 0; wx < visWidth; wx += 1) {
      const py = wy;
      const px = destX + wx;
      if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) continue;
      canvas[py * canvasWidth + px] = palette[TEXT_COLORS.bg] ?? null;
    }
  }

  let cursorX = printX;
  for (const { code, fg } of run) {
    const bitmap = fontSmall.glyphs[code];
    const glyphWidth = fontSmall.widths[code] ?? fontSmall.cellSize;
    if (bitmap) {
      for (let gy = 0; gy < SMALL_FONT_GLYPH_HEIGHT; gy += 1) {
        const wy = TEXT_PRINT_Y + gy;
        if (wy < TEXT_VIS_Y0 || wy >= TEXT_VIS_Y1) continue;
        for (let gx = 0; gx < glyphWidth; gx += 1) {
          const wx = cursorX + gx;
          if (wx < 0 || wx >= visWidth) continue;
          const raw = bitmap[gy * fontSmall.cellSize + gx]!;
          const role = raw === 3 ? 0 : raw;
          const colorIndex = role === 0 ? TEXT_COLORS.bg : role === 1 ? (fg ?? TEXT_COLORS.fg) : TEXT_COLORS.shadow;
          if (colorIndex === 0) continue;
          const px = destX + wx;
          const py = wy;
          if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) continue;
          canvas[py * canvasWidth + px] = palette[colorIndex] ?? null;
        }
      }
    }
    cursorX += glyphWidth + (fontSmall.letterSpacing ?? 0);
  }
}

/**
 * Composites the opponent healthbox's own local canvas (origin = the
 * healthbox's own screen corner, `FRAME_SIZE` wide/tall - crop+translate to
 * an absolute screen position at the call site). Returns `null` for pixels
 * this pipeline doesn't (yet) know the color of (unimplemented content
 * regions) rather than guessing - callers must not blit those cells.
 */
export function composeOpponentHealthbox(assets: HealthboxAssets, params: HealthboxContentParams): { width: number; height: number; pixels: (RgbColor | null)[] } {
  if (params.hpFraction !== 1) {
    throw new Error(`composeOpponentHealthbox: only hpFraction=1 (full HP) is implemented, got ${params.hpFraction}`);
  }
  if (params.status !== "none") {
    throw new Error(`composeOpponentHealthbox: only status="none" is implemented, got ${params.status}`);
  }

  const { width, height } = FRAME_SIZE;
  const canvas: (RgbColor | null)[] = new Array(width * height).fill(null);

  // Frame first, then the HP bar drawn on top (wherever the bar's own tiles
  // are opaque it wins over the frame beneath - confirmed by direct pixel
  // diff against the harvested block; this corrects round 1's speculative
  // OAM-index z-order guess, which had it backwards for this pair).
  drawTileset(canvas, width, height, assets.frame, 0, 0);
  for (const sub of HP_BAR_SUBSPRITES) {
    drawHpBarSubsprite(canvas, width, height, assets.hpbar, sub.localTiles, sub.cornerX, sub.cornerY);
  }

  // Nickname+gender and level text are CPU-copied directly into the frame
  // sprites' own VRAM tiles, so they unconditionally overwrite whatever the
  // frame (or, in principle, the bar - footprints don't overlap) drew there.
  drawHealthboxText(canvas, width, height, assets.frame.palette, nameGlyphRun(params.name, params.gender), 0, NAME_TEXT_DEST_X, NAME_TEXT_VIS_WIDTH);
  const { run: levelRun, printX: levelPrintX } = levelGlyphRun(params.level);
  drawHealthboxText(canvas, width, height, assets.frame.palette, levelRun, levelPrintX, LEVEL_TEXT_DEST_X, LEVEL_TEXT_VIS_WIDTH);

  return { width, height, pixels: canvas };
}

export const HEALTHBOX_FRAME_ORIGIN = FRAME_ORIGIN;
