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
// STATUS (updated this session - see PROGRESS.md #64): GAP B (the widget
// entrance window, point 3 below) is now resolved - the same systemic
// one-tick render lag GAP A found (#63) turned out to apply here too, plus
// the opponent-side x2 tables had been missing each icon's own flat-delay
// prefix since #60/#62 (see point 3). scene-assembly.json 104/256 (was
// 41/256). Two named gaps remain, both untouched this session: GAP A (the
// streak window's blend-arithmetic residual, ticks 1075-1226, #63's next
// probe) and one narrow 22px residual at trace tick 1229 specifically
// (point 3's own note - a further one-tick visibility delay fixes 1229 but
// breaks the opponent side's tick 1232 the same way, so it isn't a shared
// per-side correction; not chased further this session). tools/compare/
// traces/scene-assembly.json is NOT yet 256/256.
// 1. The settled composite (trace tick 1227 onward, before any widget
//    slide) is byte-exact (unchanged from #58: battle-bg.json's `static`
//    bg + both trainer pics at their source-derived corners + battle-
//    window.json's bg0 tilemap).
// 2. The BattleIntroSlide3 streak (ticks 1075-1226): GEOMETRY is now pixel-
//    exact. This session found a systemic ONE-TICK RENDER LAG affecting
//    every internal register this task drives - the frame captured for
//    trace tick `t` reflects the task's own state as of tick `t-1`, not `t`
//    (task writes registers this tick; HBlank DMA/VBlank copy shows them to
//    the display next tick). Confirmed three independent ways: (a)
//    `windowRange` - scanning the oracle's own captures tick-by-tick for
//    the first/last non-black row (unambiguous ground truth, no pixel
//    aliasing possible) shows the window is exactly 1px (row 80 only) at
//    tick 1075, one tick's growth *behind* the naive `gBattle_WIN0V` RAM
//    reading; the phase-1/phase-2 boundary and full-open tick are each one
//    later too (1107/1108/1119, not 1106/1107/1118 - see the corrected
//    constants below). (b) `scanlineShiftMagnitude` - the actual DMA'd
//    `gScanlineEffectRegBuffers` row-0 content (RAM-probed directly, not
//    just `data[2]`'s own value) is 2px larger at a fixed tick than the
//    naive-pivot formula predicted, exactly matching the same one-tick-
//    later pivot. (c) `bg1X` - `gBattle_BG1_X` (RAM-probed) at tick `t-1`
//    is what a fixed-column pixel search matches, not tick `t`'s own value.
//    LAYER MODEL (also resolved this session, was previously entirely
//    unmodeled): `BLDCNT = TGT1_BG1|BLEND|TGT2_BG3|TGT2_OBJ` (0x1842,
//    RAM-confirmed) with BG1 = `entrySlide` (source: `DrawBattleEntryBackground`'s
//    Frontier branch loads it to `BG_CHAR_ADDR(1)`/`BG_SCREEN_ADDR(28)`,
//    matching BG1's own `gBattleBgTemplates` charBase/mapBase) and BG3 =
//    `static` (mapBase 26, matching `DrawMainBattleBackground`). BG1 sits at
//    OAM-scale priority 0 (frontmost), BG3 at priority 3 (backmost), both
//    trainer OBJs at priority 2 (`gOamData_BattleSprite{Player,Opponent}Side`,
//    `battle_main.c:274-301`) - so BG1 is always the topmost layer wherever
//    opaque. Pixel-sampling proved **neither trainer OBJ is ever actually
//    visible during the reveal** (both settled-corner rects show plain
//    background at every sampled tick 1075-1220, only becoming the real
//    trainer pics at the tick-1227 settle) - so TGT2 in practice is BG3
//    alone; `BLDCNT`'s `TGT2_OBJ` bit is real but never engages here. BG3
//    gets the per-scanline HOFS shift (`sIntroScanlineParams16Bit` targets
//    `&REG_BG3HOFS` literally, `battle_main.c:250-253` - not BG1); BG1
//    scrolls uniformly via the ordinary whole-frame `gBattle_BG1_X` write.
//    Blend only engages where BG1 (TGT1) is opaque; elsewhere BG3 draws raw.
//    STILL OPEN, next step: at a pixel confirmed to need BG1 content (tick
//    1150, x=11, y=40 - oracle shows a warm/skin-tone streak color where
//    this model still shows plain white BG3), the math is inconsistent:
//    with the modeled `evaEvb(1150)` = {eva:6, evb:10} and a white (255)
//    backdrop, NO valid BG1 color (r,g,b in [0,255]) can blend down to the
//    observed ~123/90/82 - the minimum reachable value is `255*evb/16` ≈
//    159, already above the target. Either the BLDALPHA ramp's tick anchor
//    (1139) needs the same one-tick-later correction as the window/shift
//    above (untested), or `entrySlide`'s mapping to this exact pixel is
//    still wrong (the extracted tilemap's only non-blank tiles are at tile-
//    rows 8-13 / mapY 64-111, nowhere near mapY=40, under the current
//    `bg1X` - so either BG1_Y isn't really pinned at 0 the way RAM suggested,
//    or this specific pixel comes from something this module doesn't model
//    yet). Next action: RAM-probe the literal `BLDALPHA` register value
//    (not the derived `evaEvb` schedule) alongside `gScanlineEffectRegBuffers`
//    for a handful of ticks in 1140-1180, cross-checked against the exact
//    pixel this paragraph names, before touching the ramp constants again.
// 3. The party-status-summary ball-icon + diagonal-bar widgets' entrance
//    slide (ticks ~1228-1291): RESOLVED this session (#64; #60/#62/#63 each
//    left this open - see PROGRESS.md for the full account). Two independent
//    bugs, both found by RAM-probing `gSprites[].{invisible, x2, oam.attr2}`
//    directly per tick for the 14 identified sprite indices (2 bars + 12
//    icons; identification method: match settled `(x, y)` against docs/
//    battle-interface-assets.md's known corners, same as #60/#62 banked):
//    (a) `invisible` and `oam.attr2` (tileNum) never actually change after
//    creation for any of the 14 sprites - #62's "tile swap" and "invisible
//    toggle" theories were both wrong shapes, there is no separate
//    visibility trigger to find. (b) the real cause is the SAME systemic
//    one-tick render lag GAP A found (point 2 above): pixel-ground-truthing
//    the oracle's own captures directly (not just trusting the RAM-baked
//    `x2` tables at face value) shows the displayed frame at trace tick `t`
//    reflects each sprite's `x2` as of RAM tick `t-1`, confirmed exactly at
//    the player bar (tick 1230's oracle edge matches the table's tick-1229
//    value, not 1230's own). `ballIcons`/`ballStatusBarPositions` now render
//    at `t - 1` uniformly (both the table lookup AND the visibility gate -
//    #62's blanket-shift attempt broke on exactly this: it shifted only the
//    table index while leaving the create-tick comparison unshifted,
//    desyncing the two). Separately, the OPP_ICON_X2 tables themselves
//    (baked in #60/#62) had been built from only the sliding tail of each
//    icon's RAM `x2` history, missing the per-icon flat-delay prefix
//    (`SpriteCB_StatusSummaryBalls_Enter`'s `data[1]` countdown, `data[1] =
//    (6-i)*7+10` per source) before the slide starts - every opponent icon
//    was starting its slide 10-54 ticks too early. Rebuilt all 14 tables
//    directly from RAM (`tools/probe/ram-probe.py`, full flat prefix
//    included) rather than reconstructing from the source formula (same
//    "RAM table is ground truth, source is shape-only corroboration"
//    convention #60 established). Net: scene-assembly.json 41/256 -> 104/256.
//    One narrow residual remains, NOT resolved: trace tick 1229 (player bar)
//    is 22px off - the oracle is still background there a tick after our
//    model shows the bar's first frame. A further one-tick-later `visible`
//    gate fixes 1229 but then breaks the opponent side's own first-visible
//    tick (1232) the same way (pixel-confirmed), so the two sides do not
//    share one extra-tick correction and this wasn't chased further within
//    this session's cap - next step is RAM-probing exactly what's
//    structurally different between the player and opponent widgets' first
//    visible tick (both created via the same `CreatePartyStatusSummarySprites`,
//    3 ticks apart) rather than guessing another blanket offset.

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
/** Trace tick the top edge hits 0 - the window is fully open from here on (pixel-ground-truthed this session by scanning the oracle's own captures for the first/last non-black row per tick - see PROGRESS.md: the prior #58/#60 estimates of 1118/1119-via-RAM were each one tick off from what the CAPTURED FRAME actually shows, a render-vs-task-tick lag distinct from the RAM value's own tick). */
const WINDOW_FULLY_OPEN_TICK = 1119;
/** Last trace tick still using the phase-1 (1px/edge/tick) formula - pixel-ground-truthed (see `WINDOW_FULLY_OPEN_TICK`'s note): captures show top/bottom = 48/113 at this tick (still exactly phase-1's rate), then 44/117 the next tick (phase-2's 4px/edge/tick rate). */
const WINDOW_PHASE1_LAST_TICK = 1107;

