// S6 scene-assembly engine slice: the BATTLE-SCENE ASSEMBLY window
// (tools/compare/traces-groundtruth/battle1-scene-dense.json, trace ticks
// 1040-1295) - docs/battle-scene-notes.md's full dossier. Picks up where
// battleTransition.ts's exit-to-black fade holds solid black indefinitely
// (past trace tick ~1030); this module owns the screen from trace tick 1040
// through the settled first-action-menu-adjacent idle state, and must keep
// rendering correctly if ticked arbitrarily far past 1295 (the next slice's
// window starts mid-idle-cycle).
//
// Pure state: `elapsed` (0 = trace tick 1040, matching this window's own
// ground-truth trace) - every visual below is a pure function of the
// corresponding trace tick (`TICK0 + elapsed`), no phase enum needed (no
// player input is read anywhere in this window - the next A-press is the
// following slice's concern, trace tick 1420).
//
// STATUS: 3 of the 4 pieces of this window are now byte-exact against RAM
// ground truth (tools/probe/ram-probe.py watching gBattle_WIN0V,
// gTasks[0].data[0..5], the sGpuRegBuffer BLDCNT/BLDALPHA shadows, and
// gSprites[].{x,x2,y,flags} every tick 1073-1296 - see docs/battle-scene-
// notes.md §2 and PROGRESS.md for the resulting tables); the streak's pixel
// *color* is still not byte-exact - see point 2's "still open" paragraph
// below (tools/compare/traces/scene-assembly.json is NOT yet 256/256).
// 1. The settled composite (trace tick 1227 onward, before any widget
//    slide) is byte-exact (unchanged from #58: battle-bg.json's `static`
//    bg + both trainer pics at their source-derived corners + battle-
//    window.json's bg0 tilemap).
// 2. The BattleIntroSlide3 streak GEOMETRY (ticks 1075-1226) is now RAM-
//    exact: `gBattle_WIN0V`'s growth is TWO linear phases, not one
//    (`windowRange` below) - phase 1 (ticks 1075-1106, -0xFF/tick) and a
//    second, 4x-faster phase (ticks 1107-1118, -0x3FC/tick) that #58 could
//    see in pixels but hadn't RAM-confirmed; the window is fully open at
//    tick 1118, not 1119. `shiftTop`/`shiftBottom` mirror
//    `gTasks[0].data[2]` exactly (RAM-confirmed 240 constant through tick
//    1106 then -2/tick to 0 by tick 1226, DMA'd into `REG_BG3HOFS` per
//    scanline - `sIntroScanlineParams16Bit`, battle_main.c:250-253).
//    STILL OPEN: the streak's *color*. RAM confirms `BLDCNT =
//    TGT1_BG1|BLEND|TGT2_BG3|TGT2_OBJ` (0x1842) literally - OBJ (both
//    trainer pics) genuinely are blend targets alongside BG3, resolving
//    #58's question there - but TGT1 (BG1)'s actual content this session
//    could NOT pin down: `battle-bg.json`'s `entrySlide` tileset (scrolled
//    by the RAM-confirmed `gBattle_BG1_X`, `+=8`/tick unconditionally from
//    task start) was the leading hypothesis, but every one of its tilemap
//    entries in the sampled window reference **palette bank 4, which
//    `extract-battle-bg.ts` never captured** (`battle-bg.json`'s top-level
//    `palette` array only has banks 0/1/2) - so every sampled pixel came
//    back transparent and the hypothesis was numerically untestable this
//    session (falls back identically to the "BG1 is black" approximation
//    below). `drawSlideScene` therefore still renders the streak as pure
//    brightness scaling (`evb/16`) of the per-scanline-shifted BG3 content
//    plus the (unshifted) trainer OBJs, with no TGT1 contribution - closer
//    to the real mechanism than #58's fixed/shifted cross-fade (which
//    never fit either target), but still not byte-exact (`npm run compare
//    -- tools/compare/traces/scene-assembly.json` diffs every frame
//    1075-1226, growing from ~700px to tens of thousands as the window
//    opens - see PROGRESS.md for exact counts). Next step: re-extract
//    `battle-bg.json` with palette bank 4 included, then re-test the
//    entrySlide-as-TGT1 hypothesis (the extraction, not the geometry, is
//    the blocker).
// 3. The party-status-summary ball-icon + diagonal-bar widgets' entrance
//    slide (ticks ~1228-1291): RAM-probed directly per-tick (`sprite.x2`
//    for the bar + all 12 ball-icon sprites, identified by matching their
//    settled `(x, y)` against docs/battle-interface-assets.md's known
//    corners). The player-side widgets are created at tick 1228, the
//    opponent-side at tick 1231 (not simultaneous, confirming the dossier's
//    §4 suspicion); each of the 14 sprites' `x2` sequence is baked verbatim
//    as a per-tick table below (`PLAYER_BAR_X2` etc.) rather than
//    reconstructed from `SpriteCB_StatusSummaryBar_Enter`/
//    `SpriteCB_StatusSummaryBalls_Enter`'s source formulas: the source
//    formulas (confirmed by reading `battle_interface.c`) predict the same
//    shape but land 1-2 ticks off the RAM truth on a few icons (likely a
//    controller-command-handshake frame this module doesn't model) - the
//    table is the ground truth, the source is corroborating shape only.

