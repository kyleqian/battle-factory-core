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
// STATUS (updated this session - see PROGRESS.md #70): the whole
// scene-assembly slice is now FULLY RESOLVED - tools/compare/traces/
// scene-assembly.json is **256/256** (was 255/256). This session closed the
// last residual (point 3's tick-1229 gap, GAP B) with an asymmetric,
// RAM+pixel-confirmed fix to the player bar's own visibility gate - see
// point 3 below for the full derivation. GAP A (the prior session, #68) was
// already fully resolved: the whole BattleIntroSlide3 streak window (ticks
// 1075-1226) is byte-exact. Building on #66's three fixes (trainer OBJ
// layer, BG3's real 512px width, floor-not-round blending), that session
// closed point 2's "STILL OPEN" pixel (tick 1150 x=120/y=84) with two more
// fixes: (a) the GBA alpha-blend formula matches the oracle when run in
// **8-bit-expanded color space with floor division** directly on the
// source colors, NOT #66's 5-bit-quantize-then-reexpand convention -
// proven both negatively (the oracle's exact pixel value is mathematically
// UNREACHABLE by any 5-bit blend of any two palette colors under any
// eva/evb, since `(c5<<3)|(c5>>2)` only ever produces one of 32 fixed
// values per channel) and positively (the 8-bit-domain formula hits all
// three channels exactly, using the very same source colors #66 already
// validated); (b) `evaEvb` needed the identical one-tick render lag every
// other register in this task already has - found via 8 leftover
// boundary-tick mismatches (one per 6-tick BLDALPHA step) after fix (a).
// That session took scene-assembly.json 151/256 -> 255/256 (0 regressions,
// full 18-trace sweep + groundtruth traces re-verified; battle1-intro.json
// even improved 141->167/254 as a side effect, same fix, different trace).
// The mandated VRAM probe (`ram-probe.py` on BG1CNT, BLDCNT/BLDALPHA, the
// literal tile entry at `BG_SCREEN_ADDR(28)` for this pixel, its
// palette-RAM and char-VRAM bytes) came back clean on every axis this doc
// had flagged unverified - BG1's `screenSize=2` reads 256px-wide exactly as
// assumed (no bug), the tile/palette/char bytes match the extracted JSON
// exactly (the JSON's palette-bank numbers are a local remap of VRAM's raw
// bank indices, a labeling difference, not a data bug) - so that fix was
// purely the blend-precision domain, not a geometry/extraction problem.
// Full derivation in point 2 below.
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
//    LAYER MODEL: `BLDCNT = TGT1_BG1|BLEND|TGT2_BG3|TGT2_OBJ` (0x1842,
//    RAM-confirmed) with BG1 = `entrySlide` (source: `DrawBattleEntryBackground`'s
//    Frontier branch loads it to `BG_CHAR_ADDR(1)`/`BG_SCREEN_ADDR(28)`,
//    matching BG1's own `gBattleBgTemplates` charBase/mapBase) and BG3 =
//    `static` (mapBase 26, matching `DrawMainBattleBackground`). BG1 sits at
//    OAM-scale priority 0 (frontmost), BG3 at priority 3 (backmost), both
//    trainer OBJs at priority 2 (`gOamData_BattleSprite{Player,Opponent}Side`,
//    `battle_main.c:274-301`) - so BG1 is always the topmost layer wherever
//    opaque, and OBJ is BG3's own topmost neighbor (in front of it, behind
//    BG1). **CORRECTION this session (PROGRESS.md #66): the prior "neither
//    trainer OBJ is ever actually visible during the reveal" conclusion
//    (#63) was a misdiagnosis** - it only pixel-sampled each trainer's
//    *settled* corner rect (which is genuinely blank until the tick-1227
//    settle), never checking whether the OBJ appears elsewhere first. RAM-
//    probing `gSprites[gBattlerSpriteIds[0/1]]` (indices 3=player, 4=
//    opponent) directly (`tools/probe/ram-probe.py`, ticks 1073-1240) shows
//    both are `inUse=1`/`invisible=0` from creation (tick 1074) onward, with
//    constant `oam.tileNum`/`paletteNum` (369/7 opponent, 305/0 player) -
//    i.e. they're their full final artwork the whole time, not a
//    placeholder - and each slides in via its own OAM `x2` secondary offset
//    at the EXACT SAME per-tick magnitude as `gTasks[0].data[2]` (the BG3
//    scanline-shift value), opposite sign per side (opponent `x2=-data[2]`,
//    player `x2=+data[2]`, both reaching 0 at the shared tick-1226 settle) -
//    same underlying register driving both mechanisms, so `objShift(t)`
//    below just reuses the already-validated `scanlineShiftMagnitude`
//    rather than a new table. `WININ` includes `WIN0_OBJ`, so the OBJ is
//    window-clipped identically to BG3 (`drawSpriteSheetWindowed`). BG3
//    gets the per-scanline HOFS shift (`sIntroScanlineParams16Bit` targets
//    `&REG_BG3HOFS` literally, `battle_main.c:250-253` - not BG1); BG1
//    scrolls uniformly via the ordinary whole-frame `gBattle_BG1_X` write.
//    Blend only engages where BG1 (TGT1) is opaque; elsewhere the next-
//    topmost opaque layer (OBJ if present, else BG3) draws raw.
//    BLEND PRECISION, corrected again this session (PROGRESS.md #68 - see
//    `blendChannel`): the formula that actually matches the oracle runs in
//    **8-bit-expanded color space with floor division directly on the
//    source colors** (`floor((tgt1*eva+tgt2*evb)/16)`, no 5-bit
//    quantize-then-reexpand step) - NOT the 5-bit-floor convention #66
//    landed on (itself a fix over round-in-8-bit, but the wrong precision
//    domain). Proven two ways at the pixel #66 left open (tick 1150,
//    x=120/y=84, entrySlide content, `entrySlidePixel` returns a real
//    opaque color there): (a) NEGATIVELY - the oracle's own pixel there,
//    (242,246,252), is mathematically UNREACHABLE by 5-bit blending, full
//    stop - `(c5<<3)|(c5>>2)` only ever produces one of 32 fixed values per
//    channel regardless of which two palette colors or which `eva`/`evb`
//    pair feed it, and none of 242/246/252 are among them (brute-forced
//    exhaustively, not just sampled); this holds even changing which tile
//    the blend reads, since ANY GBA palette color is itself one of those
//    same 32 values. (b) POSITIVELY - the 8-bit-domain formula, run on the
//    exact same operands #66 already validated (`entrySlide` tile 8's
//    (222,231,247) blended with `static`'s white (255,255,255) at
//    `eva=6,evb=10`), hits the oracle's value exactly on all three
//    channels: R `floor((222*6+255*10)/16)=242`, G `floor((231*6+255*10)
//    /16)=246`, B `floor((247*6+255*10)/16)=252`. Since `blendChannel` is
//    local to this file (only caller is `drawSlideScene` below), this fix
//    is scoped to this window alone - `paletteFade.ts`'s own blend is a
//    separate function, unaffected, still 5-bit floor for its own (already
//    oracle-validated) use case; apparently mGBA's own blend implementation
//    operates in its native 8bpp framebuffer domain rather than re-deriving
//    5-bit hardware precision, a real emulator characteristic worth
//    matching since the oracle - not idealized hardware semantics - is
//    ground truth (`AGENTS.md`).
//    EVA/EVB RENDER LAG (found immediately after the fix above, same
//    session): switching the blend formula took scene-assembly.json from
//    151/256 to 247/256, leaving exactly 8 residual mismatches - trace
//    ticks 1139/1145/1151/1157/1163/1169/1175/1181, precisely the 6-tick
//    BLDALPHA step boundaries. `evaEvb` was reading `gTasks[0].data[4]`'s
//    effective tick directly (no lag), unlike every other register this
//    task drives (`bg1X`, the window edges, the scanline shift, all
//    corrected for the same one-tick task-writes/display-shows-next-tick
//    lag in this module already) - adding the identical `t-1` lag to
//    `evaEvb` fixed all 8, landing on 255/256 (only GAP B's own
//    already-known point-3 residual, tick 1229, remains - see below).
//    VRAM PROBE (the brief's mandated first step, run this session
//    alongside the above): `ram-probe.py` on BG1CNT (`0x0400000A`),
//    BLDCNT/BLDALPHA (`0x04000050`/`0x04000052`), the literal tilemap entry
//    at `BG_SCREEN_ADDR(28)` for tick-1150 x=120/y=84's tile (tileRow 10,
//    tileCol 28), that tile's char data at `BG_CHAR_ADDR(1)`, and its
//    palette RAM bytes - all came back clean, closing out both items this
//    doc had flagged unverified: BG1CNT decodes to `charBase=1,
//    colorMode=0(4bpp), screenBase=28, screenSize=2` byte-for-byte matching
//    `gBattleBgTemplates[1]` and this module's existing 256px-wide
//    assumption (no bug - screenSize=2 was never actually in question,
//    just never RAM-cross-checked until now); the tile entry decodes to
//    `tileId=8/hFlip=0/vFlip=0`, and its char data (`0x5555 0x5555`, i.e.
//    palette index 5 for all 8 pixels of tile row 4) matches the extracted
//    JSON exactly; the entry's raw palette nibble is hardware bank **4**,
//    not the JSON's bank **2** - but VRAM palette bank 4 index 5 reads
//    BGR555 `0x7B9B` = RGB(222,231,247), byte-identical to the JSON's own
//    bank 2 index 5 - `extract-battle-bg.ts` locally renumbers only the
//    palette banks a tileset actually references rather than preserving
//    raw VRAM bank indices, a labeling convention confirmed harmless here,
//    not a bug. So the true fix was purely the blend-precision domain
//    above, not a geometry/palette/extraction problem.
//    Net across all fixes to date: scene-assembly.json 104/256 -> 151/256
//    (#66) -> **255/256** (#68), 0 regressions at either step (full
//    18-trace sweep + groundtruth traces re-verified both times).
//    GAP A IS NOW FULLY RESOLVED: every captured tick across the whole
//    1075-1226 streak+settle-adjacent window is byte-exact. The one
//    remaining scene-assembly.json mismatch (trace tick 1229) is GAP B's
//    own pre-existing, separate, narrower residual - see point 3 below,
//    untouched this session, out of GAP A's scope.
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
//
//    GAP B FULLY RESOLVED this session (PROGRESS.md #70): the one narrow
//    residual left above (trace tick 1229, player bar 22px off - the oracle
//    was still background there a tick after the model showed the bar's
//    first frame) was chased with the mandated RAM probe rather than another
//    blanket offset. #64 had already shown a blanket one-tick-later `visible`
//    gate fixes 1229 but breaks the opponent's own first-visible tick (1232)
//    the same way - proof the two sides needed a genuinely asymmetric fix,
//    not a shared constant. RAM-probing `gSprites[5]` (player bar) and
//    `gSprites[6]` (opponent bar, both identified by matching their settled
//    corners, same method as above) tick-by-tick found the actual structural
//    difference: the player bar's `x2` STALLS for one extra tick right after
//    creation - `x2=95` at BOTH RAM tick 1228 (its creation tick) and 1229,
//    only resuming `SpriteCB_StatusSummaryBar_Enter`'s ordinary per-tick
//    decrement (`x2 += data[0]`) at RAM tick 1230 - whereas the opponent
//    bar's `x2` decrements every single tick starting immediately at its own
//    creation (`-95` at 1231, `-90` at 1232, no stall). Pixel-ground-truthing
//    the oracle's own captures independently confirms this is exactly what
//    gates the display (not a coincidence): the player-side region is
//    byte-identical background through trace tick 1229 and first changes
//    (22px, matching the bar's leading-tile opaque wedge at `x2=95`
//    precisely) at 1230; the opponent-side region is unchanged through 1231
//    and first changes (22px, same shape) at 1232 - i.e. the player bar
//    genuinely needs createTick+2 ticks to reach the display, the opponent
//    bar only createTick+1 (the module's ordinary one-tick lag, untouched).
//    Fix: `PLAYER_BAR_VISIBLE_TICK = PLAYER_CREATE_TICK + 1` gates ONLY the
//    player bar's `visible` field (table lookup itself is untouched, since
//    it was already RAM-exact and already encodes the same stall as a
//    literal repeated value, `PLAYER_BAR_X2 = [95, 95, 90, ...]`) - the
//    opponent bar and both sides' ball icons are untouched: icons have their
//    own per-icon flat-delay prefix already baked into their tables (the
//    `data[1]` countdown above), which keeps every icon fully off-screen
//    through this exact tick regardless of any such stall, so nothing there
//    needed correction. scene-assembly.json 255/256 -> **256/256**, 0
//    regressions (full 18-trace sweep re-verified at each trace's exact
//    prior count). This closes the whole scene-assembly slice - see the
//    module-level STATUS note above.

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

