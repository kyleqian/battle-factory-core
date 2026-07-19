// Real content-assembly path for the opponent healthbox (ISSUES #16) - see
// docs/healthbox-assembly-notes.md for the full root-cause dossier and
// RAM/VRAM evidence. Wired live into battleScene.ts's `drawSendOutHealthbox`
// (see the doc's "Wired live" section) - the pixel-harvested
// `sendout-healthbox-opponent.json` is no longer the shipping render source
// for the opponent healthbox (it stays committed as a ground-truth fixture
// for tests/healthboxAssembly.test.ts and tests/battleScene.test.ts).
//
// Landed, byte-exact (RAM/VRAM-confirmed, see the doc) for the full-HP/
// no-status case: the base frame (a flat blit of the existing
// `singlesOpponent` sheet - no tile remap, the frame sheet's own raster
// order IS the on-screen order), the HP bar (full-HP tile selection +
// its own 3-entry SubspriteTable placement, drawn ON TOP of the frame -
// pixel-evidence contradicts round 1's OAM-index z-order guess, see the
// doc), and the nickname/gender + level text (the game's own small-font
// window-printer path, replicated pixel-for-pixel including the
// dynamic-color gender-symbol override).
//
// Round 3 (ISSUES #16): hpFraction != 1 and status != "none" are now
// implemented too - source-decoded (CalcBarFilledPixels' fill-pixel/color-
// band math, UpdateStatusIconInHealthbox's status-icon placement), pinned
// by hermetic Tier-1 tests only. No oracle pixels exist yet for partial HP
// or status (the canonical trace never reaches that state before the first
// action menu) - that validation is deferred to S7's first HP-drain trace,
// see docs/healthbox-assembly-notes.md.

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
  /** `battle-healthbox.json`'s `hpbar` - the HP-bar caption + green-band fill tileset+palette. */
  hpbar: SheetAsset;
  /** `battle-healthbox.json`'s `hpbarAnim` - the HP-bar yellow/red-band fill tileset (green lives in `hpbar`, see `HP_BAR_GREEN_BASE`). */
  hpbarAnim: SheetAsset;
  /** `battle-healthbox.json`'s `status2` - GetStatusIconForBattlerId's BATTLER1 sheet, the one the opponent (battler 1 in singles) actually uses. */
  statusIcons: SheetAsset;
}

