// ISSUES #20's rewire: live FONT_NARROW/FONT_NORMAL rendering for the FIGHT
// submenu's move-name/PP/type text, replacing the per-slot static pixel
// harvest (`fight-submenu-window.json`) that only ever reproduced battle 1's
// fixed Onix moveset. `battleScene.ts`'s `drawFightSubmenuWindow` still
// blits that harvest for the window's own chrome (border + cursor arrow -
// `MoveSelectionCreateCursorAt`/`DestroyCursorAt` poke the BG tilemap
// directly, a wholly separate mechanism from the text-window/printer system
// modeled here, so there's nothing to "rewire" there); this module owns
// exactly the six text windows `battle_message.c`'s
// `sStandardBattleWindowTemplates` defines for move selection
// (B_WIN_MOVE_NAME_1..4, B_WIN_PP, B_WIN_PP_REMAINING, B_WIN_MOVE_TYPE) -
// blanking each to its own fill color before redrawing, so ANY moveset (not
// just Onix's) renders correctly regardless of what stale text the chosen
// chrome patch happens to have baked in. See docs/battle-menu-notes.md
// §13b for the full derivation.

import { setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";
import { drawGlyphCodes, drawText, measureText, type FontData, type TextColors } from "./font.ts";
import { getCurrentPPToMaxPPState, ppRemainingGlyphCodes, ROCK_SLIDE_PP_REMAINING_ORIGIN } from "./battleMenu.ts";
import fontNarrowData from "../data/gen/font-narrow.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };
import movesData from "../data/gen/moves.json" with { type: "json" };

const fontNarrow = fontNarrowData as unknown as FontData;
const fontNormal = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);

interface MoveDataEntry {
  move: string;
  id: number;
  name: string;
  type: string;
  pp: number;
}
const MOVES_BY_ID = new Map<number, MoveDataEntry>(
  (movesData as { moves: MoveDataEntry[] }).moves.map((m) => [m.id, m]),
);

export interface FightMoveInfo {
  /** `gMoveNames`' own display string (`src/data/gen/moves.json`'s `name` field) - already space/hyphen-correct (e.g. "SAND-ATTACK", "DRAGONBREATH", no auto-formatting applied here). */
  name: string;
  /** Type id string as `moves.json` encodes it (e.g. "TYPE_ROCK"), mapped to its 3-8 char display abbreviation via `TYPE_DISPLAY_NAMES`. */
  type: string;
  currentPP: number;
  maxPP: number;
}
export type FightMoveset = readonly [FightMoveInfo, FightMoveInfo, FightMoveInfo, FightMoveInfo];

/**
 * `gTypeNames` (battle_main.c:451-469) - NOT a plain "strip the TYPE_
 * prefix" table (FIGHTING->"FIGHT", ELECTRIC->"ELECTR", PSYCHIC->"PSYCHC",
 * MYSTERY->"???" all diverge from their enum names), so this is transcribed
 * verbatim from source rather than derived from the `TYPE_*` id strings.
 */
export const TYPE_DISPLAY_NAMES: Record<string, string> = {
  TYPE_NORMAL: "NORMAL",
  TYPE_FIGHTING: "FIGHT",
  TYPE_FLYING: "FLYING",
  TYPE_POISON: "POISON",
  TYPE_GROUND: "GROUND",
  TYPE_ROCK: "ROCK",
  TYPE_BUG: "BUG",
  TYPE_GHOST: "GHOST",
  TYPE_STEEL: "STEEL",
  TYPE_MYSTERY: "???",
  TYPE_FIRE: "FIRE",
  TYPE_WATER: "WATER",
  TYPE_GRASS: "GRASS",
  TYPE_ELECTRIC: "ELECTR",
  TYPE_PSYCHIC: "PSYCHC",
  TYPE_ICE: "ICE",
  TYPE_DRAGON: "DRAGON",
  TYPE_DARK: "DARK",
};

/**
 * Builds a `FightMoveset` from `gBattleMons[].moves`-style numeric move ids
 * (the RAM-native representation - see e.g.
 * `src/data/gen/battle2-turn1-battler-dump.json`'s own `moves`/`pp` fields)
 * plus the battler's live per-slot current PP. `maxPP` is always the move's
 * own base `pp` from `moves.json` (no PP-Up modeling anywhere in this run -
 * every known RAM dump's `pp` field already equals the move's base PP
 * exactly, Onix's and KABUTO's alike).
 */