import type { RgbColor } from "./bg.ts";
import { drawText, type FontData } from "./font.ts";

import battleBgAsset from "../assets/gen/battle-bg.json" with { type: "json" };
import battleWindowAsset from "../assets/gen/battle-window.json" with { type: "json" };
import bugCatcherAsset from "../assets/gen/trainer-pic-bug-catcher.json" with { type: "json" };
import brendanAsset from "../assets/gen/trainer-pic-brendan-back.json" with { type: "json" };
import ballDisplayAsset from "../assets/gen/battle-interface-ball-display.json" with { type: "json" };
import battleHealthboxAsset from "../assets/gen/battle-healthbox.json" with { type: "json" };
import downArrowAsset from "../assets/gen/battle-interface-down-arrow.json" with { type: "json" };
import fontNormalData from "../data/gen/font-normal.json" with { type: "json" };
import charmapData from "../data/gen/charmap.json" with { type: "json" };

interface Tileset {
  columns: number;
  rows: number;
  tiles: number[][];
}
interface TilemapEntry {
  tile: number;
  hFlip: boolean;
  vFlip: boolean;
  palette: number;
}
interface Tilemap {
  width: number;
  height: number;
  entries: TilemapEntry[];
}
interface BattleBgAsset {
  palette: RgbColor[][];
  static: { tileset: Tileset; tilemap: Tilemap };
  entrySlide: { tileset: Tileset; tilemap: Tilemap };
}
interface BattleWindowAsset {
  tileset: Tileset;
  tilemap: Tilemap;
  palette: RgbColor[][];
  textPalette: RgbColor[];
}
interface TrainerPicAsset {
  tileset: Tileset;
  palette: RgbColor[];
  yOffsetPx: number;
}
interface BrendanAsset {
  frameCount: number;
  tileset: Tileset;
  palette: RgbColor[];
  yOffsetPx: number;
}
interface BallDisplayAsset {
  states: string[];
  tileset: Tileset;
  palette: RgbColor[];
}
interface DownArrowAsset {
  width: number;
  height: number;
  indices: number[][];
  sourceRowOffsets: number[];
  blitWidth: number;
  blitHeight: number;
}
interface BallStatusBarAsset {
  tileset: Tileset;
  palette: RgbColor[];
}

const battleBg = battleBgAsset as BattleBgAsset;
const battleWindow = battleWindowAsset as BattleWindowAsset;
const bugCatcher = bugCatcherAsset as TrainerPicAsset;
const brendan = brendanAsset as BrendanAsset;
const ballDisplay = ballDisplayAsset as BallDisplayAsset;
const downArrow = downArrowAsset as DownArrowAsset;
const ballStatusBar = (battleHealthboxAsset as { ballStatusBar: BallStatusBarAsset }).ballStatusBar;
const font = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);