/**
 * Vertical reveal window [top, bottom) at trace tick `t` - two-phase growth
 * of `gBattle_WIN0V` (module doc point 2), phase boundaries pixel-ground-
 * truthed this session (see `WINDOW_FULLY_OPEN_TICK`'s note - the RAM-tick
 * values from #60 were each one capture-frame later than the task's own
 * tick, a render lag, not a wrong mechanism): phase 1 (ticks 1075-1107)
 * shrinks by 1px/edge/tick, phase 2 (ticks 1108-1118) by 4px/edge/tick until
 * the top edge hits 0 at tick 1119.
 */
export function windowRange(t: number): { top: number; bottom: number } | null {
  if (t < FIRST_VISIBLE_TICK) return null;
  if (t >= WINDOW_FULLY_OPEN_TICK) return { top: 0, bottom: 160 };
  if (t <= WINDOW_PHASE1_LAST_TICK) {
    const k = t - FIRST_VISIBLE_TICK;
    return { top: 80 - k, bottom: 81 + k };
  }
  const d = t - WINDOW_PHASE1_LAST_TICK;
  return { top: Math.max(0, 48 - 4 * d), bottom: Math.min(160, 113 + 4 * d) };
}

/** Trace tick the per-scanline shift + BLDALPHA blend both reach their settled (0 shift, eva=0/evb=16) state - task destroyed, BattleIntroSlideEnd (docs/battle-scene-notes.md §2; RAM-confirmed: `gTasks[0]` is destroyed exactly this tick). */
const SLIDE_END_TICK = 1227;
/** Trace tick `gTasks[0].data[2]` first decrements below its initial 240 (pixel-ground-truthed this session, same one-tick-later-than-#60's-RAM-tick lag as `WINDOW_PHASE1_LAST_TICK` - a column at trace tick 1150 was 2px off from the oracle with the naive RAM-tick pivot (1106), exactly matching a 1-tick-later pivot). */
const SHIFT_DECAY_START_TICK = 1108;