/** BLDALPHA (EVA, EVB) as it actually affects the RENDERED frame at trace tick `t` - docs/battle-scene-notes.md §2 point 4, RAM-confirmed schedule: 8:8 constant through the task's own tick 1138, then 8 steps of 6 ticks each (EVA-1/EVB+1 per step), reaching 0:16 and holding. `et = t - 1` bakes in the same one-tick render lag as `bg1X`/the window edges/the scanline shift (module doc point 2, PROGRESS.md #68) - the display at trace tick `t` shows the register as the task left it as of tick `t-1`, not `t`'s own write; found by 8 leftover boundary-tick mismatches (one per step) after the blend-precision fix, all resolved by this lag. */
export function evaEvb(t: number): { eva: number; evb: number } {
  const et = t - 1;
  if (et < 1139) return { eva: 8, evb: 8 };
  const step = Math.min(8, Math.floor((et - 1139) / 6) + 1);
  return { eva: 8 - step, evb: 8 + step };
}

/**
 * BG3 (`static`)'s real hardware width: `gBattleBgTemplates[3].screenSize = 1`
 * (`BGCNT_TXT512x256`, `battle_bg.c:152-160`) - **512px wide** (two
 * horizontally-adjacent 32x32 screen blocks), not 256. The extractor's
 * vertical recomposition of `map.bin` into a single 32-wide/64-tall JSON
 * (see `extract-battle-bg.ts`'s header note) stores VRAM screen block 2
 * (the real hardware's right-hand 256px half) as tile-rows 32-63 - so the
 * correct horizontal wrap is `mapX mod 512`, reading tile-ROW `+32` for the
 * upper half `[256,512)`, not wrapping `mapX` back into block 1's columns.
 * Confirmed by direct inspection of the extracted JSON: block 2's content
 * (rows 32-51, the only rows this 160px-tall screen ever reaches) is
 * uniformly blank - this is an indoor scene, the sky/gradient art only
 * spans the left 256px. Using a naive 256px period (this module's bug
 * through PROGRESS.md #65) wrapped BG3's per-scanline-shifted sampling back
 * into block 1's own gradient tiles whenever the shift pushed `mapX` past
 * 256, producing a phantom duplicate of that gradient at the wrong screen
 * column instead of the true blank block 2 (pixel-confirmed: trace tick
 * 1150, row 55, screen x 222-239 - oracle is flat white, matching block 2,
 * the old 256-period model showed the gradient's own leading tiles instead).
 */