/** This window's own trace-tick origin - `elapsed` 0 == trace tick 1040 (tools/compare/traces-groundtruth/battle1-scene-dense.json's own first captured frame). */
export const TICK0 = 1040;

export interface BattleSceneState {
  /** Ticks since trace tick 1040. No phase split - every visual is a pure function of `TICK0 + elapsed` (see module doc); this must keep advancing (and rendering correctly) indefinitely past tick 1295, since the next slice's window starts mid-idle-cycle. */
  elapsed: number;
}

export const INITIAL_BATTLE_SCENE_STATE: BattleSceneState = { elapsed: 0 };

export function advanceBattleScene(state: BattleSceneState): BattleSceneState {
  return { elapsed: state.elapsed + 1 };
}

// --- §2: BattleIntroSlide3 vertical reveal window + per-scanline shift ----

/** First trace tick any pixel is non-black - `gBattle_WIN0V` starts changing this tick (RAM-confirmed, module doc point 2). */
const FIRST_VISIBLE_TICK = 1075;
/** Trace tick `gBattle_WIN0V`'s top edge hits 0 - the window is fully open from here on (RAM: `win0v` reads `0x00A1` from tick 1118 onward, module doc point 2 - one tick earlier than #58's pixel-fit estimate of 1119). */
const WINDOW_FULLY_OPEN_TICK = 1118;
/** Trace tick `BattleIntroSlide3`'s tState 2->3 transition happens (`gBattle_WIN0V`'s first-phase decrement stops, second phase begins the same tick) - RAM-confirmed (`win0v` top byte hits 0x30 here). */
const WINDOW_PHASE2_START_TICK = 1106;

/**
 * Vertical reveal window [top, bottom) at trace tick `t` - RAM-confirmed
 * two-phase growth of `gBattle_WIN0V` (module doc point 2): phase 1 (ticks
 * 1075-1106) shrinks by 1px/edge/tick (`WIN0V -= 0xFF`), phase 2 (ticks
 * 1107-1118) by 4px/edge/tick (`WIN0V -= 0x3FC`) until the top edge hits 0.
 */
export function windowRange(t: number): { top: number; bottom: number } | null {
  if (t < FIRST_VISIBLE_TICK) return null;
  if (t >= WINDOW_FULLY_OPEN_TICK) return { top: 0, bottom: 160 };
  if (t <= WINDOW_PHASE2_START_TICK) {
    const k = t - (FIRST_VISIBLE_TICK - 1);
    return { top: 80 - k, bottom: 81 + k };
  }
  const d = t - WINDOW_PHASE2_START_TICK;
  return { top: Math.max(0, 48 - 4 * d), bottom: Math.min(160, 113 + 4 * d) };
}

/** Trace tick the per-scanline shift + BLDALPHA blend both reach their settled (0 shift, eva=0/evb=16) state - task destroyed, BattleIntroSlideEnd (docs/battle-scene-notes.md §2; RAM-confirmed: `gTasks[0]` is destroyed exactly this tick). */
const SLIDE_END_TICK = 1227;
/** Trace tick `gTasks[0].data[2]` first decrements below its initial 240 (RAM-confirmed: `gScanlineEffectRegBuffers`' active half holds a constant leftover 240 for every tick from `FIRST_VISIBLE_TICK` through this tick - not yet written by this task - then decrements by exactly 2/tick starting the next tick). */
const SHIFT_DECAY_START_TICK = 1107;