/** `gTasks[0].data[2]` (as DMA'd into `gScanlineEffectRegBuffers`) at trace tick `t`: a constant 240 for ticks `FIRST_VISIBLE_TICK`-1107, then -2/tick from tick 1108 (pixel-ground-truthed pivot, see `SHIFT_DECAY_START_TICK`'s note - one tick later than #60's RAM-read value, the same capture-vs-task-tick lag as the window edges). DMA'd into `REG_BG3HOFS` per scanline: top half (0-79) gets `+data[2]`, bottom half (80-159) gets `-data[2]` (RAM-confirmed uniform per half, no additional gradient). */
function scanlineShiftMagnitude(t: number): number {
  if (t < FIRST_VISIBLE_TICK || t >= SLIDE_END_TICK) return 0;
  if (t < SHIFT_DECAY_START_TICK) return 240;
  return 240 - 2 * (t - 1107);
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

/** BG1's own period (`entrySlide` is a 32x32-tile screen block, same 256px period as BG3's `static` - both are `BGCNT_TXT256x512`-shaped per source, `battle_bg.c`'s `gBattleBgTemplates`). */
const BG1_PERIOD = battleBg.entrySlide.tilemap.width * 8;

/** `entrySlide` (BG1) pixel at map coords - same lookup shape as `staticBgPixel`, no vertical wrap needed since `gBattle_BG1_Y` never moves from 0 in this window (source-confirmed: `DrawBattleEntryBackground`'s Frontier branch never touches it). */
function entrySlidePixel(mapX: number, mapY: number): RgbColor | null {
  const tilemap = battleBg.entrySlide.tilemap;
  const tileRow = Math.floor(mapY / 8);
  if (tileRow < 0 || tileRow >= tilemap.height) return null;
  const inTileY = ((mapY % 8) + 8) % 8;
  const wrappedX = (((mapX % BG1_PERIOD) + BG1_PERIOD) % BG1_PERIOD);
  const tileCol = Math.floor(wrappedX / 8);
  const inTileX = wrappedX % 8;
  const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
  if (!entry) return null;
  const tile = battleBg.entrySlide.tileset.tiles[entry.tile];
  if (!tile) return null;
  const sx = entry.hFlip ? 7 - inTileX : inTileX;
  const sy = entry.vFlip ? 7 - inTileY : inTileY;
  const idx = tile[sy * 8 + sx]!;
  if (idx === 0) return null;
  return battleBg.palette[entry.palette]?.[idx] ?? null;
}

/** Trace tick `gBattle_BG1_X` starts incrementing (RAM-confirmed this session, `tools/probe/ram-probe.py` on `gBattle_BG1_X`: reads 0 through tick 1072, 8 at tick 1073, +8/tick after - matches `battle_intro.c`'s unconditional `gBattle_BG1_X += 8` in `BattleIntroSlide3`, task first alive this tick per module doc). */
const BG1_X_START_TICK = 1073;
/**
 * `gBattle_BG1_X` as it actually affects the RENDERED frame at trace tick
 * `t` - RAM-confirmed this session (`ram-probe.py`) that the value the
 * oracle displays for tick `t` is the register as of tick `t-1`, not `t`:
 * e.g. `bg1x` reads 616 at RAM-tick 1149 and the tick-1150 CAPTURE's pixels
 * are only explained by *that* value, not tick-1150's own 624 (same one-
 * tick render lag also confirmed for `WINDOW_FULLY_OPEN_TICK` and
 * `SHIFT_DECAY_START_TICK` above - a consistent "task writes registers this
 * tick, HBlank DMA/VBlank copy shows them next tick" pattern, not a
 * per-mechanism coincidence).
 */
function bg1X(t: number): number {
  return 8 * (t - BG1_X_START_TICK);
}

/** GBA alpha-blend of one channel: `(tgt1*eva + tgt2*evb) / 16`, clamped (BLDALPHA hardware formula, `battle_intro.c`'s `BLDALPHA_BLEND` writes). */
function blendChannel(tgt1: number, tgt2: number, eva: number, evb: number): number {
  return Math.min(255, Math.round((tgt1 * eva + tgt2 * evb) / 16));
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
/**
 * Re-probed this session (PROGRESS.md #64): the previous tables above only
 * captured each icon's SLIDING tail, not the per-icon flat delay prefix
 * (`SpriteCB_StatusSummaryBalls_Enter`'s `data[1]` countdown, source
 * `data[1] = i*7+10` per icon) before the slide starts - the missing lead-in
 * made every icon (worst on the opponent side) start sliding 10-50+ ticks
 * too early. Rebuilt directly from `gSprites[].x2` RAM history per icon
 * (`tools/probe/ram-probe.py`, ticks 1225-1295), full lead-in included.
 */
const PLAYER_ICON_X2: readonly number[][] = [
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
  [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 117, 111, 102, 90, 75, 57, 36, 12, 0],
];
const OPP_ICON_X2: readonly number[][] = [
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
  [-120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -120, -117, -111, -102, -90, -75, -57, -36, -12, 0],
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

/**
 * CreatePartyStatusSummarySprites corner formula (docs/battle-interface-assets.md):
 * opponent `(26+10i, 32)`, player `(156+10i, 88)`, i=0-5, offset by each icon's
 * own `x2` entrance slide (RAM-confirmed tables above). States hardcoded per
 * this specific battle-1 trace's own verified slot contents (3v3, see that
 * doc's verification table) - not derived generically.
 *
 * Renders at `t - 1` (module doc point 3 / GAP B): RAM-probed
 * `gSprites[].{invisible, oam.attr2}` directly per tick (`tools/probe/ram-probe.py`,
 * PROGRESS.md #64) shows neither field ever changes after creation - the
 * widget sprites are never actually "invisible", so there is no separate
 * visibility trigger to model. Pixel-ground-truthing the same systemic
 * one-tick render lag GAP A found (module doc point 2) against the oracle's
 * own captures instead confirms it directly: at trace tick 1230 the oracle's
 * player-bar edge sits at the table's tick-1229 position (`x2=95`), not
 * tick-1230's own (`x2=90`) - same "task writes this tick, display shows it
 * next tick" lag as every other register this window drives. A prior session
 * tried shifting only the table *index* while leaving the create-tick
 * comparison unshifted (PROGRESS.md #62) - that desyncs the two and produces
 * exactly the "fixes some frames, breaks others" result it saw. Shifting the
 * whole render tick uniformly (both the table lookup and the visibility
 * gate) is what the lag actually requires. One narrow residual remains at
 * trace tick 1229 specifically (player bar shows one tick early, 22px) -
 * a `visible` gate delayed one tick further fixes 1229 but then breaks the
 * opponent side's own first-visible tick (1232) the same way, so the two
 * sides don't share a single extra-tick correction; left as-is rather than
 * chase an unverified per-side special case (PROGRESS.md #64).
 */
export function ballIcons(t: number): BallIcon[] {
  const rt = t - 1;
  const opponentStates = ["Empty", "Empty", "Empty", "Full", "Full", "Full"];
  const playerStates = ["Full", "Full", "Full", "Empty", "Empty", "Empty"];
  const icons: BallIcon[] = [];
  for (let i = 0; i < 6; i += 1) {
    icons.push({
      x: 26 + 10 * i + tableX2(OPP_ICON_X2[i]!, OPP_CREATE_TICK, rt),
      y: 32,
      state: opponentStates[i]!,
      visible: rt >= OPP_CREATE_TICK,
    });
  }
  for (let i = 0; i < 6; i += 1) {
    icons.push({
      x: 156 + 10 * i + tableX2(PLAYER_ICON_X2[i]!, PLAYER_CREATE_TICK, rt),
      y: 88,
      state: playerStates[i]!,
      visible: rt >= PLAYER_CREATE_TICK,
    });
  }
  return icons;
}

/** Diagonal-bar background corners at trace tick `t` - `ballStatusBar`'s own settled corners (docs module doc point 1: opponent `(-24,40)` h-flipped, player `(136,96)`) offset by the bar sprite's own `x2` entrance slide (RAM-confirmed tables above - the bar is itself `gSprites[summaryBarSpriteId]`, same mechanism as the ball icons). Renders at `t - 1`, same render-lag rationale as `ballIcons` above. */
export function ballStatusBarPositions(t: number): { opponent: { x: number; visible: boolean }; player: { x: number; visible: boolean } } {
  const rt = t - 1;
  return {
    opponent: { x: -24 + tableX2(OPP_BAR_X2, OPP_CREATE_TICK, rt), visible: rt >= OPP_CREATE_TICK },
    player: { x: 136 + tableX2(PLAYER_BAR_X2, PLAYER_CREATE_TICK, rt), visible: rt >= PLAYER_CREATE_TICK },
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
 * FIRST_VISIBLE_TICK..SLIDE_END_TICK-1. RAM/source-confirmed compositing
 * (module doc point 2, resolved this session): `BLDCNT =
 * TGT1_BG1|BLEND|TGT2_BG3|TGT2_OBJ`, BG1 (`entrySlide`) is TGT1. Pixel-
 * ground-truthed this session (sampling both trainer sprites' settled-
 * corner rectangles at many ticks through the whole reveal window - see
 * PROGRESS.md): **neither trainer OBJ is ever visible during the reveal
 * itself** - both spots show plain background (BG1/BG3 blend) at every
 * sampled tick, only becoming the actual trainer pics at
 * `drawSettledScene`'s tick 1227 handoff. So TGT2_OBJ in `BLDCNT` never
 * actually engages here (no OBJ pixel is ever the topmost opaque one to
 * blend under BG1) - TGT2 is BG3 alone. BG3 (`static`) gets the per-
 * scanline HOFS shift (`sIntroScanlineParams16Bit` targets `&REG_BG3HOFS`
 * literally, `battle_main.c:250-253` - BG1 is NOT part of that DMA); BG1
 * instead scrolls uniformly via the ordinary whole-frame `gBattle_BG1_X`
 * write (`bg1X` above). Per real GBA alpha-blend semantics, blending only
 * happens where the actual topmost opaque pixel is TGT1-flagged: wherever
 * `entrySlide` is transparent, BG3 draws raw, unblended (confirmed against
 * oracle pixels - PROGRESS.md #62). The window frame (BG0) is not a blend
 * target, so it draws at full brightness, unshifted, on top of everything.
 */
function drawSlideScene(fb: Uint8Array, t: number, win: { top: number; bottom: number }): void {
  const { eva, evb } = evaEvb(t);
  const bg1Shift = bg1X(t);

  // TGT2: per-scanline-shifted BG3 (`static`) alone - no OBJ, see module doc above.
  const tgt2 = new Uint8Array(240 * 160 * 4);
  for (let y = win.top; y < win.bottom; y += 1) {
    const shift = y < 80 ? shiftTop(t) : shiftBottom(t);
    for (let x = 0; x < 240; x += 1) {
      const c = staticBgPixel(x + shift, y);
      if (c) setPixel(tgt2, x, y, c);
    }
  }

  // TGT1: BG1 (`entrySlide`), uniformly shifted. Blend where opaque, else raw TGT2.
  for (let y = win.top; y < win.bottom; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const o = (y * 240 + x) * 4;
      const bg1c = entrySlidePixel(x + bg1Shift, y);
      if (bg1c) {
        fb[o] = blendChannel(bg1c.r, tgt2[o]!, eva, evb);
        fb[o + 1] = blendChannel(bg1c.g, tgt2[o + 1]!, eva, evb);
        fb[o + 2] = blendChannel(bg1c.b, tgt2[o + 2]!, eva, evb);
        fb[o + 3] = 255;
      } else if (tgt2[o + 3] !== 0) {
        fb[o] = tgt2[o]!;
        fb[o + 1] = tgt2[o + 1]!;
        fb[o + 2] = tgt2[o + 2]!;
        fb[o + 3] = 255;
      }
    }
  }

  // BG0 (window frame): not a blend target, drawn raw on top, unshifted.
  const windowTmp = new Uint8Array(240 * 160 * 4);
  drawTileBg(windowTmp, battleWindow.tileset, battleWindow.tilemap, battleWindow.palette);
  for (let y = win.top; y < win.bottom; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const o = (y * 240 + x) * 4;
      if (windowTmp[o + 3] === 0) continue;
      fb[o] = windowTmp[o]!;
      fb[o + 1] = windowTmp[o + 1]!;
      fb[o + 2] = windowTmp[o + 2]!;
      fb[o + 3] = 255;
    }
  }
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