export function buildFightMoveset(
  moveIds: readonly [number, number, number, number],
  currentPPs: readonly [number, number, number, number],
): FightMoveset {
  return moveIds.map((id, i) => {
    const m = MOVES_BY_ID.get(id);
    if (!m) throw new Error(`buildFightMoveset: unknown move id ${id}`);
    return { name: m.name, type: m.type, currentPP: currentPPs[i]!, maxPP: m.pp };
  }) as unknown as FightMoveset;
}

// text.pal (graphics/battle_interface/text.pal), gbaRoundTrip-expanded -
// fgColor=13/bgColor=14/shadowColor=15 into BG palette bank 5
// (battle_message.c:1510-1549,1580-1589) - same source tests/fontNarrow.
// test.ts already pins for the move-name/"TYPE/"-label text. B_WIN_MOVE_
// TYPE's own FONT_NORMAL-switched type-name suffix keeps these SAME colors:
// the EXT_CTRL_CODE_FONT splice (battle_controller_player.c:1502-1504)
// changes the printer's font id only, not its color args.
const NAME_PALETTE: RgbColor[] = [];
NAME_PALETTE[13] = { r: 74, g: 74, b: 74 };
NAME_PALETTE[14] = { r: 255, g: 255, b: 255 };
NAME_PALETTE[15] = { r: 214, g: 214, b: 206 };
const NAME_COLORS: TextColors = { fg: 13, bg: 14, shadow: 15 };
const WHITE: RgbColor = { r: 255, g: 255, b: 255 };

/**
 * `graphics/battle_interface/text_pp.pal` (`gPPTextPalette`), gbaRoundTrip-
 * expanded - `SetPPNumbersPaletteInMoveSelection` (battle_message.c:3033-
 * 3045) overwrites BG palette bank 5 indices 12(fg)/11(shadow) from
 * `palPtr[state*2 + {0,1}]` at render time, `state` = `GetCurrentPPToMaxPPState`
 * (0=empty..3=full). Both B_WIN_PP (the "PP" label) and B_WIN_PP_REMAINING
 * (the "x/y" digits) read these SAME two bank-5 indices
 * (battle_message.c:1550-1559,1570-1579: both fgColor=12/shadowColor=11),
 * so both share one dynamic color pair per state - values verified via
 * `tools/extract/jascPal.ts`'s own gbaRoundTrip against a fresh parse of the
 * .pal file (state 3 matches `tests/fontNarrow.test.ts`'s already-pinned
 * full-PP pair exactly: (74,74,74)/(222,222,222)).
 */
export const PP_STATE_COLORS: readonly { fg: RgbColor; shadow: RgbColor }[] = [
  { fg: { r: 214, g: 198, b: 0 }, shadow: { r: 255, g: 247, b: 140 } },
  { fg: { r: 255, g: 132, b: 0 }, shadow: { r: 255, g: 239, b: 115 } },
  { fg: { r: 231, g: 24, b: 0 }, shadow: { r: 247, g: 222, b: 156 } },
  { fg: { r: 74, g: 74, b: 74 }, shadow: { r: 222, g: 222, b: 222 } },
];

function ppColorsForState(state: 0 | 1 | 2 | 3): { palette: RgbColor[]; colors: TextColors } {
  const { fg, shadow } = PP_STATE_COLORS[state]!;
  const palette: RgbColor[] = [];
  palette[12] = fg;
  palette[14] = WHITE;
  palette[11] = shadow;
  return { palette, colors: { fg: 12, bg: 14, shadow: 11 } };
}

// Patch-local (relative to `fightSubmenuWindow.x/.y`) text origins -
// grid-search-confirmed byte-exact against the oracle harvest, cross-
// confirmed by sStandardBattleWindowTemplates' own tile-grid deltas
// (tests/fontNarrow.test.ts's header comment has the full derivation).
const MOVE_NAME_ORIGINS: readonly { x: number; y: number }[] = [
  { x: 15, y: 8 },
  { x: 87, y: 8 },
  { x: 15, y: 24 },
  { x: 87, y: 24 },
];
const PP_LABEL_ORIGIN = { x: 167, y: 8 };
const TYPE_LABEL_ORIGIN = { x: 167, y: 24 };
// ROCK_SLIDE_PP_REMAINING_ORIGIN (battleMenu.ts) is the general B_WIN_PP_
// REMAINING window origin, not ROCK_SLIDE-specific despite its name (that
// name predates this general rewire - it was only ever used for ROCK_
// SLIDE's own turn-2 PP overlay before now).