/** `gTasks[0].data[2]` (as DMA'd into `gScanlineEffectRegBuffers`) at trace tick `t` - RAM-confirmed exact: a constant 240 for ticks `FIRST_VISIBLE_TICK`-1106 (leftover from before this task writes it), then -2/tick from tick 1107, reaching 0 at tick 1226 (module doc point 2). DMA'd into `REG_BG3HOFS` per scanline: top half (0-79) gets `+data[2]`, bottom half (80-159) gets `-data[2]` (RAM-confirmed uniform per half, no additional gradient). */
function scanlineShiftMagnitude(t: number): number {
  if (t < FIRST_VISIBLE_TICK || t >= SLIDE_END_TICK) return 0;
  if (t < SHIFT_DECAY_START_TICK) return 240;
  return 240 - 2 * (t - WINDOW_PHASE2_START_TICK);
}
/** Top-half (scanlines 0-79) per-scanline horizontal shift at trace tick `t` (RAM-confirmed, see module doc point 2). */
export function shiftTop(t: number): number {
  return scanlineShiftMagnitude(t);
}
/** Bottom-half (scanlines 80-159) shift - opposite sign of shiftTop (RAM-confirmed, see module doc point 2). */
export function shiftBottom(t: number): number {
  const magnitude = scanlineShiftMagnitude(t);
  return magnitude === 0 ? 0 : -magnitude;
}

/** BLDALPHA (EVA, EVB) at trace tick `t` - docs/battle-scene-notes.md §2 point 4, RAM-confirmed schedule: 8:8 constant through tick 1138, then 8 steps of 6 ticks each (EVA-1/EVB+1 per step) from tick 1139, reaching 0:16 at tick 1181 and holding. */
export function evaEvb(t: number): { eva: number; evb: number } {
  if (t < 1139) return { eva: 8, evb: 8 };
  const step = Math.min(8, Math.floor((t - 1139) / 6) + 1);
  return { eva: 8 - step, evb: 8 + step };
}

const BG_PERIOD = battleBg.static.tilemap.width * 8;

function staticBgPixel(mapX: number, mapY: number): RgbColor | null {
  const tilemap = battleBg.static.tilemap;
  const tileRow = Math.floor(mapY / 8);
  const inTileY = ((mapY % 8) + 8) % 8;
  const wrappedX = (((mapX % BG_PERIOD) + BG_PERIOD) % BG_PERIOD);
  const tileCol = Math.floor(wrappedX / 8);
  const inTileX = wrappedX % 8;
  const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
  if (!entry) return null;
  const tile = battleBg.static.tileset.tiles[entry.tile];
  if (!tile) return null;
  const sx = entry.hFlip ? 7 - inTileX : inTileX;
  const sy = entry.vFlip ? 7 - inTileY : inTileY;
  const idx = tile[sy * 8 + sx]!;
  if (idx === 0) return null;
  return battleBg.palette[entry.palette]?.[idx] ?? null;
}

// --- §3: intro text ---------------------------------------------------

const LINE1 = "BUG CATCHER DESTIN";
const LINE2 = "would like to battle!";
/** Total printable characters across both lines (docs/battle-scene-notes.md §3.2 - 1 tick/char including space ticks, `\n` free). */
export const TEXT_TOTAL_CHARS = LINE1.length + LINE2.length;
/** First trace tick the first glyph ("B") is drawn (docs/battle-scene-notes.md §1/§3.2). */
export const TEXT_START_TICK = 1234;

/** Visible character count (0..TEXT_TOTAL_CHARS) across both lines combined at trace tick `t`. */
export function textVisibleChars(t: number): number {
  if (t < TEXT_START_TICK) return 0;
  return Math.min(TEXT_TOTAL_CHARS, t - TEXT_START_TICK + 1);
}

// --- §3.3: wait-cursor bob / 36-tick idle cycle ------------------------

/** First trace tick the down-arrow prompt cursor draws (docs/battle-scene-notes.md §3.3 - one tick after `\p` is consumed at text-complete). */
export const CURSOR_START_TICK = 1274;
const CURSOR_DEST_X = 123;
/** Empirically re-derived this session (direct oracle brute-force match, 37/37 exact at ticks 1274/1283/1292/1295): destY = BASE - sDownArrowYCoords[idx], NOT BASE + offset as docs/battle-interface-assets.md's own "destY = 135 + offset" phrasing states - that doc's formula and this one are numerically equivalent up to a base/sign convention, but 135+offset alone (offset from CURSOR_Y_OFFSETS below) does not match; 137-offset does. */
const CURSOR_DEST_Y_BASE = 137;
/** sDownArrowYCoords (src/text.c:75) - 4-phase, 9 ticks/phase, 36-tick period (docs/battle-interface-assets.md). */
const CURSOR_Y_OFFSETS = [0, 1, 2, 1] as const;

