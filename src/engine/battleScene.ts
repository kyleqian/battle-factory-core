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
// STATUS (honestly incomplete - see docs/battle-scene-notes.md's own §2/§6
// flags plus this session's own findings):
// 1. The settled composite (trace tick 1227 onward, before any widget slide)
//    IS byte-exact: battle-bg.json's `static` bg (scroll 0,0) +
//    trainer-pic-bug-catcher.json at corner (144,8) + trainer-pic-brendan-
//    back.json frame 3 at corner (48,48) + battle-window.json's bg0 tilemap
//    (scroll 0,0) reproduces the oracle's tick-1227 frame at 0/38400 exact
//    (verified this session, both by brute-force corner search AND
//    independently by a source derivation - battle_controller_opponent.c:
//    1306-1313 `xPos=176,yPos=(8-size)*4+40` with `centerToCornerVec=(-32,-32)`
//    for a 64x64 OAM shape - 176-32=144, 40-32=8; battle_controller_player.c:
//    2317-2318 `xPos=80,yPos=(8-size)*4+80` - 80-32=48, 80-32=48).
// 2. The BattleIntroSlide3 "streak" reveal (trace ticks ~1075-1226,
//    docs/battle-scene-notes.md §2) is NOT yet byte-exact. This session
//    confirmed the vertical WIN0-style reveal window's growth schedule
//    directly against oracle pixels (own dense per-tick brightness/edge
//    sweep, `windowRange` below) and found the mechanism the dossier
//    describes (a per-scanline horizontal BG shift, top/bottom halves
//    opposite sign, converging to 0 by tick 1226/1227, cross-faded via
//    BLDALPHA 8:8->0:16) is the right SHAPE - shifting `battle-bg.json`'s
//    `static` tilemap against itself (fixed unshifted copy blended with a
//    shifted copy, NOT the separate `entrySlide` asset, which this session
//    confirmed is unrelated art with zero pixel overlap with `static`) gets
//    close (exact at the tick-1227 boundary, converging correctly from
//    ~tick 1190 on) but is NOT exact for roughly tick 1075-1180 - most
//    likely the vertical window's own growth-rate formula (fit to a crude
//    brightness threshold, not RAM/register-confirmed) or an additional
//    per-scanline (not per-half) shift gradient this session didn't
//    isolate. `shiftTop`/`shiftBottom`/`windowRange`/`evaEvb` below are
//    this session's best-effort model, kept because it is closer to
//    correct than solid black and documents working formulas for the next
//    session - NOT asserted byte-exact. Concrete next step: RAM-probe
//    `gScanlineEffectRegBuffers`/`BLDALPHA`/`WIN0V` directly per-tick
//    (tools/probe/ram-probe.py) through this window rather than continuing
//    to fit pixels blind, and re-check whether OBJ (trainer sprites) are
//    also blend targets (BLDCNT lists `TGT2_BG3|TGT2_OBJ`) rather than
//    drawn full-bright throughout as this module currently does.
// 3. The party-status-summary ball-icon widgets' entrance slide (trace
//    ticks ~1230-1291, docs/battle-scene-notes.md §4) is not modeled - the
//    dossier itself flags this as not individually re-timed. This module
//    renders them only once settled (tick 1292 onward, pixel-verified
//    byte-exact per docs/battle-interface-assets.md), hidden before that.
//
// Everything else below (text print cadence, wait-cursor bob/idle cycle,
// widget final positions) IS byte-exact per the cited dossiers.

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

/** First trace tick any pixel is non-black (docs/battle-scene-notes.md §1). */
const FIRST_VISIBLE_TICK = 1075;
/** Trace tick the vertical window is first fully open (this session's own dense pixel sweep - see module doc point 2). */
const WINDOW_FULLY_OPEN_TICK = 1119;

/** Vertical reveal window [top, bottom) at trace tick `t` - a growing vertical slit centered on row 80, empirically fit against every-tick oracle pixels (see module doc point 2: WIN0V-style growth, not yet RAM-confirmed by this session). */
export function windowRange(t: number): { top: number; bottom: number } | null {
  if (t < FIRST_VISIBLE_TICK) return null;
  if (t >= WINDOW_FULLY_OPEN_TICK) return { top: 0, bottom: 160 };
  const k = t - FIRST_VISIBLE_TICK;
  return { top: Math.max(0, 80 - k), bottom: Math.min(160, 81 + k) };
}

/** Trace tick the per-scanline shift + BLDALPHA blend both reach their settled (0 shift, eva=0/evb=16) state - task destroyed, BattleIntroSlideEnd (docs/battle-scene-notes.md §2). */
const SLIDE_END_TICK = 1227;
/** Best-fit reference tick for the shift's linear ramp (this session's own multi-row fit - NOT the dossier's own tick-1106-anchored data[2] value, see module doc point 2). */
const SHIFT_REF_TICK = 1099;