/**
 * Each text window's own pixel rect (`sStandardBattleWindowTemplates`'
 * `width`/`height` in tiles * 8, `text.x`/`text.y` subtracted from the
 * known-good text origin to recover the window's own top-left) - blanked to
 * `PIXEL_FILL(0xE)` (index 14, white - matches `NAME_PALETTE`/PP palettes'
 * own index-14 entry) before each redraw so a shorter/differently-shaped
 * string than whatever the chosen chrome patch baked in never leaves stale
 * pixels behind. Widths are generous (64px name/type windows fit every
 * checked move name/type-name combo with room to spare - see docs/
 * battle-menu-notes.md §13b's width table), not tight crops.
 */
function blankRect(fb: Uint8Array, x: number, y: number, w: number, h: number): void {
  for (let py = 0; py < h; py += 1) {
    for (let px = 0; px < w; px += 1) {
      setPixel(fb, x + px, y + py, WHITE.r, WHITE.g, WHITE.b);
    }
  }
}

/**
 * Draws the FIGHT submenu's whole live text layer (4 move names, the "PP"
 * label, the highlighted move's own "x/y" PP digits, and its "TYPE/"+type-
 * name run) over whatever chrome (border+cursor arrow) the caller already
 * drew - `originX`/`originY` is `fightSubmenuWindow.x`/`.y`, the same patch
 * origin `battleScene.ts`'s harvest-blit already uses, so every origin
 * constant above stays patch-local and directly comparable to `tests/
 * fontNarrow.test.ts`'s own.
 */
export function drawFightSubmenuText(
  fb: Uint8Array,
  originX: number,
  originY: number,
  moveset: FightMoveset,
  cursor: 0 | 1 | 2 | 3,
): void {
  for (let i = 0; i < 4; i += 1) {
    const o = MOVE_NAME_ORIGINS[i]!;
    blankRect(fb, originX + o.x, originY + o.y - 1, 64, 16);
    drawText(fb, fontNarrow, charmap, moveset[i]!.name, originX + o.x, originY + o.y, NAME_PALETTE, NAME_COLORS);
  }

  const selected = moveset[cursor]!;
  const state = getCurrentPPToMaxPPState(selected.currentPP, selected.maxPP);
  const { palette: ppPalette, colors: ppColors } = ppColorsForState(state);

  blankRect(fb, originX + PP_LABEL_ORIGIN.x, originY + PP_LABEL_ORIGIN.y - 1, 32, 16);
  drawText(fb, fontNarrow, charmap, "PP", originX + PP_LABEL_ORIGIN.x, originY + PP_LABEL_ORIGIN.y, ppPalette, ppColors);

  blankRect(fb, originX + ROCK_SLIDE_PP_REMAINING_ORIGIN.x - 2, originY + ROCK_SLIDE_PP_REMAINING_ORIGIN.y - 1, 32, 16);
  drawGlyphCodes(
    fb,
    fontNormal,
    ppRemainingGlyphCodes(selected.currentPP, selected.maxPP),
    originX + ROCK_SLIDE_PP_REMAINING_ORIGIN.x,
    originY + ROCK_SLIDE_PP_REMAINING_ORIGIN.y,
    ppPalette,
    ppColors,
  );

  blankRect(fb, originX + TYPE_LABEL_ORIGIN.x, originY + TYPE_LABEL_ORIGIN.y - 1, 64, 16);
  drawText(fb, fontNarrow, charmap, "TYPE/", originX + TYPE_LABEL_ORIGIN.x, originY + TYPE_LABEL_ORIGIN.y, NAME_PALETTE, NAME_COLORS);
  const typeNameX = originX + TYPE_LABEL_ORIGIN.x + measureText(fontNarrow, charmap, "TYPE/");
  const typeName = TYPE_DISPLAY_NAMES[selected.type] ?? "???";
  drawText(fb, fontNormal, charmap, typeName, typeNameX, originY + TYPE_LABEL_ORIGIN.y, NAME_PALETTE, NAME_COLORS);
}