/** Whether the wait-cursor is drawn at trace tick `t`, and its dest-Y offset phase if so. */
export function cursorState(t: number): { visible: boolean; yOffset: number } {
  if (t < CURSOR_START_TICK) return { visible: false, yOffset: 0 };
  const phase = Math.floor((t - CURSOR_START_TICK) / 9) % CURSOR_Y_OFFSETS.length;
  return { visible: true, yOffset: CURSOR_Y_OFFSETS[phase]! };
}

// --- §4: party-status-summary ball-icon + diagonal-bar widget entrance -----
// RAM-probed directly (tools/probe/ram-probe.py: gSprites[].{x,x2,y,flags}
// every tick 1073-1296, identifying each of the 14 sprites - 2 diagonal
// bars + 12 ball icons - by matching settled (x,y) against docs/battle-
// interface-assets.md's known corners). x2 is each sprite's own secondary
// OAM x-offset (SpriteCB_StatusSummaryBar_Enter/SpriteCB_StatusSummaryBalls_
// Enter, battle_interface.c) - baked verbatim per tick since the source
// formula lands 1-2 ticks off this RAM truth on a few icons (module doc
// point 3). Tables index from PLAYER_CREATE_TICK/OPP_CREATE_TICK (RAM-
// confirmed: player-side widgets first exist/visible at 1228, opponent-side
// at 1231 - NOT simultaneous); every table holds a full run through tick
// 1292 (all 14 have settled to x2=0 by then, matching docs/battle-
// interface-assets.md's "settles at tick 1292 exactly").

/** Trace tick the player-side bar + all 6 player ball icons are first created/visible (RAM-confirmed). */
const PLAYER_CREATE_TICK = 1228;
/** Trace tick the opponent-side bar + all 6 opponent ball icons are first created/visible (RAM-confirmed - 3 ticks after the player side, not simultaneous). */
const OPP_CREATE_TICK = 1231;
/** Trace tick every widget's entrance slide has settled (docs/battle-interface-assets.md). */
export const BALL_WIDGETS_SETTLED_TICK = 1292;

const PLAYER_BAR_X2 = [95, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0];
const OPP_BAR_X2 = [-95, -90, -85, -80, -75, -70, -65, -60, -55, -50, -45, -40, -35, -30, -25, -20, -15, -10, -5, 0];
const PLAYER_ICON_X2: readonly number[][] = [
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
];
const OPP_ICON_X2: readonly number[][] = [
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-117, -111, -102, -90, -75, -57, -36, -12, 0],
];

function tableX2(table: readonly number[], createTick: number, t: number): number {
  if (t < createTick) return 0;
  const idx = t - createTick;
  return idx < table.length ? table[idx]! : 0;
}

export interface BallIcon {
  x: number;
  y: number;
  state: string;
  visible: boolean;
}

/** CreatePartyStatusSummarySprites corner formula (docs/battle-interface-assets.md): opponent `(26+10i, 32)`, player `(156+10i, 88)`, i=0-5, offset by each icon's own `x2` entrance slide (RAM-confirmed tables above). States hardcoded per this specific battle-1 trace's own verified slot contents (3v3, see that doc's verification table) - not derived generically. */
export function ballIcons(t: number): BallIcon[] {
  const opponentStates = ["Empty", "Empty", "Empty", "Full", "Full", "Full"];
  const playerStates = ["Full", "Full", "Full", "Empty", "Empty", "Empty"];
  const icons: BallIcon[] = [];
  for (let i = 0; i < 6; i += 1) {
    icons.push({
      x: 26 + 10 * i + tableX2(OPP_ICON_X2[i]!, OPP_CREATE_TICK, t),
      y: 32,
      state: opponentStates[i]!,
      visible: t >= OPP_CREATE_TICK,
    });
  }
  for (let i = 0; i < 6; i += 1) {
    icons.push({
      x: 156 + 10 * i + tableX2(PLAYER_ICON_X2[i]!, PLAYER_CREATE_TICK, t),
      y: 88,
      state: playerStates[i]!,
      visible: t >= PLAYER_CREATE_TICK,
    });
  }
  return icons;
}