const BG_PERIOD = battleBg.static.tilemap.width * 16;

function staticBgPixel(mapX: number, mapY: number): RgbColor | null {
  const tilemap = battleBg.static.tilemap;
  const inTileY = ((mapY % 8) + 8) % 8;
  const wrappedX = (((mapX % BG_PERIOD) + BG_PERIOD) % BG_PERIOD);
  const blockWidth = battleBg.static.tilemap.width * 8;
  const block = wrappedX >= blockWidth ? 1 : 0;
  const localX = wrappedX % blockWidth;
  const tileRow = Math.floor(mapY / 8) + block * 32;
  const tileCol = Math.floor(localX / 8);
  const inTileX = localX % 8;
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

/** BG1's own period: `entrySlide`'s `gBattleBgTemplates[1].screenSize = 2` (`BGCNT_TXT256x512`, vertically-stacked blocks) - genuinely 256px wide, unlike BG3's `static` above (`screenSize = 1`, 512px). `entrySlide`'s own JSON is a single 32x32 block (one screen block, per `extract-battle-bg.ts`'s header note), so no second-block row offset is needed here. */
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

/**
 * GBA alpha-blend of one channel, matching the oracle's own blend precision
 * (module doc point 2, PROGRESS.md #68): floor division run directly on the
 * already-8-bit-expanded source colors, `floor((tgt1*eva+tgt2*evb)/16)` -
 * NOT `paletteFade.ts`'s 5-bit-quantize-then-reexpand convention (a prior
 * version of this function, #66's fix over round-in-8-bit, was still the
 * wrong precision domain: oracle-pinned pixels exist - tick 1150, x=120/y=84
 * - whose exact color is mathematically unreachable by any 5-bit blend of
 * any two palette colors under any eva/evb, since `(c5<<3)|(c5>>2)` only
 * ever produces one of 32 fixed values per channel). This function is local
 * to this file (`drawSlideScene` is its only caller), so the domain choice
 * is scoped to this window alone - it does not affect `paletteFade.ts`'s
 * own (separately oracle-validated) blend elsewhere in the codebase.
 */
function blendChannel(tgt1: number, tgt2: number, eva: number, evb: number): number {
  return Math.min(255, Math.floor((tgt1 * eva + tgt2 * evb) / 16));
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
/**
 * The player bar's own display gate needs one extra tick beyond the module's
 * usual `t-1` render lag (module doc point 3, resolved this session):
 * RAM-probing `gSprites[5].x2` (the player bar, identified by matching its
 * settled corner) tick-by-tick shows it STALLS for one extra tick right
 * after creation - `x2=95` at BOTH RAM tick 1228 (creation) and 1229, only
 * resuming its normal per-tick `SpriteCB_StatusSummaryBar_Enter` decrement
 * (`x2 += data[0]`) at 1230 - whereas `gSprites[6]` (the opponent bar,
 * created 3 ticks later at 1231) decrements every single tick starting
 * immediately (`-95` at 1231, `-90` at 1231+1=1232, no stall). Pixel-diffing
 * the oracle's own captures independently confirms this is exactly what
 * gates the display: the player-side region is byte-identical background
 * through trace tick 1229 and first changes (22px, matching the bar's tile0
 * opaque wedge at `x2=95`) at 1230; the opponent-side region is unchanged
 * through 1231 and first changes (22px, same shape) at 1232 - i.e. the
 * player bar needs createTick+2 to reach the display, the opponent bar only
 * createTick+1 (the module's ordinary one-tick lag, unmodified). This is a
 * genuinely asymmetric, RAM-verified structural fact (not a guessed
 * blanket offset) - only the PLAYER bar's gate gets the extra tick; the
 * opponent bar and both sides' ball icons are untouched (icons have their
 * own per-icon flat-delay prefix baked into their tables already - see §4 -
 * which keeps them fully off-screen through this exact tick regardless, so
 * the same underlying stall, if present, produces no visible pixel and
 * needs no correction there).
 */
const PLAYER_BAR_VISIBLE_TICK = PLAYER_CREATE_TICK + 1;
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
 * gate) is what the lag actually requires. The player BAR specifically
 * (not these icons - see `PLAYER_BAR_VISIBLE_TICK`'s own doc comment)
 * needed one further asymmetric tick of gating, RAM+pixel-confirmed rather
 * than guessed (PROGRESS.md #70) - closing the module's last residual.
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

/** Diagonal-bar background corners at trace tick `t` - `ballStatusBar`'s own settled corners (docs module doc point 1: opponent `(-24,40)` h-flipped, player `(136,96)`) offset by the bar sprite's own `x2` entrance slide (RAM-confirmed tables above - the bar is itself `gSprites[summaryBarSpriteId]`, same mechanism as the ball icons). Renders at `t - 1`, same render-lag rationale as `ballIcons` above - except the player bar's gate, which needs one further tick (`PLAYER_BAR_VISIBLE_TICK` - see its doc comment, RAM+pixel confirmed asymmetric vs the opponent bar). */
export function ballStatusBarPositions(t: number): { opponent: { x: number; visible: boolean }; player: { x: number; visible: boolean } } {
  const rt = t - 1;
  return {
    opponent: { x: -24 + tableX2(OPP_BAR_X2, OPP_CREATE_TICK, rt), visible: rt >= OPP_CREATE_TICK },
    player: { x: 136 + tableX2(PLAYER_BAR_X2, PLAYER_CREATE_TICK, rt), visible: rt >= PLAYER_BAR_VISIBLE_TICK },
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

/** Same as `drawSpriteSheet`, but clipped to the WIN0 vertical range (`WININ` includes `WIN0_OBJ` - OBJs are windowed too, module doc point 2). */
function drawSpriteSheetWindowed(
  fb: Uint8Array,
  tileset: Tileset,
  palette: RgbColor[],
  ox: number,
  oy: number,
  win: { top: number; bottom: number },
): void {
  for (let ty = 0; ty < tileset.rows; ty += 1) {
    const rowY = oy + ty * 8;
    if (rowY + 8 <= win.top || rowY >= win.bottom) continue;
    for (let tx = 0; tx < tileset.columns; tx += 1) {
      const tile = tileset.tiles[ty * tileset.columns + tx];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        const y = rowY + py;
        if (y < win.top || y >= win.bottom) continue;
        for (let px = 0; px < 8; px += 1) {
          const idx = tile[py * 8 + px]!;
          if (idx === 0) continue;
          const c = palette[idx];
          if (!c) continue;
          setPixel(fb, ox + tx * 8 + px, y, c);
        }
      }
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
 * (module doc point 2, GAP A resolved this session): `BLDCNT =
 * TGT1_BG1|BLEND|TGT2_BG3|TGT2_OBJ`, BG1 (`entrySlide`) is TGT1. A prior
 * session's "neither trainer OBJ is ever visible during the reveal"
 * conclusion (PROGRESS.md #63) was a real misdiagnosis - it only sampled
 * each trainer's *settled* corner rect, but both trainer OBJs are actually
 * `invisible=FALSE`/in-use from the moment they're created (RAM-confirmed,
 * `gSprites[gBattlerSpriteIds[0/1]]`, ticks 1074-1886: `invisible` and
 * `oam.tileNum`/`paletteNum` never change) and slide in via their OWN
 * `x2` OAM offset, entirely independent of BG1 - `x2` tracks the exact
 * same magnitude as `gTasks[0].data[2]` (the BG3 scanline-shift value)
 * every single tick, opposite sign per side (opponent `x2 = -data[2]`,
 * player `x2 = +data[2]`), reaching 0 at the same tick-1226 settle. Since
 * that's numerically identical to the already-validated
 * `scanlineShiftMagnitude` schedule (same RAM register drives both), no
 * new constant table is needed - `objShift(t)` below just reuses it. OBJ
 * sits at priority 2 (`gOamData_BattleSprite{Player,Opponent}Side`,
 * `battle_main.c:274-301`), strictly between BG1 (priority 0, frontmost)
 * and BG3 (priority 3, backmost), so it's TGT2's *other* real occupant:
 * wherever it's opaque, it draws in front of BG3 (raw, unblended, exactly
 * like BG3 draws raw where BG1 is transparent - see below) and BEHIND BG1
 * (so BG1, where opaque, blends against the OBJ color there, not BG3's).
 * `WININ` includes `WIN0_OBJ`, so the OBJ is window-clipped too
 * (`drawSpriteSheetWindowed`). Both trainer sprites' tile/palette are
 * constant throughout (RAM-confirmed) - the same art `drawSettledScene`
 * uses, just at a sliding corner instead of the settled one. BG3
 * (`static`) gets the per-scanline HOFS shift (`sIntroScanlineParams16Bit`
 * targets `&REG_BG3HOFS` literally, `battle_main.c:250-253` - BG1 is NOT
 * part of that DMA); BG1 instead scrolls uniformly via the ordinary
 * whole-frame `gBattle_BG1_X` write (`bg1X` above). Per real GBA
 * alpha-blend semantics, blending only happens where the actual topmost
 * opaque pixel is TGT1-flagged: wherever `entrySlide` is transparent, the
 * next-topmost opaque layer (OBJ if present there, else BG3) draws raw,
 * unblended (confirmed against oracle pixels - PROGRESS.md #62/#65). The
 * window frame (BG0) is not a blend target, so it draws at full
 * brightness, unshifted, on top of everything.
 */
function drawSlideScene(fb: Uint8Array, t: number, win: { top: number; bottom: number }): void {
  const { eva, evb } = evaEvb(t);
  const bg1Shift = bg1X(t);
  const objShift = scanlineShiftMagnitude(t);

  // TGT2: per-scanline-shifted BG3 (`static`), with both trainer OBJs
  // (priority 2, in front of BG3) drawn raw on top wherever opaque - see
  // module doc above.
  const tgt2 = new Uint8Array(240 * 160 * 4);
  for (let y = win.top; y < win.bottom; y += 1) {
    const shift = y < 80 ? shiftTop(t) : shiftBottom(t);
    for (let x = 0; x < 240; x += 1) {
      const c = staticBgPixel(x + shift, y);
      if (c) setPixel(tgt2, x, y, c);
    }
  }
  drawSpriteSheetWindowed(tgt2, bugCatcher.tileset, bugCatcher.palette, OPPONENT_CORNER.x - objShift, OPPONENT_CORNER.y, win);
  drawSpriteSheetWindowed(tgt2, brendanSettledTileset, brendan.palette, PLAYER_CORNER.x + objShift, PLAYER_CORNER.y, win);

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