export interface HealthboxContentParams {
  /** Species/nickname text - drawn via the real FONT_SMALL window-printer path. */
  name: string;
  level: number;
  gender: "male" | "female" | "none";
  /** currentHP/maxHP, 0-1. */
  hpFraction: number;
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
 * full-HP case (battle_interface.c:2275-2306). Kept as a standalone pinned
 * constant (round 2); `hpBarLocalTiles(assets, 1)` below reproduces the same
 * 8 values through the general per-fraction path, and a test asserts they
 * agree.
 */
export const HP_BAR_FULL_TILES = [1, 2, 11, 11, 11, 11, 11, 11];

/**
 * The healthbar sprite's own SubspriteTable geometry for the opponent side
 * (`sHealthBar_Subsprites_Opponent`, battle_interface.c:491-517), resolved
 * to canvas-local corners via the same transform `AddSubspritesToOamBuffer`
 * uses (sprite.c:1679-1755): `base{X,Y} = oam.{x,y} - centerToCornerVec{X,Y}`
 * (the sprite's own *center*, not corner - confirmed via the
 * `dump-healthbox-vram.py` probe: bar oam (x,y)=(36,26),
 * centerToCornerVec=(-16,-4) => base=(52,30); frame origin (12,14) =>
 * canvas-local center (40,16)), then `corner = base + subsprite.{x,y}`.
 * The third subsprite (8x8, tileOffset 8, x=-32) is VRAM-confirmed fully
 * transparent (bar's own local tile 8 is all-zero nibbles) - omitted here
 * since it never contributes a visible pixel. Geometry is fill-level
 * independent - only which tiles land here (see `hpBarLocalTiles`) varies.
 */
const HP_BAR_SUBSPRITE_CORNERS = [
  { cornerX: 24, cornerY: 16 },
  { cornerX: 56, cornerY: 16 },
];

/**
 * `B_HEALTHBAR_PIXELS` (battle_interface.c:2233) - the health bar's total
 * fill width in pixels, 6 tiles x 8px.
 */
const HP_BAR_TOTAL_PIXELS = 48;

/**
 * `MoveBattleBarGraphically`'s color-band thresholds (battle_interface.c:
 * 2279-2283): `filledPixelsCount > 50% -> green`, `> 20% -> yellow`, else
 * red. Integer division, same as the source (`48*50/100=24` exactly;
 * `48*20/100=9.6` truncates to 9) - so exactly-50% HP (24 px) is YELLOW, not
 * green, and exactly-20% HP (9 px) is RED, not yellow. Pinned by a test.
 */
const HP_BAR_GREEN_THRESHOLD = Math.floor((HP_BAR_TOTAL_PIXELS * 50) / 100);
const HP_BAR_YELLOW_THRESHOLD = Math.floor((HP_BAR_TOTAL_PIXELS * 20) / 100);

/** `HEALTHBOX_GFX_HP_BAR_GREEN`'s enum offset within `hpbar`'s own 12-tile sheet (0px..8px = local tiles 3..11). */
const HP_BAR_GREEN_BASE = 3;
/** `HEALTHBOX_GFX_HP_BAR_YELLOW`'s enum offset within `hpbarAnim`'s own 18-tile sheet (0px..8px = local tiles 0..8). */
const HP_BAR_YELLOW_BASE = 0;
/** `HEALTHBOX_GFX_HP_BAR_RED`'s enum offset within `hpbarAnim`'s own 18-tile sheet (0px..8px = local tiles 9..17). */
const HP_BAR_RED_BASE = 9;

export type HpBarBand = "green" | "yellow" | "red";

/** `CalcBarFilledPixels` (battle_interface.c:2413-2456), specialized to the settled (non-mid-animation) case where `currValue` has already converged to `newValue` and `maxValue >= totalPixels` (true for every real Pokemon's max HP vs. this bar's 48px) - so `pixels = floor(hpFraction * totalPixels)` stands in for the source's `currValue * totalPixels / maxValue` integer division. Floating-point `hpFraction` (vs. the source's exact integer ratio) can differ by 1px right at a truncation boundary for some HP pairs - accepted per the ISSUES #16 ground-truth caveat (no oracle pixels to pin this against yet). The `filledPixels==0 && hp>0 -> force 1px` rule (source lines 2436-2440) is the "never show a fully-empty bar for a Pokemon that isn't fainted" sliver case. */
export function calcBarFilledPixels(hpFraction: number): { filledPixels: number; columns: number[] } {
  const rawPixels = Math.floor(hpFraction * HP_BAR_TOTAL_PIXELS);
  const columns = [0, 0, 0, 0, 0, 0];
  if (rawPixels === 0 && hpFraction > 0) {
    columns[0] = 1;
    return { filledPixels: 1, columns };
  }
  let remaining = rawPixels;
  for (let i = 0; i < 6; i += 1) {
    if (remaining >= 8) {
      columns[i] = 8;
    } else {
      columns[i] = remaining;
      break;
    }
    remaining -= 8;
  }
  return { filledPixels: rawPixels, columns };
}

/** Color-band selection from `filledPixelsCount` (battle_interface.c:2279-2284) - see `HP_BAR_GREEN_THRESHOLD`/`HP_BAR_YELLOW_THRESHOLD`. */
export function pickHpBarBand(filledPixels: number): HpBarBand {
  if (filledPixels > HP_BAR_GREEN_THRESHOLD) return "green";
  if (filledPixels > HP_BAR_YELLOW_THRESHOLD) return "yellow";
  return "red";
}

/**
 * Resolves the healthbar sprite's own local tiles 0-7 for a given HP
 * fraction: tiles 0-1 are the static "H"/"P" caption (always `hpbar` sheet,
 * band-independent - loaded once at sprite creation, `battle_interface.c:
 * 938`, never touched by `MoveBattleBarGraphically`); tiles 2-7 are the 6
 * fill columns, sourced from `hpbar` (green) or `hpbarAnim` (yellow/red) per
 * the selected band.
 */
function hpBarLocalTiles(assets: HealthboxAssets, hpFraction: number): { sheet: SheetAsset; tileIndex: number }[] {
  const { filledPixels, columns } = calcBarFilledPixels(hpFraction);
  const band = pickHpBarBand(filledPixels);
  const fillSheet = band === "green" ? assets.hpbar : assets.hpbarAnim;
  const fillBase = band === "green" ? HP_BAR_GREEN_BASE : band === "yellow" ? HP_BAR_YELLOW_BASE : HP_BAR_RED_BASE;
  return [
    { sheet: assets.hpbar, tileIndex: 1 },
    { sheet: assets.hpbar, tileIndex: 2 },
    ...columns.map((px) => ({ sheet: fillSheet, tileIndex: fillBase + px })),
  ];
}

/**
 * `UpdateStatusIconInHealthbox`'s opponent path (battle_interface.c:2000-
 * 2003, 2059): `tileNumAdder = 0x11 = 17` regardless of singles/doubles for
 * any opponent battler, CPU-copied 3 tiles (96 bytes) into the healthboxLeft
 * sprite's own local tile array at that offset. Left's own tile grid is
 * 8 cols x 4 rows (64x32px / 8), so local tile 17 = row 2 (17>>3), col 1
 * (17&7) => canvas-local corner (8,16), 24px wide, 8px tall. This overlaps
 * the HP bar's leftmost ("H" caption) tile at canvas (24,16) by one column -
 * the compositor draws the status icon into the frame layer *before* the HP
 * bar (see `composeOpponentHealthbox`), so the already-established z-order
 * rule (round 2: the bar sprite wins over the frame wherever both are
 * opaque) naturally clips that shared column in the bar's favor, with no new
 * z-order assumption needed.
 */
const STATUS_ICON_DEST = { x: 8, y: 16 };

/** Row order within `status2` (3 cols x 5 rows) - matches the enum order PSN,PRZ,SLP,FRZ,BRN (battle_interface.c:112-126). */
const STATUS_ICON_ROWS: Record<Exclude<HealthboxContentParams["status"], "none">, number> = {
  poison: 0,
  paralysis: 1,
  sleep: 2,
  freeze: 3,
  burn: 4,
};

/** mGBA's 5-bit -> 8-bit channel expansion (`tools/extract/gbaColor.ts`'s `expand5to8`, reproduced locally - engine code doesn't import dev-time extractor tools). */
function expandGbaChannel(c5: number): number {
  return (c5 << 3) | (c5 >> 2);
}

/**
 * `sStatusIconColors` (battle_interface.c:751-757), 5-bit-per-channel GBA
 * `RGB(r,g,b)` literals expanded the same way mGBA's framebuffer does. Each
 * status icon's tile pixel data indexes this sprite's own palette slot
 * `battler + 12` (`pltAdder`, battle_interface.c:2057-2058) for its one
 * "dynamic" color (VRAM/PNG-confirmed placeholder `(197,98,197)` at that
 * slot in `ball_status_bar.png`'s embedded palette, close to
 * `expandGbaChannel(24)`'s 198 - the placeholder art already approximates
 * the runtime-substituted color). For the opponent healthbox, `battler` is
 * always 1 in a singles battle, so the dynamic slot is fixed at index 13.
 */
const STATUS_ICON_DYNAMIC_PALETTE_INDEX = 13;
const STATUS_ICON_COLORS: Record<Exclude<HealthboxContentParams["status"], "none">, RgbColor> = {
  poison: { r: expandGbaChannel(24), g: expandGbaChannel(12), b: expandGbaChannel(24) },
  paralysis: { r: expandGbaChannel(23), g: expandGbaChannel(23), b: expandGbaChannel(3) },
  sleep: { r: expandGbaChannel(20), g: expandGbaChannel(20), b: expandGbaChannel(17) },
  freeze: { r: expandGbaChannel(17), g: expandGbaChannel(22), b: expandGbaChannel(28) },
  burn: { r: expandGbaChannel(28), g: expandGbaChannel(14), b: expandGbaChannel(10) },
};

/** Draws the opponent's 3-tile status icon (see `STATUS_ICON_DEST`), substituting the status-specific color into the sheet's dynamic palette slot. */
function drawStatusIcon(canvas: (RgbColor | null)[], canvasWidth: number, canvasHeight: number, sheet: SheetAsset, status: Exclude<HealthboxContentParams["status"], "none">): void {
  const row = STATUS_ICON_ROWS[status];
  const palette = sheet.palette.slice();
  palette[STATUS_ICON_DYNAMIC_PALETTE_INDEX] = STATUS_ICON_COLORS[status];
  for (let i = 0; i < 3; i += 1) {
    const tile = sheet.tileset.tiles[row * 3 + i]!;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const idx = tile[y * 8 + x]!;
        if (idx === 0) continue;
        const px = STATUS_ICON_DEST.x + i * 8 + x;
        const py = STATUS_ICON_DEST.y + y;
        if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) continue;
        canvas[py * canvasWidth + px] = palette[idx] ?? null;
      }
    }
  }
}

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