/** Diagonal-bar background corners at trace tick `t` - `ballStatusBar`'s own settled corners (docs module doc point 1: opponent `(-24,40)` h-flipped, player `(136,96)`) offset by the bar sprite's own `x2` entrance slide (RAM-confirmed tables above - the bar is itself `gSprites[summaryBarSpriteId]`, same mechanism as the ball icons). */
export function ballStatusBarPositions(t: number): { opponent: { x: number; visible: boolean }; player: { x: number; visible: boolean } } {
  return {
    opponent: { x: -24 + tableX2(OPP_BAR_X2, OPP_CREATE_TICK, t), visible: t >= OPP_CREATE_TICK },
    player: { x: 136 + tableX2(PLAYER_BAR_X2, PLAYER_CREATE_TICK, t), visible: t >= PLAYER_CREATE_TICK },
  };
}

// --- rendering ----------------------------------------------------------

function setPixel(fb: Uint8Array, x: number, y: number, c: RgbColor): void {
  if (x < 0 || x >= 240 || y < 0 || y >= 160) return;
  const o = (y * 240 + x) * 4;
  fb[o] = c.r;
  fb[o + 1] = c.g;
  fb[o + 2] = c.b;
  fb[o + 3] = 255;
}

function drawSpriteSheetTile(fb: Uint8Array, tileset: Tileset, palette: RgbColor[], tileIndex: number, ox: number, oy: number): void {
  const tile = tileset.tiles[tileIndex];
  if (!tile) return;
  for (let py = 0; py < 8; py += 1) {
    for (let px = 0; px < 8; px += 1) {
      const idx = tile[py * 8 + px]!;
      if (idx === 0) continue;
      const c = palette[idx];
      if (!c) continue;
      setPixel(fb, ox + px, oy + py, c);
    }
  }
}

function drawSpriteSheet(fb: Uint8Array, tileset: Tileset, palette: RgbColor[], ox: number, oy: number): void {
  for (let ty = 0; ty < tileset.rows; ty += 1) {
    for (let tx = 0; tx < tileset.columns; tx += 1) {
      drawSpriteSheetTile(fb, tileset, palette, ty * tileset.columns + tx, ox + tx * 8, oy + ty * 8);
    }
  }
}

function drawTileBg(fb: Uint8Array, tileset: Tileset, tilemap: Tilemap, subpalettes: RgbColor[][]): void {
  for (let screenY = 0; screenY < 160; screenY += 1) {
    const tileRow = Math.floor(screenY / 8);
    const inTileY = screenY % 8;
    for (let screenX = 0; screenX < 240; screenX += 1) {
      const tileCol = Math.floor(screenX / 8);
      const inTileX = screenX % 8;
      const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
      if (!entry) continue;
      const tile = tileset.tiles[entry.tile];
      if (!tile) continue;
      const sx = entry.hFlip ? 7 - inTileX : inTileX;
      const sy = entry.vFlip ? 7 - inTileY : inTileY;
      const idx = tile[sy * 8 + sx]!;
      if (idx === 0) continue;
      const c = subpalettes[entry.palette]?.[idx];
      if (!c) continue;
      setPixel(fb, screenX, screenY, c);
    }
  }
}