/** Top-half (scanlines 0-79) per-scanline horizontal shift at trace tick `t` - see module doc point 2 (best-effort, not byte-exact). */
export function shiftTop(t: number): number {
  return t >= SLIDE_END_TICK ? 0 : -2 * (t - SHIFT_REF_TICK);
}
/** Bottom-half (scanlines 80-159) shift - opposite sign of shiftTop (see module doc point 2). */
export function shiftBottom(t: number): number {
  return t >= SLIDE_END_TICK ? 0 : 2 * (t - SHIFT_REF_TICK);
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
  return battleBg.palette[entry.palette]![idx] ?? null;
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

// --- §4: party-status-summary ball-icon widgets ------------------------

/** Trace tick the ball-icon widgets (both sides) are pixel-exact at their final settled position (docs/battle-interface-assets.md - "Ball-icon entrance slide settles at tick 1292 exactly"). Entrance slide (~1230-1291) is not modeled this session - hidden until settled (see module doc point 3). */
export const BALL_WIDGETS_SETTLED_TICK = 1292;

export interface BallIcon {
  x: number;
  y: number;
  state: string;
}

/** CreatePartyStatusSummarySprites corner formula (docs/battle-interface-assets.md): opponent `(26+10i, 32)`, player `(156+10i, 88)`, i=0-5. States hardcoded per this specific battle-1 trace's own verified slot contents (3v3, see that doc's verification table) - not derived generically. */
export function ballIcons(): BallIcon[] {
  const opponentStates = ["Empty", "Empty", "Empty", "Full", "Full", "Full"];
  const playerStates = ["Full", "Full", "Full", "Empty", "Empty", "Empty"];
  const icons: BallIcon[] = [];
  for (let i = 0; i < 6; i += 1) icons.push({ x: 26 + 10 * i, y: 32, state: opponentStates[i]! });
  for (let i = 0; i < 6; i += 1) icons.push({ x: 156 + 10 * i, y: 88, state: playerStates[i]! });
  return icons;
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

function drawBallIcons(fb: Uint8Array): void {
  drawBallStatusBar(fb, -24, 40, true);
  drawBallStatusBar(fb, 136, 96, false);
  for (const icon of ballIcons()) {
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

/** Best-effort (not byte-exact, see module doc point 2) render of the BattleIntroSlide3 reveal, ticks FIRST_VISIBLE_TICK..SLIDE_END_TICK-1. */
function drawSlideScene(fb: Uint8Array, t: number, win: { top: number; bottom: number }): void {
  const { eva, evb } = evaEvb(t);
  for (let y = win.top; y < win.bottom; y += 1) {
    const shift = y < 80 ? shiftTop(t) : shiftBottom(t);
    for (let x = 0; x < 240; x += 1) {
      const fixed = staticBgPixel(x, y);
      const shifted = staticBgPixel(x + shift, y);
      let c: RgbColor | null;
      if (fixed && shifted) {
        c = {
          r: Math.min(255, Math.round((fixed.r * eva + shifted.r * evb) / 16)),
          g: Math.min(255, Math.round((fixed.g * eva + shifted.g * evb) / 16)),
          b: Math.min(255, Math.round((fixed.b * eva + shifted.b * evb) / 16)),
        };
      } else {
        c = shifted ?? fixed;
      }
      if (c) setPixel(fb, x, y, c);
    }
  }
  // Sprites + window frame clipped to the same reveal window (drawn at full
  // brightness - module doc point 2 flags this as an open question: BLDCNT's
  // TGT2_BG3|TGT2_OBJ suggests OBJ should also blend while eva>0).
  const clip = (drawFn: (tmp: Uint8Array) => void): void => {
    const tmp = new Uint8Array(240 * 160 * 4);
    drawFn(tmp);
    for (let y = win.top; y < win.bottom; y += 1) {
      for (let x = 0; x < 240; x += 1) {
        const o = (y * 240 + x) * 4;
        if (tmp[o + 3] === 0) continue;
        fb[o] = tmp[o]!;
        fb[o + 1] = tmp[o + 1]!;
        fb[o + 2] = tmp[o + 2]!;
        fb[o + 3] = 255;
      }
    }
  };
  clip((tmp) => drawSpriteSheet(tmp, bugCatcher.tileset, bugCatcher.palette, OPPONENT_CORNER.x, OPPONENT_CORNER.y));
  clip((tmp) => drawSpriteSheet(tmp, brendanSettledTileset, brendan.palette, PLAYER_CORNER.x, PLAYER_CORNER.y));
  clip((tmp) => drawTileBg(tmp, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette));
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
  if (t >= BALL_WIDGETS_SETTLED_TICK) drawBallIcons(fb);
  drawMessageText(fb, textVisibleChars(t));
  const cursor = cursorState(t);
  if (cursor.visible) drawCursor(fb, cursor.yOffset);
}