/** Draws a single horizontal row of (already-selected, per-tile-sheet-resolved) hpbar tiles - the healthbar subsprite's own local tile layout. */
function drawHpBarSubsprite(canvas: (RgbColor | null)[], canvasWidth: number, canvasHeight: number, tiles: { sheet: SheetAsset; tileIndex: number }[], ox: number, oy: number): void {
  for (let i = 0; i < tiles.length; i += 1) {
    const { sheet, tileIndex } = tiles[i]!;
    const tile = sheet.tileset.tiles[tileIndex]!;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const idx = tile[y * 8 + x]!;
        if (idx === 0) continue;
        const px = ox + i * 8 + x;
        const py = oy + y;
        if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) continue;
        canvas[py * canvasWidth + px] = sheet.palette[idx] ?? null;
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
  if (!(params.hpFraction >= 0 && params.hpFraction <= 1)) {
    throw new Error(`composeOpponentHealthbox: hpFraction must be in [0,1], got ${params.hpFraction}`);
  }
  if (params.status !== "none" && !(params.status in STATUS_ICON_ROWS)) {
    throw new Error(`composeOpponentHealthbox: unknown status ${params.status}`);
  }

  const { width, height } = FRAME_SIZE;
  const canvas: (RgbColor | null)[] = new Array(width * height).fill(null);

  // Frame first. Status icon (if any) is also frame-layer content (real
  // game CPU-copies it into the same sprite's VRAM as the frame art), so it
  // must land before the HP bar too - see STATUS_ICON_DEST's doc for why
  // that ordering, not a fresh z-order guess, is what resolves its overlap
  // with the bar's leftmost tile.
  drawTileset(canvas, width, height, assets.frame, 0, 0);
  if (params.status !== "none") {
    drawStatusIcon(canvas, width, height, assets.statusIcons, params.status);
  }

  // HP bar drawn on top of the frame layer (wherever the bar's own tiles
  // are opaque it wins over the frame beneath - confirmed by direct pixel
  // diff against the harvested block; this corrects round 1's speculative
  // OAM-index z-order guess, which had it backwards for this pair).
  const hpBarTiles = hpBarLocalTiles(assets, params.hpFraction);
  for (let i = 0; i < HP_BAR_SUBSPRITE_CORNERS.length; i += 1) {
    const { cornerX, cornerY } = HP_BAR_SUBSPRITE_CORNERS[i]!;
    drawHpBarSubsprite(canvas, width, height, hpBarTiles.slice(i * 4, i * 4 + 4), cornerX, cornerY);
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