const BRENDAN_FRAME_ROWS = brendan.tileset.rows / brendan.frameCount;
/** Frame index 3 (of 4) is the settled slide-in pose (docs trainer-pic extractor comment) - the other 3 are the send-out throw animation, out of scope for this window. */
const BRENDAN_SETTLED_FRAME = 3;
const brendanSettledTileset: Tileset = {
  columns: brendan.tileset.columns,
  rows: BRENDAN_FRAME_ROWS,
  tiles: brendan.tileset.tiles.slice(
    BRENDAN_SETTLED_FRAME * BRENDAN_FRAME_ROWS * brendan.tileset.columns,
    (BRENDAN_SETTLED_FRAME + 1) * BRENDAN_FRAME_ROWS * brendan.tileset.columns,
  ),
};

const OPPONENT_CORNER = { x: 144, y: 8 };
const PLAYER_CORNER = { x: 48, y: 48 };
const MESSAGE_PALETTE = battleWindow.palette[0]!;
const MESSAGE_TEXT_COLORS = { fg: 1, bg: 15, shadow: 6 };
const LINE1_ORIGIN = { x: 16, y: 121 };
const LINE2_ORIGIN = { x: 16, y: 137 };

function drawMessageText(fb: Uint8Array, chars: number): void {
  if (chars <= 0) return;
  const line1 = LINE1.slice(0, Math.min(chars, LINE1.length));
  drawText(fb, font, charmap, line1, LINE1_ORIGIN.x, LINE1_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  if (chars > LINE1.length) {
    const line2 = LINE2.slice(0, chars - LINE1.length);
    drawText(fb, font, charmap, line2, LINE2_ORIGIN.x, LINE2_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  }
}

function drawCursor(fb: Uint8Array, yOffset: number): void {
  const destY = CURSOR_DEST_Y_BASE - yOffset;
  for (let py = 0; py < downArrow.blitHeight; py += 1) {
    for (let px = 0; px < downArrow.blitWidth; px += 1) {
      const idx = downArrow.indices[py]?.[px] ?? 0;
      if (idx === 0) continue;
      const c = MESSAGE_PALETTE[idx];
      if (!c) continue;
      setPixel(fb, CURSOR_DEST_X + px, destY + py, c);
    }
  }
}

function ballStateTileIndex(state: string): number {
  return Math.max(0, ballDisplay.states.indexOf(state));
}

/** gBattleInterface_BallStatusBarGfx (`ball_status_bar.png`), the diagonal bar the ball icons sit on - corners brute-force-matched against the oracle this session: opponent (-24,40) h-flipped, player (136,96) unflipped, both 212/212 exact. */
function drawBallStatusBar(fb: Uint8Array, ox: number, oy: number, hFlip: boolean): void {
  const { tileset, palette } = ballStatusBar;
  for (let ty = 0; ty < tileset.rows; ty += 1) {
    for (let tx = 0; tx < tileset.columns; tx += 1) {
      const tileCol = hFlip ? tileset.columns - 1 - tx : tx;
      const tile = tileset.tiles[ty * tileset.columns + tileCol];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          const sx = hFlip ? 7 - px : px;
          const idx = tile[py * 8 + sx]!;
          if (idx === 0) continue;
          const c = palette[idx];
          if (!c) continue;
          setPixel(fb, ox + tx * 8 + px, oy + ty * 8 + py, c);
        }
      }
    }
  }
}

function drawBallIcons(fb: Uint8Array, t: number): void {
  const bars = ballStatusBarPositions(t);
  if (bars.opponent.visible) drawBallStatusBar(fb, bars.opponent.x, 40, true);
  if (bars.player.visible) drawBallStatusBar(fb, bars.player.x, 96, false);
  for (const icon of ballIcons(t)) {
    if (!icon.visible) continue;
    drawSpriteSheetTile(fb, ballDisplay.tileset, ballDisplay.palette, ballStateTileIndex(icon.state), icon.x, icon.y);
  }
}

/** The settled (post-tick-1227) composite: static bg + both trainer pics + the window frame - byte-exact against the oracle (see module doc point 1). */
function drawSettledScene(fb: Uint8Array): void {
  drawTileBg(fb, battleBg.static.tileset, battleBg.static.tilemap, battleBg.palette);
  drawSpriteSheet(fb, bugCatcher.tileset, bugCatcher.palette, OPPONENT_CORNER.x, OPPONENT_CORNER.y);
  drawSpriteSheet(fb, brendanSettledTileset, brendan.palette, PLAYER_CORNER.x, PLAYER_CORNER.y);
  drawTileBg(fb, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
}

/**
 * Render of the BattleIntroSlide3 reveal, ticks
 * FIRST_VISIBLE_TICK..SLIDE_END_TICK-1 (NOT byte-exact - see module doc
 * point 2's "still open" note). RAM confirms `BLDCNT =
 * TGT1_BG1|BLEND|TGT2_BG3|TGT2_OBJ`: TGT1 is BG1. This module approximates
 * BG1 as contributing black (attempted using `battle-bg.json`'s
 * `entrySlide` tileset - scrolled via the RAM-confirmed `gBattle_BG1_X` -
 * as BG1's real content, but `entrySlide` references palette bank 4, which
 * was never extracted, so every sampled pixel came back empty and the
 * result was numerically identical to the black approximation; a future
 * session needs to re-extract `battle-bg.json` with that bank before this
 * is worth revisiting). TGT2 is the per-scanline-shifted BG3 (`static`)
 * with both trainer OBJs (RAM-confirmed real blend targets, scaled the
 * same as BG3) drawn on top of it, unshifted. The window frame (BG0) is
 * neither blend target, so it draws at full brightness, unshifted, on top.
 */
function drawSlideScene(fb: Uint8Array, t: number, win: { top: number; bottom: number }): void {
  const { evb } = evaEvb(t);
  const scale = (v: number): number => Math.min(255, Math.round((v * evb) / 16));
  for (let y = win.top; y < win.bottom; y += 1) {
    const shift = y < 80 ? shiftTop(t) : shiftBottom(t);
    for (let x = 0; x < 240; x += 1) {
      const c = staticBgPixel(x + shift, y);
      if (c) setPixel(fb, x, y, { r: scale(c.r), g: scale(c.g), b: scale(c.b) });
    }
  }
  const clip = (drawFn: (tmp: Uint8Array) => void, brighten: boolean): void => {
    const tmp = new Uint8Array(240 * 160 * 4);
    drawFn(tmp);
    for (let y = win.top; y < win.bottom; y += 1) {
      for (let x = 0; x < 240; x += 1) {
        const o = (y * 240 + x) * 4;
        if (tmp[o + 3] === 0) continue;
        fb[o] = brighten ? scale(tmp[o]!) : tmp[o]!;
        fb[o + 1] = brighten ? scale(tmp[o + 1]!) : tmp[o + 1]!;
        fb[o + 2] = brighten ? scale(tmp[o + 2]!) : tmp[o + 2]!;
        fb[o + 3] = 255;
      }
    }
  };
  clip((tmp) => drawSpriteSheet(tmp, bugCatcher.tileset, bugCatcher.palette, OPPONENT_CORNER.x, OPPONENT_CORNER.y), true);
  clip((tmp) => drawSpriteSheet(tmp, brendanSettledTileset, brendan.palette, PLAYER_CORNER.x, PLAYER_CORNER.y), true);
  clip((tmp) => drawTileBg(tmp, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette), false);
}

/** Renders the full battle-scene-assembly frame for `state` (elapsed since TICK0). */
export function renderBattleScene(fb: Uint8Array, state: BattleSceneState): void {
  const t = TICK0 + state.elapsed;
  const win = windowRange(t);
  if (!win) return; // solid black
  if (t < SLIDE_END_TICK) {
    drawSlideScene(fb, t, win);
    return;
  }
  drawSettledScene(fb);
  drawBallIcons(fb, t);
  drawMessageText(fb, textVisibleChars(t));
  const cursor = cursorState(t);
  if (cursor.visible) drawCursor(fb, cursor.yOffset);
}
