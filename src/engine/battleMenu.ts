// S6 send-out slice 1: the "Go! ONIX!" message-box clear + print + settled
// static hold (docs/battle-menu-notes.md §1-§2, trace ticks 1563-1594 of
// tools/compare/traces-groundtruth/battle1-menu-dense.json, same 40-segment
// button script as battle1-intro/sendout.json). Picks up the instant the
// opponent's already-settled "sent out GROVYLE!" hold (battleScene.ts's
// `drawSendOutHandoff`, held indefinitely through trace tick 1562) breaks.
//
// Source: BattleIntroPrintPlayerSendsOut (src/battle_main.c) ->
// PrepareStringBattle(STRINGID_INTROSENDOUT, ...) -> sText_GoPkmn = "Go!
// {B_PLAYER_MON1_NAME}!" (battle_message.c:396) -> "Go! ONIX!" (9 printable
// chars). Same window/font/cadence mechanism as battle-scene-notes.md
// §3.1-3.2 and battleScene.ts's own `textVisibleChars`/`sendOutTextVisibleChars`
// (B_WIN_MSG, FONT_NORMAL, GetPlayerTextSpeedDelay() = 1 tick/char at this
// save's optionsTextSpeed=FAST): pure functions of the absolute trace tick,
// reused by battleScene.ts's existing `drawMessageTextLines` draw helper -
// this module owns only the string + cadence, not the drawing.
//
// Pixel-verified this session (docs/battle-menu-notes.md §1/§2, re-confirmed
// directly against the oracle via tools/compare/traces/menu-text.json): tick
// 1563 clears the box AND draws the first glyph "G" in the same tick (no
// blank-box frame), 1564-1571 print the remaining 8 characters 1/tick
// including a pixel-silent-but-charged space at 1566, 1572+ holds static.

import { rentalMoveset, type ActiveMonMoveset } from "./battleSetup.ts";

/** `sText_GoPkmn` resolved for this save's rental pool (single line, fits `B_WIN_MSG`'s line 1 - never wraps to line 2). */
export const GO_TEXT = "Go! ONIX!";

/** Total printable characters (docs/battle-menu-notes.md §2 - arithmetic-exact, 9 ticks for 9 chars including the silent space). */
export const GO_TEXT_TOTAL_CHARS = GO_TEXT.length;

/** Trace tick the message box clears and the first glyph ("G") draws, in the same tick (docs/battle-menu-notes.md §1, tick 1563). */
export const GO_TEXT_START_TICK = 1563;

/** First trace tick with no new character left to print (1572) - static from here on (docs/battle-menu-notes.md §1/§2). */
export const GO_TEXT_STATIC_FROM_TICK = GO_TEXT_START_TICK + GO_TEXT_TOTAL_CHARS;

/** Visible character count (0..GO_TEXT_TOTAL_CHARS) of "Go! ONIX!" at absolute trace tick `t`. Same 1-tick/char mechanism as `battleScene.ts`'s `textVisibleChars`/`sendOutTextVisibleChars` - spaces are pixel-silent but still charged a tick. */
export function goTextVisibleChars(t: number): number {
  if (t < GO_TEXT_START_TICK) return 0;
  return Math.min(GO_TEXT_TOTAL_CHARS, t - GO_TEXT_START_TICK + 1);
}

// --- Slice 2: Brendan's throw (pose swap + exit translation) + the thrown
// Poke Ball's arc (docs/battle-menu-notes.md §3, re-derived every-tick this
// session from tools/compare/traces-groundtruth/battle1-menu-dense.json -
// the coarse ~8-tick pass's boundaries were all a few ticks off, same
// pattern as §1's other corrections).
//
// Source: PlayerHandleIntroTrainerBallThrow (battle_controller_player.c:2931)
// sets Brendan's back-sprite anim to `sAnimCmd_Brendan_1` (anim index 1,
// reference/pokeemerald/src/data/trainer_graphics/back_pic_anims.h) and
// starts a StartAnimLinearTranslation. CORRECTION to this doc's own §3: the
// source sets `data[2] = -40` and `callback = StartAnimLinearTranslation`,
// which treats `data[2]` as an ABSOLUTE OAM-space x TARGET (not a delta -
// `StartAnimLinearTranslation` overwrites `data[1]` with the sprite's
// *current* x right before computing `target - current`), so the true
// total displacement is NOT 40px. Rather than chase the exact starting OAM
// x (not extracted anywhere in this codebase), this session pixel-fit the
// Q8.8 step register directly against every tick 1574-1596 (0/1665px
// mismatch at every one) - see `BRENDAN_TRANSLATE_STEP`.

/** Brendan (player back-sprite) throw-pose swap begins this tick - pixel-pinned exact (was assumed "~1595" by the original coarse pass, corrected to 1574 by PROGRESS #93, re-confirmed here). */
export const BRENDAN_THROW_START_TICK = 1574;

/**
 * Raw back-sprite frame index (into `trainer-pic-brendan-back.json`, frames
 * 0-3) Brendan's throw anim shows `t - BRENDAN_THROW_START_TICK` ticks in,
 * or `null` before the throw starts. Exactly `sAnimCmd_Brendan_1`'s frame
 * table (`back_pic_anims.h`): `FRAME(0,24), FRAME(1,9), FRAME(2,24),
 * FRAME(0,9), FRAME(3,50)` - pixel-confirmed exact (0 mismatch) for the
 * frame-0 span (1574-1596/1597), the frame-1 span (1599-1606), and the
 * frame-2 span's first 8 ticks (1608-1615) against
 * `battle1-menu-dense.json`. The final `FRAME(3,50)` span is Brendan's
 * already-fully-off-screen tail (see `brendanThrowDx`) - never actually
 * visible, included only for completeness/frame-index correctness.
 */
export function brendanThrowFrame(t: number): 0 | 1 | 2 | 3 | null {
  if (t < BRENDAN_THROW_START_TICK) return null;
  const et = t - BRENDAN_THROW_START_TICK;
  if (et < 24) return 0;
  if (et < 33) return 1;
  if (et < 57) return 2;
  if (et < 66) return 0;
  if (et < 116) return 3;
  return null;
}

/** Q8.8 fixed-point per-tick x step (`sprite->data[1]` after `InitAnimLinearTranslation`) - pixel-fit exact against every tick 1574-1596 (see module doc above; the source's own `data[2]=-40` is an OAM-space absolute target, not this delta, and this codebase doesn't have Brendan's starting OAM x extracted to re-derive it algebraically, so the fixed-point step itself is fit directly, matching the codebase's convention of trusting pixel evidence over unverified arithmetic chains). */
const BRENDAN_TRANSLATE_STEP = 615;
/** `sprite->data[0]` in `PlayerHandleIntroTrainerBallThrow` (`battle_controller_player.c:2938`) - the translation's tick duration; `AnimTranslateLinear` freezes `x2` at its final value once this many ticks have elapsed. */
const BRENDAN_TRANSLATE_DURATION = 50;

/**
 * Brendan's throw-pose sprite's horizontal OAM offset (`sprite->x2`, always
 * <=0) at tick `t`, or `null` before the throw starts. `AnimTranslateLinear`
 * (`battle_anim_mons.c:1111`)'s Q8.8 accumulator: `x2(n) =
 * -floor(n*BRENDAN_TRANSLATE_STEP/256)` where `n` is the 1-based tick count
 * since the throw started (tick `BRENDAN_THROW_START_TICK` itself is n=1 -
 * the pose swap and the first translation step are pixel-confirmed to
 * land the same tick, no 1-tick gap). Freezes at n=50 (matches source:
 * `AnimTranslateLinear` returns early once `data[0]` hits 0, no further
 * `x2` change) - by then Brendan is far off the left edge of the screen
 * (x2=-120), so the freeze has no visible effect within this window.
 */
export function brendanThrowDx(t: number): number | null {
  if (t < BRENDAN_THROW_START_TICK) return null;
  const n = Math.min(t - BRENDAN_THROW_START_TICK + 1, BRENDAN_TRANSLATE_DURATION);
  return -Math.floor((n * BRENDAN_TRANSLATE_STEP) / 256);
}

/** GBA `Sin(index, amplitude)` (`trig.c:515`): `(amplitude * gSineTable[index & 0xFF]) >> 8` with `gSineTable[i] = round(sin(i*pi/128)*256)` (Q8.8) and a true arithmetic (floor) right shift - reproduced from the trig LUT's own generating formula (`trig.c`'s table is exactly a rounded Q8.8 sine table, cross-checked against its own source comments for several indices this session) rather than approximated with a float shortcut. */
function gbaSin(index: number, amplitude: number): number {
  const idx = ((index % 256) + 256) % 256;
  const tableValue = Math.round(Math.sin((idx * Math.PI) / 128) * 256);
  return Math.floor((amplitude * tableValue) / 256);
}

/**
 * The thrown Poke Ball first becomes visible this tick - `Task_DoPokeballSendOutAnim`
 * (`pokeball.c:352`) spawns it at OAM-space **center** (24,68)
 * (`sprite->x/y` are center coordinates in this engine's sprite convention,
 * confirmed by this offset landing exactly 8px - half the 16x16 ball
 * sprite's width/height - inside the pixel-fit top-left corner (16,60), not
 * assumed). This tick itself (`n=0`) is `SpriteCB_PlayerMonSendOut_1`'s
 * setup call - no motion yet, pixel-confirmed 0 mismatch at the spawn
 * position.
 */
export const PLAYER_THROW_BALL_START_TICK = 1607;

/**
 * Last tick this module models exactly (pixel-confirmed 0 mismatch/112px
 * every tick 1607-1614 against `battle1-menu-dense.json`). **Correction to
 * this doc's own §3**: the "`HIBYTE(data[7]) ∈ [35,80)` branch is dead code
 * for a singles player battler" claim is WRONG - that branch's *guard*
 * reads `data[7]`, but `data[7]` is also the exact field
 * `TranslateAnimHorizontalArc` (the arc helper this same callback calls)
 * accumulates by `data[6]=1310` every tick, entirely independent of
 * `sBattler`. Solving `floor(n*1310/256) ∈ [35,80)` gives `n>=7`
 * (`floor(7*1310/256)=35` exactly) - which lands exactly on the tick this
 * session's pixel search stops finding an exact match (n=8, tick 1615).
 * That branch (entered once, `oam.affineParam & 0xFF00 == 0`) starts a real
 * GBA affine sprite animation (`StartSpriteAffineAnim(sprite, 4)` - a
 * rotate/scale "ball spin" over an affine-matrix keyframe table this
 * codebase hasn't extracted or built a renderer for) and simultaneously
 * cuts the horizontal step to 1/3 and slows the duration countdown to
 * roughly 1-in-3 ticks. This is a genuinely new, non-trivial mechanism
 * (distinct from the plain Q8.8 sine-arc arithmetic modeled here) -
 * flagged as the exact blocker for extending this window past tick 1614,
 * not attempted this session.
 */
export const PLAYER_THROW_BALL_EXACT_END_TICK = 1614;

const BALL_ARC_X_STEP = 491; // Q8.8: floor((72-24)<<8 / 25), target center x=72 (sBattlerCoords[singles][player].x)
const BALL_ARC_Y_STEP = 450; // Q8.8: floor((112-68)<<8 / 25), target center y=112 - pixel-fit exact (see module doc); consistent with GetBattlerSpriteCoord Y_PIC_OFFSET+24
const BALL_ARC_HEIGHT = -30; // sprite->data[5], SpriteCB_PlayerMonSendOut_1 (pokeball.c:915)
const BALL_ARC_ACCUM_STEP = 1310; // sprite->data[6] = 0x8000 / 25 (InitAnimArcTranslation, battle_anim_mons.c:791)

/**
 * Top-left screen pixel of the thrown ball's closed-pose (16x16) sprite at
 * tick `t`, or `null` outside `[PLAYER_THROW_BALL_START_TICK,
 * PLAYER_THROW_BALL_EXACT_END_TICK]`. `TranslateAnimHorizontalArc`
 * (`battle_anim_mons.c:794`): linear x/y step (`AnimTranslateLinear`) plus a
 * sine-table arc bump added to y only. Pixel-fit exact (0/112px mismatch)
 * against every tick in the modeled range - see `PLAYER_THROW_BALL_EXACT_END_TICK`
 * for why the range stops at 1614.
 */
/**
 * The player-side party-status-summary bar+icons (the "ball icon change"
 * flagged in PROGRESS #93 - pixel-confirmed at x150-239/y88-99 against
 * `battle1-menu-dense.json`, not a new sprite: the *existing* status-bar/
 * icon draw needs to alpha-blend against the framebuffer instead of
 * drawing flat once this fade starts) begin an alpha-blend fade-out the
 * same tick Brendan's throw starts -
 * `PlayerHandleIntroTrainerBallThrow` reassigns
 * `gTasks[gBattlerStatusSummaryTaskId[...]].func = Task_HidePartyStatusSummary`
 * in the same call that kicks off the throw (`battle_controller_player.c:2954-2955`).
 * `Task_HidePartyStatusSummary_BattleStart_1` (`battle_interface.c:1727`)
 * decrements `BLDALPHA`'s blend coefficient by 1 every OTHER tick (its own
 * `data[11]` alternates), starting from `tBlend=16` (opaque - set up the
 * same tick the hide task is assigned, `battle_interface.c:1689`, so tick
 * `PLAYER_SUMMARY_FADE_START_TICK` itself is still visually unblended) down
 * to 0. Pixel-confirmed exact (0 mismatch) against every tick 1574-1604 of
 * the dense trace - `eva` holds at 0 from there (the task's next phase
 * destroys the sprites in stages, invisible since they're already fully
 * background-blended).
 */
export const PLAYER_SUMMARY_FADE_START_TICK = BRENDAN_THROW_START_TICK;

/** `BLDALPHA_BLEND(eva, 16-eva)`'s `eva` coefficient (0..16) for the player status-bar/icon fade at tick `t`, or `null` before the fade starts (draw flat, unblended). See `PLAYER_SUMMARY_FADE_START_TICK`'s doc comment for the mechanism. */
export function playerSummaryFadeEva(t: number): number | null {
  if (t < PLAYER_SUMMARY_FADE_START_TICK) return null;
  const c = t - PLAYER_SUMMARY_FADE_START_TICK;
  const k = Math.min(16, Math.ceil(c / 2));
  return 16 - k;
}

/**
 * `SpriteCB_StatusSummaryBalls_Exit` (`battle_interface.c:1878`), player
 * side (`Task_HidePartyStatusSummary`'s `else` branch, `:1704-1709`): icon
 * `i` (0-5, left to right) gets a `7*i`-tick predelay
 * (`data[1]=7*i`), then an accelerating leftward slide - each active tick
 * adds `56` to an accumulator (masked to the top nibble, `data[3]&0xFFF0`)
 * and folds `accumulator>>4` into `x2`; because the accumulator starts at 0
 * and grows by exactly 56/tick, the fold-in is exactly `3*k` on the k-th
 * active tick (1-indexed), so the closed form is the triangular sum
 * `-3*K*(K+1)/2`. Pixel-fit exact against `battle1-menu-dense.json`
 * (icon 0's displacement at tick 1580, K=6: `-3*6*7/2=-63`, matching the
 * oracle's observed x exactly).
 */
export function playerSummaryIconExitDx(t: number, iconIndex: number): number {
  if (t < PLAYER_SUMMARY_FADE_START_TICK) return 0;
  const c = t - PLAYER_SUMMARY_FADE_START_TICK;
  const k = c - 7 * iconIndex;
  if (k <= 0) return 0;
  return -3 * ((k * (k + 1)) / 2);
}

/** `SpriteCB_StatusSummaryBar_Exit` (`battle_interface.c:1823`): no predelay: `data[1]+=32` then `x2 += data[1]>>4` then `data[1]&=0xF` - since `data[1]` starts at 0 and `+=32` never touches its low nibble, the mask leaves it at 0 forever, collapsing the "accelerating" ramp to a flat `+2`/tick (`32>>4`). Rightward (`data[0]>0` branch - `Task_HidePartyStatusSummary` halves the bar's existing positive `data[0]`, never negative). */
export function playerSummaryBarExitDx(t: number): number {
  if (t < PLAYER_SUMMARY_FADE_START_TICK) return 0;
  return -2 * (t - PLAYER_SUMMARY_FADE_START_TICK);
}

export function playerThrowBallTopLeft(t: number): { x: number; y: number } | null {
  if (t < PLAYER_THROW_BALL_START_TICK || t > PLAYER_THROW_BALL_EXACT_END_TICK) return null;
  const n = t - PLAYER_THROW_BALL_START_TICK;
  const dx = Math.floor((n * BALL_ARC_X_STEP) / 256);
  const linearDy = Math.floor((n * BALL_ARC_Y_STEP) / 256);
  const arcIdx = Math.floor((n * BALL_ARC_ACCUM_STEP) / 256);
  const dy = linearDy + gbaSin(arcIdx, BALL_ARC_HEIGHT);
  return { x: 16 + dx, y: 60 + dy };
}

// --- Slice 3: the ball-spin GBA affine keyframe animation (docs/
// battle-menu-notes.md §3 item 4, PROGRESS #94/#96's named blocker) - trace
// tick PLAYER_THROW_BALL_SPIN_START_TICK (1615) through PLAYER_THROW_BALL_ARRIVE_TICK
// (1651), re-derived source-exact from `SpriteCB_PlayerMonSendOut_2`
// (`reference/pokeemerald/src/pokeball.c:915-953`) and RAM-ground-truthed
// against `battle1-menu-dense.json` (`tools/probe/specs/menu-ballspin-scan.json`,
// gSprites[5] confirmed the ball's slot via its callback pointer,
// `tools/probe/dump-task-and-sprite-callbacks.py`).
//
// Source chain: once `HIBYTE(data[7])` (the arc's own sine-index accumulator,
// see `playerThrowBallTopLeft`'s doc comment) first reaches 35 - RAM tick
// 1614 - the `HIBYTE(data[7]) in [35,80)` branch activates for the first
// time (`oam.affineParam & 0xFF00 == 0` guard) and:
//   1. halves^H^Hthirds the translation speed: `data[1]`/`data[2]` (the
//      Q8.8 x/y step `AnimTranslateLinear` uses) are each replaced by
//      `((data[N]/3) & ~1) | (data[N]&1)` (parity-preserving truncated
//      division - the low bit encodes the sign-negate flag `AnimTranslateLinear`
//      itself reads, so it must survive the divide unchanged).
//   2. `StartSpriteAffineAnim(sprite, 4)` starts `sAffineAnim_BallRotate_4`
//      (`pokeball.c:190-194`): `AFFINEANIMCMD_FRAME(0, 0, 25, 1)` then
//      `AFFINEANIMCMD_JUMP(0)` - an infinite loop that adds rotation 25 (u8
//      units, 256=360deg) once per tick forever, xScale/yScale delta 0 (stays
//      at the neutral 256 the anim system resets to on `StartSpriteAffineAnim`,
//      `sprite.c:1277-1279`). This is genuinely the FIRST true (nonzero
//      rotation) affine matrix this codebase models - mechanism 4/5's own
//      `rotation` is always literally 0 (`docs/battle-scene-notes.md` §7.17).
//   3. every tick thereafter, `data[7]` still advances (by
//      `sprite->sBattler/3` - NOT the original battler index; `sBattler` is
//      `#define`d `data[6]`, which `InitAnimArcTranslation` had already
//      overwritten with the arc's own angular step 1310 (`pokeball.c:790`),
//      so this reads 1310/3=436/tick, not 0 - RAM-confirmed exact) until
//      `HIBYTE(data[7])>=80` (~26 ticks later), at which point the branch's
//      condition itself goes false and `SpriteCB_PlayerMonSendOut_2` falls
//      back to the plain `TranslateAnimHorizontalArc` else-branch (restoring
//      the x3 speed) to coast the last few ticks to the arc's actual target -
//      but the affine anim keeps looping regardless (it's driven by
//      `AnimateSprite`'s own per-tick affine-anim processing, independent of
//      which branch the sprite's OWN callback takes), so the ball keeps
//      visibly spinning all the way through arrival. Arrival itself (RAM
//      tick 1650, RAM-confirmed via the ball's callback switching from
//      `SpriteCB_PlayerMonSendOut_2` to `SpriteCB_ReleaseMonFromBall`) resets
//      the affine anim to index 0 (`sAffineAnim_BallRotate_0`, an identity
//      no-op) and snaps the sprite's real x/y to its final center (72,115).
//
// **Render lag** (§7.21's convention, RAM-confirmed here too - the brief's
// "check this first" flag was worth heeding): trace/screen tick T shows RAM
// tick T-1's sprite state, cross-validated against the ALREADY-exact
// `playerThrowBallTopLeft` window itself (e.g. screen tick 1614's dx=13
// matches RAM tick 1613's `x2`, not RAM tick 1614's) before trusting it for
// the new ticks.
//
// `BALL_SPIN_TABLE` is RAM tick (1614+k)'s full state, rendered at screen
// tick 1615+k (k=0..35, RAM 1614-1649): `x2`/`y2` (already includes both
// `AnimTranslateLinear`'s linear term and the `Sin(...)` arc-bump term added
// on top, same as `playerThrowBallTopLeft`'s combined `dy` - not decomposed
// since the combined pair is what RAM actually shows) plus `pa`/`pb`/`pc`/`pd`
// (`gOamMatrices[3]`, the ball's assigned matrix slot - identified via
// `tools/probe/dump-task-and-sprite-callbacks.py` matching `gSprites[5]`'s
// callback pointer to `SpriteCB_PlayerMonSendOut_2`). The matrix is a clean
// closed form in principle (`pa=Cos(25*(k+1) mod 256, 256)`, etc. - see
// `sAffineAnim_BallRotate_4`'s derivation above), and a first pass computed
// it that way; kept as a literal table instead because this codebase's
// `gbaSin` (a `Math.sin`-based re-derivation of `gSineTable`, not a literal
// copy - see its own doc comment) is off by up to 1 Q8.8 unit from the real
// table at a handful of the 256 indices, which the sine-ARC mechanisms never
// noticed (a +-1px `y2` bump rarely flips a rendered pixel) but a rotate
// SAMPLE kernel does (a +-1 matrix unit can flip which source texel an edge
// pixel reads) - confirmed by brute-force comparison against the oracle
// (sparse 1-11px edge diffs at exactly the ticks whose derived angle hit one
// of `gbaSin`'s imprecise indices; 0 diff once swapped for the RAM-exact
// values below).
const BALL_SPIN_TABLE: readonly { x2: number; y2: number; pa: number; pb: number; pc: number; pd: number }[] = [
  { x2: 14, y2: -12, pa: 209, pb: -147, pc: 147, pd: 209 },
  { x2: 14, y2: -12, pa: 86, pb: -241, pc: 241, pd: 86 },
  { x2: 15, y2: -11, pa: -68, pb: -246, pc: 246, pd: -68 },
  { x2: 15, y2: -12, pa: -197, pb: -162, pc: 162, pd: -197 },
  { x2: 16, y2: -12, pa: -255, pb: -18, pc: 18, pd: -255 },
  { x2: 17, y2: -13, pa: -219, pb: 131, pc: -131, pd: -219 },
  { x2: 17, y2: -12, pa: -103, pb: 234, pc: -234, pd: -103 },
  { x2: 18, y2: -12, pa: 49, pb: 251, pc: -251, pd: 49 },
  { x2: 19, y2: -12, pa: 185, pb: 176, pc: -176, pd: 185 },
  { x2: 19, y2: -11, pa: 253, pb: 37, pc: -37, pd: 253 },
  { x2: 20, y2: -12, pa: 228, pb: -115, pc: 115, pd: 228 },
  { x2: 20, y2: -11, pa: 120, pb: -225, pc: 225, pd: 120 },
  { x2: 21, y2: -11, pa: -31, pb: -254, pc: 254, pd: -31 },
  { x2: 22, y2: -10, pa: -171, pb: -189, pc: 189, pd: -171 },
  { x2: 22, y2: -9, pa: -249, pb: -56, pc: 56, pd: -249 },
  { x2: 23, y2: -9, pa: -236, pb: 97, pc: -97, pd: -236 },
  { x2: 24, y2: -8, pa: -136, pb: 216, pc: -216, pd: -136 },
  { x2: 24, y2: -8, pa: 12, pb: 255, pc: -255, pd: 12 },
  { x2: 25, y2: -7, pa: 157, pb: 201, pc: -201, pd: 157 },
  { x2: 26, y2: -6, pa: 244, pb: 74, pc: -74, pd: 244 },
  { x2: 26, y2: -6, pa: 243, pb: -80, pc: 80, pd: 243 },
  { x2: 27, y2: -5, pa: 152, pb: -205, pc: 205, pd: 152 },
  { x2: 27, y2: -5, pa: 6, pb: -255, pc: 255, pd: 6 },
  { x2: 28, y2: -3, pa: -142, pb: -212, pc: 212, pd: -142 },
  { x2: 29, y2: -3, pa: -238, pb: -92, pc: 92, pd: -238 },
  { x2: 29, y2: -1, pa: -248, pb: 62, pc: -62, pd: -248 },
  { x2: 31, y2: 2, pa: -167, pb: 193, pc: -193, pd: -167 },
  { x2: 33, y2: 6, pa: -25, pb: 254, pc: -254, pd: -25 },
  { x2: 35, y2: 10, pa: 126, pb: 222, pc: -222, pd: 126 },
  { x2: 37, y2: 15, pa: 231, pb: 109, pc: -109, pd: 231 },
  { x2: 39, y2: 20, pa: 252, pb: -43, pc: 43, pd: 252 },
  { x2: 41, y2: 25, pa: 181, pb: -181, pc: 181, pd: 181 },
  { x2: 43, y2: 29, pa: 43, pb: -252, pc: 252, pd: 43 },
  { x2: 45, y2: 35, pa: -109, pb: -231, pc: 231, pd: -109 },
  { x2: 46, y2: 41, pa: -222, pb: -126, pc: 126, pd: -222 },
  { x2: 48, y2: 47, pa: -254, pb: 25, pc: -25, pd: -254 },
];

/** First trace tick the ball's affine "spin" is visible (RAM tick 1614's matrix, one tick lagged - see the module doc above). */
export const PLAYER_THROW_BALL_SPIN_START_TICK = 1615;

/** The tick the ball sprite settles at its final center (72,115) with the affine matrix reset to identity (RAM tick 1650's state, one tick lagged) - `SpriteCB_ReleaseMonFromBall` takes over the NEXT RAM tick and starts the (out-of-scope, separately-named) ball-open/materialize sequence, first visible the tick after this one. Last tick this module models. */
export const PLAYER_THROW_BALL_ARRIVE_TICK = 1651;

const BALL_SPIN_CENTER_X = 24;
const BALL_SPIN_CENTER_Y = 68;
const BALL_ARRIVE_CENTER_X = 72;
const BALL_ARRIVE_CENTER_Y = 115;
const BALL_SPIN_NEUTRAL_SCALE = 256; // xScale/yScale delta 0 - stays at StartSpriteAffineAnim's reset neutral (sprite.c:1277-1279)

/**
 * The thrown ball's OAM-space center + affine matrix (`{pa,pb,pc,pd}`, the
 * literal GBA OAM matrix registers - `ObjAffineSet`'s output, `sprite.c:
 * 1302-1313`: `pa=Cos(angle,xScale)`, `pb=-Sin(angle,xScale)`,
 * `pc=Sin(angle,yScale)`, `pd=Cos(angle,yScale)`, `angle = 25*(k+1) mod 256`
 * for `sAffineAnim_BallRotate_4`) at tick `t`, or `null` outside
 * `[PLAYER_THROW_BALL_SPIN_START_TICK, PLAYER_THROW_BALL_ARRIVE_TICK]`.
 * RAM-ground-truthed exact (`gOamMatrices[3]`, RAM ticks 1614-1650) - see the
 * module doc above (`BALL_SPIN_TABLE`) for the full derivation, why the
 * matrix is a literal table rather than computed from `angle` directly, and
 * the render-lag convention.
 */
export function playerThrowBallSpin(t: number): { centerX: number; centerY: number; pa: number; pb: number; pc: number; pd: number } | null {
  if (t < PLAYER_THROW_BALL_SPIN_START_TICK || t > PLAYER_THROW_BALL_ARRIVE_TICK) return null;
  if (t === PLAYER_THROW_BALL_ARRIVE_TICK) {
    return { centerX: BALL_ARRIVE_CENTER_X, centerY: BALL_ARRIVE_CENTER_Y, pa: BALL_SPIN_NEUTRAL_SCALE, pb: 0, pc: 0, pd: BALL_SPIN_NEUTRAL_SCALE };
  }
  const k = t - PLAYER_THROW_BALL_SPIN_START_TICK;
  const entry = BALL_SPIN_TABLE[k]!;
  return {
    centerX: BALL_SPIN_CENTER_X + entry.x2,
    centerY: BALL_SPIN_CENTER_Y + entry.y2,
    pa: entry.pa,
    pb: entry.pb,
    pc: entry.pc,
    pd: entry.pd,
  };
}

// --- Slice 4: ONIX materializes (docs/battle-menu-notes.md §3 item 5) - the
// ball's own "open" pose swap. Same shared SpriteCB_ReleaseMonFromBall chain
// as the opponent's own materialize window (battleScene.ts's
// drawGrovyleMaterialize/drawPlayerMaterialize, which owns the actual
// silhouette/color-fade derivation) - this module owns only the ball's own
// timing/position, re-derived fresh against battle1-menu-dense.json since
// screen position/timing genuinely differ per side (docs/battle-anim-
// assets.md §5's own audit only confirmed the underlying assets, not tick
// alignment).

/** `StartSpriteAnim(sprite, 1)` (`sBallAnimSeq1`'s "open" frame) fires one tick after arrival - same 1-tick render-lag family as every other register in this window (RAM-confirmed pattern re-applied, not re-verified independently this session). */
export const PLAYER_BALL_OPEN_START_TICK = PLAYER_THROW_BALL_ARRIVE_TICK + 1; // 1652

/**
 * Last tick the ball's "open" pose is actually visible - RAM-probed directly
 * this session (`tools/probe/specs/menu-player-materialize.json`, `gSprites[5]`
 * - the same ball-sprite slot §3 item 4c already pinned - watching
 * `animCmdIndex`/`animDelayCounter`), correcting a prior session's
 * over-widened guess (was 1663). Source: `SpriteCB_ReleaseMonFromBall`'s
 * `StartSpriteAnim(sprite, 1)` selects `sBallAnimSeq1`
 * (`docs/battle-anim-assets.md` §2): `ANIMCMD_FRAME(4,5)` (the "open" pose,
 * held 5 ticks) THEN `ANIMCMD_FRAME(8,5)` (a genuinely blank, 0-opaque-pixel
 * frame - confirmed by direct scan of the committed
 * `battle-anim-ball-open.json` tileset, tiles 4-7 all-zero). RAM-confirmed:
 * `animCmdIndex` is 0 (open) for exactly RAM ticks 1651-1655 (`animDelayCounter`
 * 4,3,2,1,0 - 5 ticks, matching the source duration exactly), THEN flips to 1
 * (blank) at RAM tick 1656. With this window's established +1 render lag
 * (RAM tick N visible at render N+1 - re-confirmed here via the arrival
 * position itself: RAM tick 1650's `(x,y)` snapping to the settled center
 * matches the independently-established "arrival is exactly trace tick
 * 1651"), the open pose is visible at renders 1652-1656 only - **exactly**
 * the already-committed 0-diff span (`tools/compare/traces/
 * menu-materialize.json`, 5/5). This is also the SAME 5-tick window the
 * OPPONENT's own `drawSendOutBall` already implements
 * (`BALL_OPEN_START_OFFSET=18` to `BALL_INVISIBLE_START_OFFSET=23`, exactly
 * 5 ticks) - the opponent's own code was already right; the player's own
 * window had drifted wider than the shared mechanism actually is.
 * **Verified empirically** (`npm run compare` against `battle1-menu-dense.json`):
 * shrinking this window from 1663 back to 1656 leaves ticks 1657-1662
 * UNCHANGED (19/19/26/30/21/16px - this function's own drawn pixels never
 * overlapped that residual's specific positions even while the window was
 * wider, confirming the widening was never actually load-bearing for those
 * ticks) and newly fixes tick 1663 to exact 0 diff (was 1px) - a real, if
 * small, net improvement with no regressions. The residual at 1657-1662
 * remains open, re-scoped by this same session's re-derivation: it is NOT
 * this function's ball-open window (proven by the above A/B) and NOT
 * `drawPlayerMaterialize`'s accumulator/`y2` (re-brute-forced this session
 * with the full stack - BG fade + particles - in place; the current
 * `local+2`/`MATERIALIZE_Y2_TABLE` values are still the closest match to the
 * oracle's own exact-tint-pixel set at every tick, `tools/compare/scratch/
 * menu-audit/reprobe_player_materialize.mjs`). Every mismatched pixel's
 * color is exclusively in the ball's own (`battle-anim-ball-open.json`/
 * `summary-ball.json`) palette - not the particle palette
 * (`battle-anim-particles.json`, checked directly, no overlap) nor ONIX's own
 * back-sprite palette (checked directly, no overlap, and mathematically
 * incompatible with any single-coefficient blend toward the tint color) -
 * still unidentified this session; see `docs/battle-menu-notes.md` §3 item 5.
 */
export const PLAYER_BALL_OPEN_END_TICK = 1656;

/**
 * Last tick the ball's OWN openFinal pose (`sBallAnimSeq1`'s
 * `ANIMCMD_FRAME(8,5)`) is visible - the SAME missing-3rd-frame mechanism
 * PROGRESS #104 (`battle-scene-notes.md` §7.25) found for the opponent's own
 * ball (`LoadBallGfx`, `pokeball.c:1308-1332`, unconditionally DMAs
 * `graphics/balls/open.png` over that anim slot's nominally-blank tile data
 * at sprite creation - a shared, battler-generic code path, not an
 * opponent-only quirk), applied here to close this doc's own long-named
 * 1657-1662 residual (`docs/battle-menu-notes.md` §3 item 5's "still
 * unidentified" tail).
 *
 * RAM-probed directly (`tools/probe/specs/menu-player-materialize.json`,
 * `gSprites[5]` - the same ball slot `PLAYER_BALL_OPEN_END_TICK` already
 * pins): `ballAnimCmdIndex` flips 0->1 at RAM tick 1656 (the openFinal tile
 * takes over, immediately after the open pose's own 5-tick
 * `ANIMCMD_FRAME(4,5)` hold ends), `ballAnimDelay` counts 4,3,2,1,0 (5 more
 * ticks, matching `ANIMCMD_FRAME(8,5)`'s own duration exactly, RAM
 * 1656-1660), then holds at cmd-index 1 with `animEnded` newly set at RAM
 * 1661 (still visible - `HandleBallAnimEnd`, `pokeball.c:845`, only sets
 * `invisible` the FOLLOWING tick once its own callback next observes
 * `animEnded` true, the same 1-tick internal lag already established for
 * the opponent's analogous `animEnded`->`invisible` gap in §7.25). With this
 * window's established +1 render lag, the openFinal pose is visible at
 * renders 1657-1662 (6 ticks) - **pixel-confirmed, not just RAM-inferred**
 * (`tools/compare/scratch/menu-audit/classify_1657_1663.mjs` against fresh
 * oracle captures): every one of tick 1657's 19 residual pixels is an exact
 * match to `battle-anim-ball-open.json`'s openFinal tile content at this
 * window's own `BALL_OPEN_TOP_LEFT`/`PLAYER_BALL_OPEN_VISIBLE_BOTTOM`
 * position (19/19), and the large majority of ticks 1658-1662's own
 * residual too (17/19, 20/26, 26/30, 19/21, 14/16) - the remainder at those
 * ticks is a DIFFERENT, already-named class of bug (particle-position
 * pixels, oracle color `255,173,0`, not in this frame's own palette at
 * all - the same particle-vs-ball z-order family §7.25 named and left open
 * for the opponent's own send-out, not re-attempted here). Tick 1663 was
 * checked and confirmed NOT part of this window (`classify_1657_1663.mjs`
 * finds 0 residual pixels there already, and direct oracle sampling at
 * (67-72,107-111) shows the materialize tint color already fully replacing
 * the ball's own colors by then - the ball is already invisible, matching
 * the RAM trace's own destroy-adjacent timing) - widening one tick further
 * would have been the same over-widening mistake `PLAYER_BALL_OPEN_END_TICK`
 * itself was corrected away from.
 */
export const PLAYER_BALL_OPEN_FINAL_END_TICK = 1662;

/** The ball's settled center once arrived (`playerThrowBallSpin`'s own `BALL_ARRIVE_CENTER_X/Y`) - top-left of its 16x16 open-pose sprite. Also the openFinal pose's own top-left (same settled position, `PLAYER_BALL_OPEN_FINAL_END_TICK`'s own doc comment). */
const BALL_OPEN_TOP_LEFT = { x: BALL_ARRIVE_CENTER_X - 8, y: BALL_ARRIVE_CENTER_Y - 8 }; // (64,107)

/**
 * Screen y at/below which the ball's "open" pose is occluded by the
 * battlefield terrain graphic at the player's send-out screen position
 * (`docs/battle-anim-assets.md` §5's own named placement gap, resolved here
 * with direct pixel evidence rather than guessed): row-by-row pixel diff at
 * trace tick 1652 (`tools/compare/scratch/menu-audit/onix_ball_open_clip.mjs`)
 * shows only screen rows y=110-111 (the sprite's own top 2 opaque rows)
 * match the open-pose art exactly - every row y>=112 mismatches (real
 * terrain art there instead). Unlike the opponent's own ball sprite (fully
 * unoccluded at its screen position), the player's send-out lands the ball
 * mostly BEHIND the battlefield's foreground terrain tile.
 */
export const PLAYER_BALL_OPEN_VISIBLE_BOTTOM = 112;

/** The ball's open/openFinal-pose top-left corner at tick `t` (both poses share the same settled-position corner), or `null` outside `[PLAYER_BALL_OPEN_START_TICK, PLAYER_BALL_OPEN_FINAL_END_TICK]`. Callers must clip the draw to `y < PLAYER_BALL_OPEN_VISIBLE_BOTTOM` (see its own doc comment) and pick the pose (open vs openFinal) by comparing `t` against `PLAYER_BALL_OPEN_END_TICK` (see that constant's own doc comment). */
export function playerBallOpenTopLeft(t: number): { x: number; y: number } | null {
  if (t < PLAYER_BALL_OPEN_START_TICK || t > PLAYER_BALL_OPEN_FINAL_END_TICK) return null;
  return BALL_OPEN_TOP_LEFT;
}

// --- The pre-existing ~1653+ full-frame residual named in PROGRESS.md #98 /
// docs/battle-menu-notes.md §3 item 5's "Next" list, root-caused this
// session: `SpriteCB_ReleaseMonFromBall` (`pokeball.c:758`) calls
// `LaunchBallFadeMonTask(TRUE, sprite->sBattler, 14, ballId)` for BOTH
// battlers (the call site is battler-generic, `reference/pokeemerald/
// src/pokeball.c:758`) - i.e. the SAME `BeginNormalPaletteFade(selectedPalettes
// =14, 0, 0, 16, RGB_WHITE)` BG-to-white materialize dither
// `battleScene.ts`'s `SENDOUT_BG_FADE_Y` already models for the opponent's
// own send-out fires AGAIN, independently, for the player's own ONIX
// release - a second cycle of the identical mechanism, not a new one.
//
// Verified by direct pixel decode against `battle1-menu-dense.json`
// (`tools/compare/scratch/menu-audit/decode_player_bgfade.mjs`), NOT
// curve-fit: reversing the already-validated `blendComponentToWhite`
// formula (`c5 + (((31-c5)*y)>>4)` per 5-bit channel, then re-expand) against
// two independent clean background swatches, (165,52) and (194,51) -
// confirmed clean (a genuine static bg tile, constant through tick 1652) by
// sampling every tick 1600-1652 first, matching this doc's own established
// swatch-picking discipline (§7.10). The (165,52) swatch decodes to a
// PERFECTLY clean, exact y sequence at every one of the 37 affected ticks
// (1653-1689) with all 3 channels agreeing every tick: 2,2,4,4,6,6,8,8,10,
// 10,12,12,14,14,14,16x8,14,14,12,12,10,10,8,8,6,6,4,4,2,2 - byte-IDENTICAL
// to `SENDOUT_BG_FADE_Y`'s own 37-entry table, including its same 3-tick
// y=14 hold irregularity at both the up-ramp and (symmetrically) nothing
// extra on the down-ramp (matches the up-ramp's own hold, not a new one).
// The second swatch (194,51) cross-validates the same y sequence on its
// blue channel exactly (its r/g channels show harmless quantization
// aliasing at a few ticks - expected, since that swatch's own unfaded c5
// values are different and floor-round differently at intermediate y, not
// evidence against the shared table). This is the SAME table reused
// verbatim, not re-derived by coincidence.
//
// Start tick, decoded not guessed: 1653 = `PLAYER_BALL_OPEN_START_TICK`+1 -
// the exact same "one tick after the ball's own open-pose swap" offset
// `SENDOUT_BG_FADE_START`'s own derivation used for the opponent
// (handoffTick+18 ball-open -> handoffTick+19 fade start, §7.10/§7.20) -
// strong independent confirmation this is the ball-release chain's own
// fixed timing convention, not tick 1653 chosen to fit.

/** Literal per-tick blend coefficient `y` (0-16), indexed from `PLAYER_BG_FADE_START_TICK` - byte-identical to `battleScene.ts`'s own `SENDOUT_BG_FADE_Y` (see the module doc above for the decode). */
const PLAYER_BG_FADE_Y: readonly number[] = [
  2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14, 14, // ramp up (1653-1667), incl. the 3-tick y=14 hold
  16, 16, 16, 16, 16, 16, 16, 16, // white plateau (1668-1675)
  14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, // ramp down (1676-1687)
  2, 2, // 1688-1689
];

/** First trace tick the player-side materialize BG-to-white fade takes a step (one tick after `PLAYER_BALL_OPEN_START_TICK`, see the module doc above). */
export const PLAYER_BG_FADE_START_TICK = PLAYER_BALL_OPEN_START_TICK + 1; // 1653

/** The player-side materialize BG-to-white blend coefficient (0-16, see `battleScene.ts`'s `drawTileBgFaded`) at absolute trace tick `t` - 0 (unfaded) outside `PLAYER_BG_FADE_Y`'s own covered range. */
export function playerMaterializeBgFadeY(t: number): number {
  return PLAYER_BG_FADE_Y[t - PLAYER_BG_FADE_START_TICK] ?? 0;
}

/**
 * Player healthbox slide-in (docs/battle-menu-notes.md S3 item 6 / S7 new
 * item). RAM-probed directly (`tools/probe/specs/menu-player-healthbox.json`,
 * `gSprites[0]` - `StartHealthboxSlideIn`'s target sprite per
 * `docs/battle-menu-idle-notes.md`'s own gSprites[0] pin), not pixel-fitted:
 * `callback` flips from `SpriteCallbackDummy` to `SpriteCB_HealthboxSlideIn`
 * (dummy's own literal value, `0x8010CE9`-family address) at RAM tick 1666,
 * where `x2` is first written **110** and steps **-5/RAM-tick** every tick
 * after (110, 105, 100, ..., 5), landing on **0** at RAM tick 1688 and
 * holding (callback reverts to the dummy value there too - matches
 * `docs/battle-menu-notes.md` S4's own "template callback is
 * SpriteCallbackDummy" finding for the settled sprite). `y2` stays 0
 * throughout - horizontal-only, unlike the opponent's own mechanism (which
 * is also x2-only, so this is the same convention, not a coincidence).
 * `oam.priority` RAM-read as **1** (`gSprites+0x04`, bits 10-11) - same
 * layer as the opponent's own healthbox and the ball-open particle family
 * (docs/battle-scene-notes.md S7.26).
 *
 * With this window's established +1 render lag (screen tick = RAM tick+1,
 * cross-checked the same way S3 item 4's own ball-arrival pin was: RAM 1666
 * -> render 1667, matching the pixel-derived first-visible tick and its
 * `dx=110` exactly, brute-force confirmed in isolation against the oracle's
 * own bounding-box growth before this was RAM-probed at all) - the box is
 * first visible at trace tick 1667 (`dx=110`, mostly off the right edge of
 * the 240px screen - only its own leftmost sliver is on-screen), steps -5
 * px/tick, and settles (`dx=0`) at trace tick 1689, holding from there.
 *
 * **No spatial overlap with ONIX**: unlike the brief's own working
 * assumption (a SortSprites-family z-order conflict during the slide,
 * mirroring the ball-open-particle family), the settled content's own
 * bbox (`src/assets/gen/menu-healthbox-player.json`, x0=127) never comes
 * within reach of ONIX's own materialize bbox (x<=104, `ONIX_MATERIALIZE_
 * CORNER`+64px sprite width) even at the slide's own maximum offset
 * (dx=110 -> left edge x=237) - pixel-confirmed (no oracle capture shows
 * the two regions' bounding boxes intersecting at any modeled tick). No
 * z-order/priority-tiebreak code is needed for this mechanism; the RAM
 * read above is recorded for completeness/future reuse, not because a
 * conflict was found.
 */
export const PLAYER_HEALTHBOX_SLIDE_START_TICK = 1667;
export const PLAYER_HEALTHBOX_SLIDE_START_DX = 110;
export const PLAYER_HEALTHBOX_SLIDE_STEP = 5;
export const PLAYER_HEALTHBOX_SLIDE_SETTLE_TICK = 1689;

/** Player healthbox content-image x offset (added to its extracted `x`) at trace tick `t`, or `null` before it's created (fully off-screen - `drawSendOutHealthboxPlayer`'s caller need not special-case this, `setPixel` already clips). */
export function playerHealthboxSlideDx(t: number): number | null {
  if (t < PLAYER_HEALTHBOX_SLIDE_START_TICK) return null;
  if (t >= PLAYER_HEALTHBOX_SLIDE_SETTLE_TICK) return 0;
  return PLAYER_HEALTHBOX_SLIDE_START_DX - PLAYER_HEALTHBOX_SLIDE_STEP * (t - PLAYER_HEALTHBOX_SLIDE_START_TICK);
}

// --- Slice 4c (ISSUES #17): ONIX's own color-fade-to-true-color + settle
// wobble - the LAST unimplemented S6 window (docs/battle-menu-notes.md §3
// item 5's own named blocker: "the player window's LaunchBallFadeMonTask
// coefficient ramp entangles with the still-unresolved idle-bob mechanism
// starting ~1670... a non-monotonic residual, not a clean single-mechanism
// fit"). RAM-probed directly this session (`tools/probe/specs/menu-player-
// materialize-taskfade.json` - a full `gTasks[0..15]` scan reusing
// `sendout-grovyle-taskfade.json`'s own watch shape, PLUS `gSprites[6]`'s
// own `y2` field `menu-player-materialize.json` already watched), and
// cross-validated a SECOND, independent way (brute-force pixel decode
// against `battle1-menu-dense.json`'s own oracle captures, reversing
// `blendComponentToward` per-channel over every opaque ONIX texel -
// `tools/compare/scratch/menu-audit/decode_player_tint_scratch3.mjs`): both
// methods agree at every one of the 39 checked ticks (1664-1702), so this
// is ground truth, not a fit.
//
// **The color fade** (`Task_FadeMon_ToNormal`/`_Step`,
// `battle_anim_throw.c:2078-2102` - the OTHER effect of the SAME
// `LaunchBallFadeMonTask(TRUE, battler, 14, ballId)` call site §3 item 5
// already cites for the BG-white dither): the task is created at ball
// release with `tCoeff=16` (fully tinted, matching the existing
// `drawPlayerMaterialize` window's own constant tint) and sits frozen
// there polling `!gPaletteFade.active` (the concurrent BG-white flash,
// `PLAYER_BG_FADE_Y` above) until it clears - RAM-confirmed the poll
// resolves at RAM tick 1673 - then `Task_FadeMon_ToNormal_Step` decrements
// `tCoeff` by 1 every tick for 17 calls (RAM ticks 1674-1690: stored values
// 16,15,...,0 then task self-destroys) before true colors show. Folding in
// this window's own established render lag (a blend applied during RAM
// tick T is visible at render T+1, and a Step call's own stored result is
// the NEXT call's pre-decrement input - i.e. render R shows the
// coefficient that was live during RAM tick R-2) collapses to a clean
// closed form with no fitting needed: coefficient 16 constant through
// render 1675, then exactly one integer step down per tick.
//
// **The settle wobble** (§3 item 5's own "may be the DoBounceEffect
// pre-menu state or an affine tail" lead): confirmed NOT `DoBounceEffect`
// (`battle_controller_player.c:237-238`, `HandleInputChooseAction` - too
// small a range (amplitude 1) and that call site only runs once the action
// menu is polling for input, i.e. `MENU_DRAW_TICK`+ - a different,
// already-implemented mechanism, `menuIdleBounce`). RAM-probed instead
// (`gSprites[6].y2`): once ONIX's own affine scale-in finishes
// (`affineAnimEnded`, RAM tick 1666 - confirmed by the sprite callback
// switching that same tick), `BattleAnimateBackSprite` (`pokemon.c:6886`)
// launches ONIX's own species back-sprite entrance animation
// (`LaunchAnimationTaskForBackSprite`, source-confirmed
// `GetSpeciesBackAnimSet(SPECIES_ONIX) = BACK_ANIM_V_SHAKE` - a real
// vertical-shake entrance, one of 3 nature-dependent variants selected by
// `sBackAnimNatureModTable`) - a genuine THIRD animation, exactly as this
// doc's own lead warned ("treat it as a third, not-yet-attributed
// animation" - its ~11-tick apparent period doesn't match either the
// affine-emerge tail or the later idle-bounce cycle because it isn't
// either of them). Kept as a literal RAM-derived table per this run's
// established convention for exactly this situation
// (`MATERIALIZE_Y2_TABLE`/`GROVYLE_STRETCH_TABLE` precedent) rather than
// reverse-engineering which of the 3 nature-dependent `VerticalShake*`
// variants this particular save's ONIX resolves to: holds 0 through render
// 1669, then an irregular (non-monotonic, `Sin`-table-driven) bounce
// through render 1701, settling permanently at 0 from render **1702** on -
// the exact tick PROGRESS #109 independently corrected the scene's own
// full-frame settle pin to (cross-validating both derivations again: the
// wobble table and the pixel-sha settle pin agree on the same tick from
// two unrelated methods).

/** First render tick `drawPlayerMaterialize`'s own fixed-tint window (`PLAYER_MATERIALIZE_END_TICK`, `battleScene.ts`) hands off to the real per-tick fade+wobble below - one past its last-modeled tick, no gap or overlap. */
export const PLAYER_MATERIALIZE_SETTLE_START_TICK = 1664;
/** The real, permanent scene settle tick (PROGRESS #109's own corrected pin, replacing the wrong inherited 1693/1696) - `playerMaterializeSettleTintCoeff`/`playerMaterializeSettleY2` both independently reach their resting value (0) here. */
export const PLAYER_MATERIALIZE_SETTLE_TICK = 1702;

/** `Task_FadeMon_ToNormal_Step`'s `tCoeff` (0-16, `battleScene.ts`'s `blendComponentToward` blend target) at render tick `t` - RAM-derived per the module doc above, a plain closed form (constant, then a 1-unit-per-tick ramp), not a table. Only meaningful for `t >= PLAYER_MATERIALIZE_SETTLE_START_TICK`. */
export function playerMaterializeSettleTintCoeff(t: number): number {
  if (t <= 1675) return 16;
  return Math.max(0, 16 - (t - 1675));
}

/** `gSprites[6].y2` (RAM-read, 39 ticks 1664-1702 inclusive) - see the module doc above for why this is a literal table, not a formula. Indexed from `PLAYER_MATERIALIZE_SETTLE_START_TICK`; holds its last entry (0) forever past 1702 via the `?? 0` fallback below. */
const PLAYER_SETTLE_WOBBLE_Y2_TABLE: readonly number[] = [
  2, 0, 0, 0, 0, 0, 6, 11, 3, 1, 10, 9, 0, 3, 11, 6, 0, 7, 11, 3, 1, 10, 9, 0, 3, 11, 6, 0, 7, 11, 2, 1, 10, 9, 0, 4, 11, 6, 0,
];
/** ONIX's own settle-wobble `y2` (pixel offset) at render tick `t` - see `PLAYER_SETTLE_WOBBLE_Y2_TABLE`'s own doc comment. Only meaningful for `t >= PLAYER_MATERIALIZE_SETTLE_START_TICK`. */
export function playerMaterializeSettleY2(t: number): number {
  return PLAYER_SETTLE_WOBBLE_Y2_TABLE[t - PLAYER_MATERIALIZE_SETTLE_START_TICK] ?? 0;
}

// --- Slice 5: the settled first-action-menu window (docs/battle-menu-idle-
// notes.md, trace ticks 1742-1810) - the 6-tick teal blank box, the atomic
// menu draw, and the settled idle-bounce cycle. `battleScene.ts` composes
// this window almost entirely from oracle-harvested full-frame/region
// pixel content (docs/battle-menu-idle-notes.md's own §1 open item: "the
// engine slice must re-derive/model the menu idle independently" - the
// harvest supplies the PIXELS, this module supplies the real GENERATOR that
// selects among them) - see `tools/extract/extract-menu-idle-window.ts`'s
// own module doc for why full-frame/region harvests were chosen over a
// layered redraw for this window specifically (the settled composition
// underneath is a sibling lane's in-flight work, not yet available here).

/** First trace tick of the 6-tick teal blank box (message box cleared, no text) - byte-identical every tick through `MENU_IDLE_BLANK_END_TICK` (docs/battle-menu-idle-notes.md §4/battle-menu-notes.md §1, tick 1742). Source call not pinned (dossier §4, still open) - modeled from pixels, a flat harvested frame. */
export const MENU_IDLE_BLANK_START_TICK = 1742;
/** Last tick of the teal blank box, inclusive (battle-menu-notes.md §1, tick 1747) - `MENU_DRAW_TICK` (1748) is the very next tick. */
export const MENU_IDLE_BLANK_END_TICK = 1747;
/** The first-action-menu draw tick - atomic (off-screen draw + BG0-scroll reveal, docs/battle-menu-idle-notes.md §3's source-confirmed `PlayerHandleChooseAction`/`HandleChooseActionAfterDma3`): "What will ONIX do?" + FIGHT/BAG/POKéMON/RUN + cursor on FIGHT all appear in one tick, no partial draws. Also the first tick both idle-bounce driver sprites exist (still at their rest position this tick - `DoBounceEffect` itself doesn't fire until the NEXT screen tick, see `menuIdleBounce`'s own doc). */
export const MENU_DRAW_TICK = 1748;

/**
 * `gSineTable[0..255]` (`reference/pokeemerald/src/trig.c`), Q8.8 fixed
 * point, literal - NOT re-derived via `Math.sin` (unlike `gbaSin` above).
 * This session found `gbaSin` disagrees with the real table by exactly 1
 * unit at indices 62/63 (255 vs `Math.round`'s 256) - harmless for the
 * ball-arc's `y2` (a few points among a much larger accumulated position),
 * but load-bearing here: this window's bounce is driven by `Sin(index,1)`
 * alone, so a spurious `table[62]=256` flips `y2` from 1 to a phantom `2`
 * at a real, reachable tick (screen tick 1767 in this very window) that the
 * oracle never actually shows (RAM/pixel-confirmed against
 * `battle1-menu-dense.json` - `menuIdleBounce`'s own state, cross-checked
 * against every one of this window's 69 captured ticks with this literal
 * table, zero mismatches; the `Math.sin`-derived version mismatches at
 * ticks 1767/1804). Source values are already exact multiples of 1/256 in
 * `trig.c`'s own comments (e.g. `0.99609375 = 255/256`), so this table is
 * copied, not approximated.
 */
const GBA_SINE_TABLE_256: readonly number[] = [
  0, 6, 12, 18, 25, 31, 37, 43, 49, 56, 62, 68, 74, 80, 86, 92,
  97, 103, 109, 115, 120, 126, 131, 136, 142, 147, 152, 157, 162, 167, 171, 176,
  181, 185, 189, 193, 197, 201, 205, 209, 212, 216, 219, 222, 225, 228, 231, 234,
  236, 238, 241, 243, 244, 246, 248, 249, 251, 252, 253, 254, 254, 255, 255, 255,
  256, 255, 255, 255, 254, 254, 253, 252, 251, 249, 248, 246, 244, 243, 241, 238,
  236, 234, 231, 228, 225, 222, 219, 216, 212, 209, 205, 201, 197, 193, 189, 185,
  181, 176, 171, 167, 162, 157, 152, 147, 142, 136, 131, 126, 120, 115, 109, 103,
  97, 92, 86, 80, 74, 68, 62, 56, 49, 43, 37, 31, 25, 18, 12, 6,
  0, -6, -12, -18, -25, -31, -37, -43, -49, -56, -62, -68, -74, -80, -86, -92,
  -97, -103, -109, -115, -120, -126, -131, -136, -142, -147, -152, -157, -162, -167, -171, -176,
  -181, -185, -189, -193, -197, -201, -205, -209, -212, -216, -219, -222, -225, -228, -231, -234,
  -236, -238, -241, -243, -244, -246, -248, -249, -251, -252, -253, -254, -254, -255, -255, -255,
  -256, -255, -255, -255, -254, -254, -253, -252, -251, -249, -248, -246, -244, -243, -241, -238,
  -236, -234, -231, -228, -225, -222, -219, -216, -212, -209, -205, -201, -197, -193, -189, -185,
  -181, -176, -171, -167, -162, -157, -152, -147, -142, -136, -131, -126, -120, -115, -109, -103,
  -97, -92, -86, -80, -74, -68, -62, -56, -49, -43, -37, -31, -25, -18, -12, -6,
];

/** `Sin(index, 1)` (`trig.c:515`) via the literal table: `table[index & 0xFF] >> 8`, a true arithmetic (floor) shift. */
function bounceSin(index: number): number {
  const v = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor(v / 256);
}

/** `sprite->sSinIndex` (region A, ONIX battler sprite / `BOUNCE_MON`) at RAM ticks since `DoBounceEffect`'s setup call - seeded 192, `+=7` every tick (docs/battle-menu-idle-notes.md §1). */
function onixSinIndex(ramTicksSinceSetup: number): number {
  return 192 + 7 * ramTicksSinceSetup;
}
/** Same as `onixSinIndex`, region B (healthbox main sprite / `BOUNCE_HEALTHBOX`) - seeded 128. */
function healthboxSinIndex(ramTicksSinceSetup: number): number {
  return 128 + 7 * ramTicksSinceSetup;
}

/** RAM tick `DoBounceEffect`'s one-time setup runs (`HandleInputChooseAction`'s first tick) - one tick *after* `MENU_DRAW_TICK`'s screen-visible reveal, since the bounce is a later controller-func state (docs/battle-menu-idle-notes.md §1's "phase origin" derivation). Screen tick `MENU_DRAW_TICK + 1` (1749) is the first screen tick that can show a nonzero bounce (the window's established +1 render lag - see `menuIdleBounce`). */
const MENU_BOUNCE_RAM_SETUP_TICK = MENU_DRAW_TICK;

/** Region A (`gSprites[gBattlerSpriteIds[player]]`, the ONIX battler sprite itself) / region B (`gSprites[gHealthboxSpriteIds[player]]`, the healthbox main sprite) `y2` bounce offsets (0-2px, vertical only) at absolute trace/screen tick `t`. Pure closed-form generator (docs/battle-menu-idle-notes.md §1) - `screenTick T` shows RAM tick `T-1`'s sprite state (this window's own established render-lag convention, re-derived and RAM-confirmed independently of `battle-menu-notes.md`'s ball-arc convention). Both are 0 before the bounce starts (RAM tick < `MENU_BOUNCE_RAM_SETUP_TICK`, i.e. screen tick <= `MENU_DRAW_TICK`). */
export function menuIdleBounce(t: number): { onixY2: number; healthboxY2: number } {
  const ramTick = t - 1;
  if (ramTick < MENU_BOUNCE_RAM_SETUP_TICK) return { onixY2: 0, healthboxY2: 0 };
  const n = ramTick - MENU_BOUNCE_RAM_SETUP_TICK;
  return {
    onixY2: bounceSin(onixSinIndex(n)) + 1,
    healthboxY2: bounceSin(healthboxSinIndex(n)) + 1,
  };
}

// --- Slice 6: the FIGHT (move-select) submenu window (docs/battle-turn-
// notes.md §11, the twice-run 0-mismatch groundtruth traces
// battle1-fight-submenu-nav.json/-idle.json). Extends the settled
// action-menu chain (Slice 5 above) past its first A-press: FIGHT opens a
// 4-move grid (Onix's fixed moveset ROCK_SLIDE/BIND/DRAGON_BREATH/
// SANDSTORM), JOY_NEW-gated (no auto-repeat, empirically confirmed - §11
// finding 2's held-DOWN check) cursor nav with a 1-tick render lag, B
// closes back to the action menu's own idle cycle RESUMED IN PLACE (not
// reset - §11 finding 3).
//
// State machine only - the window's own TEXT/cursor content
// (`fight-submenu-window.json`, `extract-fight-submenu-window.ts`) is a
// per-slot STATIC oracle harvest (pixel-confirmed byte-identical across an
// entire slot's whole dwell, both of DRAGON_BREATH's two separate visits
// included - see that extractor's own doc), not a glyph-rendered redraw:
// FONT_NARROW (the real font backing the move-name/PP/type window family,
// `battle_message.c`'s B_WIN_MOVE_NAME_*/B_WIN_PP/B_WIN_MOVE_TYPE templates)
// isn't extracted anywhere in this codebase (only FONT_NORMAL/FONT_SMALL
// are - a real, source-confirmed gap: `FontFunc_Narrow` reads
// `gFontNarrowLatinGlyphs`, a wholly separate glyph tileset from
// `gFontNormalLatinGlyphs`, not just a narrower-width table over the same
// glyphs). Flagged for whoever needs FONT_NARROW next; sidestepped here
// since the per-slot harvest approach the settled action menu itself
// already established (Slice 5) covers this atomic, non-progressive window
// exactly as well without it.

/** Ticks after the A-press before the submenu's off-screen-drawn content hard-cuts into view (§11 finding 1: DMA-wait, pixel-fit exact against the groundtruth trace - press tick 1887 -> reveal tick 1892). */
export const FIGHT_SUBMENU_OPEN_DELAY = 5;
/** Ticks after the B-press before the resumed action menu's content hard-cuts back into view (pixel-fit exact against the groundtruth trace this session - press tick 2047 -> reveal tick 2053; §11 finding 3's own "2-tick hold" describes the RAM-side redraw calls, not this full pixel-visible round-trip through `PlayerHandleChooseAction`'s own fresh DMA-wait - see docs/battle-menu-notes.md's new section for the derivation). */
export const FIGHT_SUBMENU_CLOSE_DELAY = 6;

/**
 * The settled action-menu idle cycle's own bounce (`menuIdleBounce`) is
 * driven by an invisible sprite created ONCE by `HandleInputChooseAction`
 * and never reset while FIGHT is open (`HandleInputChooseMove` doesn't call
 * `DoBounceEffect`/`EndBounceEffect` at all - source-confirmed, not
 * assumed) - so in principle the exact same closed form should apply
 * unmodified for the submenu's own idle-cycle overlay too. Empirically it
 * does NOT: dense pixel comparison against the oracle (this session)
 * found the submenu's own bounce overlay needs `menuIdleBounce(t - 2)`
 * (0/160 mismatches across the full nav groundtruth window, every slot
 * checked), and the RESUMED action menu (post B-close) needs a FURTHER
 * `t - 4` (`FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT` - only 1/66 residual).
 * I.e. each of the two atomic hard-cut DMA-wait events (open, then the
 * close-and-redraw round-trip back through a fresh
 * `PlayerHandleChooseAction`) costs the bounce sprite's own per-frame
 * update exactly 2 more ticks of drift than this window's established
 * render-lag convention alone predicts. Plausible (not RAM-confirmed this
 * session) mechanism: the DMA copy is a genuine CPU-blocking transfer -
 * while it runs, no game logic (incl. the bounce sprite's own per-frame
 * `+=7`) executes for a couple of frames, even though the trace's own
 * frame/VBlank count keeps advancing regardless (frames are counted by
 * hardware VBlank, not by whether game logic ran that frame). Kept as a
 * literal pixel-fit constant per this run's own established convention for
 * exactly this situation (`BALL_SPIN_TABLE`/`MATERIALIZE_Y2_TABLE`
 * precedent) rather than asserted as proven source behavior.
 */
export const FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT = 2;
/** See `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`'s own doc - the second DMA-wait event (B-close's round-trip) costs 2 MORE ticks on top, for a cumulative 4. One single-tick residual remains even with this correction (tick 2073 of the nav groundtruth trace, unusual multi-region diff shape) - not root-caused this session; individually attributed alongside §11 finding 4's own two named idle-only-trace anomalies (2071/2135) as the same still-unidentified family, per this run's no-silent-exclusion policy. See `tools/compare/traces/fight-submenu.json` / docs/battle-menu-notes.md's new section. */
export const FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT = 4;

export type FightSubmenuSlot = 0 | 1 | 2 | 3;

/** Onix's fixed 4-move battle-1 moveset, in `gMoveSelectionCursor` slot order (§11 finding 2, RAM-confirmed via `gBattleMons`) - the asset-key order `fight-submenu-window.json`'s `slots` map uses. PP/type values themselves aren't consumed by this module; the harvested window asset already bakes them in. */
export const FIGHT_SUBMENU_SLOT_NAMES = ["ROCK_SLIDE", "BIND", "DRAGON_BREATH", "SANDSTORM"] as const;

export interface FightSubmenuState {
  /** `elapsed` (battleScene state) of the A-press that opened this submenu; `null` if never opened (still just the action menu). */
  openElapsed: number | null;
  /** `gMoveSelectionCursor[gActiveBattler]` - RAM-committed slot (0-3), updates the same tick a nav press registers. */
  cursor: FightSubmenuSlot;
  /** Slot to actually draw this tick - lags `cursor` by exactly one tick (§11 finding 2's 1-tick render lag). Callers must advance this (`advanceFightSubmenuDisplay`) before applying a new tick's own nav input. */
  displayCursor: FightSubmenuSlot;
  /** `elapsed` of the B-press that started closing; `null` until B is pressed. */
  closeElapsed: number | null;
  /** `elapsed` of the A-press that confirmed the highlighted move (turn kickoff); `null` until confirmed. Mutually exclusive with `closeElapsed` (B and A both hand off to `HandleInputChooseMove`'s caller, but only one branch fires per press - see `confirmFightMove`). */
  confirmElapsed: number | null;
  /**
   * S8 engine dependency (docs/battle-menu-notes.md §13c): the PLAYER's
   * active mon's real moveset (`battleSetup.ts`'s `activeMonMoveset`,
   * sourced from the draft screen's own confirmed rental picks) - set once
   * by `openFightSubmenu` and carried unchanged through every other
   * transition below (`closeFightSubmenu`/`confirmFightMove`/
   * `advanceFightSubmenuDisplay` all spread `...state`), the same "created
   * directly, then passed through" idiom every other field here uses.
   */
  activeMonMoveset: ActiveMonMoveset;
}

/** Never actually rendered (the FIGHT submenu's own text only draws once `openElapsed` is set - see `drawFightSubmenuChrome`) - a placeholder so this state stays a plain, always-fully-populated object like every other field here. `openFightSubmenu` always sets the real value. */
const PLACEHOLDER_MOVESET: ActiveMonMoveset = rentalMoveset("ONIX");

export const CLOSED_FIGHT_SUBMENU_STATE: FightSubmenuState = {
  openElapsed: null,
  cursor: 0,
  displayCursor: 0,
  closeElapsed: null,
  confirmElapsed: null,
  activeMonMoveset: PLACEHOLDER_MOVESET,
};

/** A-press on the settled action menu (FIGHT already highlighted - the only case this slice models, §11's own scope) opens the submenu fresh, cursor at `initialCursor` (default 0, ROCK_SLIDE's `gMoveSelectionCursor` zero-init - turn 1's own first open, and turn 2's reopen, both coincidentally rest here). S7 slice F (docs/battle-turn-notes.md §13): turn 3's own reopen passes `initialCursor=2` instead - `gMoveSelectionCursor` genuinely PERSISTS across turns (RAM-confirmed: reads 2, DRAGON_BREATH, at turn 3's reopen, turn 2's own confirmed slot), it isn't always re-zeroed. `activeMonMoveset` is threaded in by the caller (core.ts), derived fresh from the draft screen's own confirmed picks each time - S8 engine dependency, see `battleSetup.ts`. */
export function openFightSubmenu(elapsed: number, activeMonMoveset: ActiveMonMoveset, initialCursor: FightSubmenuSlot = 0): FightSubmenuState {
  return { openElapsed: elapsed, cursor: initialCursor, displayCursor: initialCursor, closeElapsed: null, confirmElapsed: null, activeMonMoveset };
}

/** B-press while the submenu is open and not already closing - starts the close DMA-wait. No-op (returns `state` unchanged) if not open or already closing, so callers can call this unconditionally on a B-press. */
export function closeFightSubmenu(state: FightSubmenuState, elapsed: number): FightSubmenuState {
  if (state.openElapsed === null || state.closeElapsed !== null || state.confirmElapsed !== null) return state;
  return { ...state, closeElapsed: elapsed };
}

/**
 * A-press on the highlighted move (this slice only models Onix's slot 0,
 * ROCK_SLIDE - the brief's own scope) - hands off to `HandleInputChooseMove`'s
 * `!canSelectTarget` branch (`battle_controller_player.c:524-528`:
 * `BtlController_EmitTwoReturnValues` + `PlayerBufferExecCompleted`, no
 * visible per-frame submenu-close redraw at all, unlike B's own round-trip
 * through a fresh `PlayerHandleChooseAction`). No-op if not open, already
 * closing, or already confirmed, so callers can call this unconditionally on
 * an A-press. */
export function confirmFightMove(state: FightSubmenuState, elapsed: number): FightSubmenuState {
  if (state.openElapsed === null || state.closeElapsed !== null || state.confirmElapsed !== null) return state;
  return { ...state, confirmElapsed: elapsed };
}

/** Advance the 1-tick display lag - call once per tick BEFORE applying that tick's own nav input (so a same-tick cursor move is correctly held back one more tick, §11 finding 2). No-op while closed. */
export function advanceFightSubmenuDisplay(state: FightSubmenuState): FightSubmenuState {
  if (state.openElapsed === null || state.displayCursor === state.cursor) return state;
  return { ...state, displayCursor: state.cursor };
}

/**
 * `HandleInputChooseMove`'s DPAD branches (`battle_controller_player.c`,
 * exact guards reproduced): LEFT only escapes bit0 if it's set, RIGHT only
 * if it's clear (both toggle bit0); UP only escapes bit1 if it's set, DOWN
 * only if it's clear (both toggle bit1) - a 2x2 grid, no wraparound. Onix's
 * fixed 4-move set means the source's own `(cursor^bit) <
 * gNumberOfMovesToChoose` guard (RIGHT/DOWN) is always satisfied here, so
 * it's omitted. JOY_NEW-gated only by the caller (no auto-repeat - §11
 * finding 2's held-DOWN check, empirically confirmed, not just assumed from
 * the source read).
 */
export function moveFightCursor(cursor: FightSubmenuSlot, direction: "LEFT" | "RIGHT" | "UP" | "DOWN"): FightSubmenuSlot {
  if ((direction === "LEFT" && (cursor & 1) !== 0) || (direction === "RIGHT" && (cursor & 1) === 0)) {
    return (cursor ^ 1) as FightSubmenuSlot;
  }
  if ((direction === "UP" && (cursor & 2) !== 0) || (direction === "DOWN" && (cursor & 2) === 0)) {
    return (cursor ^ 2) as FightSubmenuSlot;
  }
  return cursor;
}

// --- Slice 7 (S7 slice A): turn kickoff - A-confirm on ROCK_SLIDE (docs/
// battle-turn-notes.md §9's 2nd A press, tick 1918/1920) through the first
// tick of DOUBLE_TEAM's clone animation (1964, out of this slice's scope
// per docs/battle-move-anim-notes.md §8). Densely re-probed this session
// (own oracle trace, 121 captures ticks 1900-2020, twice-run 0 sha
// mismatches) since §11 only ever exercised B-close, never A-confirm.
//
// **No visible submenu-close redraw at all** (contrast B-close's own
// `FIGHT_SUBMENU_CLOSE_DELAY` round-trip): `HandleInputChooseMove`'s A
// branch hands off directly to the engine (`confirmFightMove`'s own doc
// comment) - the submenu keeps showing its ordinary idle-cycle content,
// frozen mid-phase, for 9 more ticks while the battle engine resolves turn
// order/attacker (RAM-probed `gBattleMainFunc` steps through 3 distinct
// values at ticks 1922/1923/1924, `gBattlerAttacker` becomes 1 (GROVYLE) at
// 1924, `gCurrentMove` becomes 104 (DOUBLE_TEAM) at 1925 - Grovyle outspeeds
// Onix, `gBattlerByTurnOrder`=[1,0], battle-turn-notes.md §9 point 4), THEN
// hard-cuts atomically to the "used move" message at tick 1929 (`gBattle_BG0_Y`
// flips 320->0 at RAM tick 1928, visible at render 1929 - this window's
// established +1 render lag). No intermediate blank-box frame, same "off-
// screen draw then one-step reveal" mechanism as the submenu's own open
// transition (§11 finding 1) and `battleMenu.ts`'s "Go! ONIX!" transition
// (module doc above) - just a different, longer, ENGINE-gated delay instead
// of a fixed DMA-wait.
//
// **String, pixel/arithmetic-confirmed exact** (not assumed): `StringId
// STRINGID_USEDMOVE` = "{B_ATK_NAME_WITH_PREFIX} used\n{B_BUFF2}"
// (`src/data/gen/battle-message-templates.json`'s own `usedMove` entry) -
// attacker is Grovyle, the OPPONENT (`HANDLE_NICKNAME_STRING_CASE`,
// `battle_message.c:2286-2306`: `GetBattlerSide(gBattlerAttacker) !=
// B_SIDE_PLAYER` + `BATTLE_TYPE_TRAINER` set for this Factory battle ->
// `sText_FoePkmnPrefix = "Foe "`, NOT `sText_WildPkmnPrefix`), giving "Foe
// GROVYLE used\nDOUBLE TEAM!" (29 chars incl. the free `\n`, 28 printable).
// Direct oracle-pixel confirmation, not just source-reasoning: densely
// capturing every tick 1929-1956 shows a new glyph every tick EXCEPT ticks
// 1932/1940/1951 (pixel-silent holds) - these land EXACTLY on the string's 3
// space characters (indices 3/11/22 from tick 1929 = 'F'), the same
// "1-tick/char including silently-charged spaces" rule already established
// for the intro text (`battleScene.ts` §3.2) and "Go! ONIX!" (this module's
// own §1) - confirmed here for a THIRD independent string, and confirmed to
// be 1 tick/char (this save's FAST speed), NOT the 2-ticks/char a stale
// scratch doc (`turn-resolution-notes.md` §6 item 5) had claimed - that
// doc's own reading of `sTextSpeedFrameDelays[FAST]=1` was a misinterpretation
// of the delay-counter semantics, superseded by this run's own two prior
// direct pixel/arithmetic derivations (battle-scene-notes.md §3.2,
// battle-menu-notes.md §1/§2) which this session's own fresh probe now
// makes three-for-three.
//
// **The onix/healthbox bounce overlay freezes 3 ticks after the press, not
// at the press itself, and NOT at the phase the live formula would predict**:
// pixel hashing the bounce region (x0-120,y60-112) across ticks 1922-1964
// shows a single constant value the entire span, but it is NOT
// `menuIdleBounce(t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT)`'s own live value at
// the freeze moment (grid-searched directly against this session's own dense
// oracle probe/`tools/compare/traces/turn1-kickoff.json`: the live formula
// stays exact through ticks 1919-1921, a DIFFERENT plateau of frozen-tick
// candidates 1896-1904 is exact for every tick 1922+, and every other
// candidate tried - including the live formula's own value at 1921/1922 -
// is not). Plausible mechanism (not RAM-confirmed): `HandleInputChooseMove`
// keeps running for a couple more ticks after `JOY_NEW(A_BUTTON)` registers
// (the source's own `PlaySE`/target-resolution work before
// `PlayerBufferExecCompleted` hands off - `battle_controller_player.c:481-528`),
// so the bounce sprite's own per-tick update (driven by that controller
// function's polling loop, not a free-running task) keeps advancing briefly
// past the press before truly stopping; kept as literal pixel-fit constants
// per this run's established convention for exactly this situation
// (`BALL_SPIN_TABLE`/`FIGHT_SUBMENU_RESUMED_BOUNCE_SHIFT` precedent) rather
// than asserted as proven source behavior.

/** Ticks from the A-confirm registration tick (`FightSubmenuState.confirmElapsed`'s own convention, matching `openFightSubmenu`'s - the true absolute press tick, not `sendOutPressElapsed`'s pre-increment one) to the first glyph - pixel-fit exact against this session's own dense probe (press-registers 1919 -> first glyph 1929). */
export const FIGHT_CONFIRM_TEXT_DELAY = 10;

/** `sText_FoePkmnPrefix` (`"Foe "`) + GROVYLE + STRINGID_USEDMOVE's own literal " used" (module doc above) - line 1 of the turn-kickoff message, never wraps. */
export const TURN_KICKOFF_LINE1 = "Foe GROVYLE used";
/** `gBattleTextBuff2` resolved to DOUBLE_TEAM's display name + "!" (module doc above) - line 2. */
export const TURN_KICKOFF_LINE2 = "DOUBLE TEAM!";
/** Total printable characters across both lines (`\n` free, same rule as every other message window in this codebase). */
export const TURN_KICKOFF_TEXT_TOTAL = TURN_KICKOFF_LINE1.length + TURN_KICKOFF_LINE2.length;

/** First trace tick the turn-kickoff message box clears and the first glyph ("F") draws, in the same tick (module doc above - no separate blank-box frame). */
export function turnKickoffTextStartTick(pressTick: number): number {
  return pressTick + FIGHT_CONFIRM_TEXT_DELAY;
}

/** Visible character count (0..TURN_KICKOFF_TEXT_TOTAL) of "Foe GROVYLE used\nDOUBLE TEAM!" at absolute trace tick `t`, given the A-confirm press tick. Same 1-tick/char-including-spaces mechanism as `textVisibleChars`/`goTextVisibleChars`/`sendOutTextVisibleChars`. */
export function turnKickoffTextVisibleChars(t: number, pressTick: number): number {
  const start = turnKickoffTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(TURN_KICKOFF_TEXT_TOTAL, t - start + 1);
}

/** Ticks after the A-confirm press the onix/healthbox bounce overlay keeps advancing live before it freezes (module doc above) - pixel-fit exact. */
export const FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY = 3;

/** The onix/healthbox bounce tick to freeze at once `FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY` ticks have elapsed (module doc above) - a literal pixel-fit value, NOT `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`'s own live value at the freeze moment (grid-searched exact against a 9-tick-wide plateau of candidates, `pressTick - 19` picked as the plateau's center). */
export function turnKickoffFrozenBounceTick(pressTick: number): number {
  return pressTick - 19;
}

/** The onix/healthbox bounce tick to use for `menuIdleBounce` at trace tick `t` once the move is confirmed (module doc above): live for the first `FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY` ticks after the press, then frozen. */
export function turnKickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
  return turnKickoffFrozenBounceTick(pressTick);
}

// --- S7 slice B: DOUBLE_TEAM clone animation + post-clone gap + stat-change
// banner (docs/battle-menu-notes.md §10, docs/battle-move-anim-notes.md
// §3/§8/§9, docs/battle-turn-notes.md §9) - picks up exactly where slice A's
// turn-kickoff text left off (tick 1964 = pressTick+45, the "Foe GROVYLE
// used\nDOUBLE TEAM!" text already fully printed and held) and runs through
// the stat-change banner's own zero tick (2193 = pressTick+274). All ticks
// below this session's own dense re-probe of `battle1-turn1.json`'s
// segments (`tools/probe/dump-registers.py`, stride 1, 1955-2264) plus a
// fresh full-frame pixel diff pass every tick 1963-2263 against the
// pre-window baseline (scratch, not committed - re-derivable from the
// committed trace's own segments the same way every prior session's scratch
// probes are).

/** Ticks from the A-confirm press to the RAM-tick whose `AnimDoubleTeam`
 * state a render at trace tick `t` reflects, i.e. `n = t -
 * doubleTeamAnchorTick(pressTick)` is call `n`'s state as read off RAM tick
 * `t-1` (see `doubleTeamCloneOffsets` below). **Corrected this session**
 * (docs/battle-menu-notes.md §10 gap 1) via a dense per-tick `gSprites[].
 * data[]` RAM probe of the two actual clone sprite slots
 * (`tools/probe/dump-doubleteam-sprites.py`, identified by `callback ===
 * AnimDoubleTeam`, not by slot-number guess): the sprite's own `data[3]`
 * sub-counter shows call 1 has ALREADY happened by the time RAM tick 1964 is
 * readable (`data[3]=1`, i.e. `++data[3]` already fired once inside that same
 * `oracle.advance()`), and each subsequent RAM tick advances the call count
 * by exactly 1 - so RAM tick `T`'s own state is call `n=T-1963`. Pixel
 * comparison against the oracle then pinned the RENDER-side mapping: this
 * window follows this run's established one-tick display latency (GBA's OAM
 * shadow-buffer-to-hardware DMA lag, the same motif named "RAM tick T shows
 * at render T+1" elsewhere in this codebase, e.g. `battleScene.ts`'s
 * `GROVYLE_STRETCH_TABLE`) - render tick `T` shows RAM tick `T-1`'s state,
 * i.e. call `n = (T-1) - 1963 = T - 1964`. That collapses to the SAME anchor
 * tick (1964) the register envelope's own `BLDCNT`/`BLDALPHA` jump uses, so
 * `DOUBLE_TEAM_ANCHOR_DELAY` is unchanged from the previous session's value -
 * what was actually wrong was the OFFSET TABLE itself (see
 * `DOUBLE_TEAM_CLONE_OFFSETS_A/B` below), not this anchor. Verified against
 * the compare tool directly: with the corrected per-clone tables, this
 * anchor takes `turn1-cloneanim.json`'s clone window (1964-2093) from
 * pervasive multi-thousand-pixel diffs to 0 diff on all but 4 near-1px edge
 * ticks (2075/2082/2088/2089, see docs/battle-menu-notes.md §10). */
export const DOUBLE_TEAM_ANCHOR_DELAY = 45;

export function doubleTeamAnchorTick(pressTick: number): number {
  return pressTick + DOUBLE_TEAM_ANCHOR_DELAY;
}

/**
 * `AnimDoubleTeam`'s per-call `x2` sequence (`src/battle_anim_effects_1.c:
 * 5222-5243`), simulated exactly from the decoded source for BOTH clones
 * independently, index `n` (1-based, matching the sprite's own call count
 * since creation) - table[1] is call 1's `x2`, table[129] is the last call
 * before both clones self-destroy (`data[0]` exceeds 64 on the next call).
 *
 * **Corrected this session** (docs/battle-menu-notes.md §10 gap 1): the
 * previous session's single shared table (`+offset`/`-offset`) assumed
 * `Sin(phase+128, amp) === -Sin(phase, amp)` exactly - true as REAL-VALUED
 * math (`gSineTable[x+128] === -gSineTable[x]` holds bit-for-bit, confirmed
 * directly off the table above), but FALSE once the `>> 8`-equivalent
 * `Math.floor(amplitude * tableValue / 256)` truncation is applied: C's
 * arithmetic right-shift (and this codebase's matching `Math.floor` div)
 * rounds toward -infinity, not toward zero, so `floor(-y/256) !==
 * -floor(y/256)` whenever `y` isn't an exact multiple of 256 - i.e. almost
 * always at these small amplitudes. RAM-confirmed directly (same probe as
 * above): e.g. at `n=6` clone A's `x2=0` but clone B's `x2=-1`, NOT `-0` -
 * the two sequences only coincide "in the limit", never exactly at small
 * amplitude. Both tables built in one pass (they share the same `data0`/
 * `sub`/amplitude/phaseSpeed progression - RAM-confirmed identical between
 * the two clone sprites at every tick - only the seed phase differs, 0 vs
 * 128) rather than two independent loops, to keep that shared-progression
 * invariant structurally obvious. Verified 0 mismatches against the RAM
 * probe's own per-tick `x2` reads across the full 129-tick lifetime for
 * BOTH clones independently (258 datapoints, not just the shared-table's
 * old 129).
 */
const { a: DOUBLE_TEAM_CLONE_OFFSETS_A, b: DOUBLE_TEAM_CLONE_OFFSETS_B }: { a: readonly number[]; b: readonly number[] } = (() => {
  const a: number[] = [0]; // index 0 unused, n starts at 1
  const b: number[] = [0];
  let data0 = 0;
  let sub = 0;
  let phaseA = 0;
  let phaseB = 128;
  for (let n = 1; ; n += 1) {
    sub += 1;
    if (sub > 1) {
      sub = 0;
      data0 += 1;
    }
    if (data0 > 64) break;
    const table0 = GBA_SINE_TABLE_256[data0]!;
    const amplitude = Math.floor(table0 / 6);
    const phaseSpeed = Math.floor(table0 / 13);
    phaseA = (phaseA + phaseSpeed) & 0xff;
    phaseB = (phaseB + phaseSpeed) & 0xff;
    a.push(Math.floor((amplitude * GBA_SINE_TABLE_256[phaseA]!) / 256));
    b.push(Math.floor((amplitude * GBA_SINE_TABLE_256[phaseB]!) / 256));
  }
  return { a, b };
})();

/** Clone A/B's horizontal `x2` offsets at trace tick `t` (independent, NOT
 * mirror images of each other - see `DOUBLE_TEAM_CLONE_OFFSETS_A/B`'s own
 * doc comment), or `null` outside the RAM-confirmed sprite-active window
 * (`DOUBLE_TEAM_VISIBLE_START_DELAY`..`DOUBLE_TEAM_VISIBLE_END_DELAY`). */
export function doubleTeamCloneOffsets(t: number, pressTick: number): { a: number; b: number } | null {
  const start = pressTick + DOUBLE_TEAM_VISIBLE_START_DELAY;
  const end = pressTick + DOUBLE_TEAM_VISIBLE_END_DELAY;
  if (t < start || t > end) return null;
  const n = t - doubleTeamAnchorTick(pressTick);
  return { a: DOUBLE_TEAM_CLONE_OFFSETS_A[n] ?? 0, b: DOUBLE_TEAM_CLONE_OFFSETS_B[n] ?? 0 };
}

/** First/last trace tick the clone motion is pixel-active on screen. The
 * clone sprites are RAM-confirmed active for RAM ticks 1964-2092
 * (`tools/probe/dump-doubleteam-sprites.py`: `data[0]` exceeds 64 and
 * triggers `DestroySpriteWithActiveSheet` right after 2092); folding in the
 * one-tick render lag (`DOUBLE_TEAM_ANCHOR_DELAY`'s own doc comment) shifts
 * that to render ticks 1965-2093. Pixel-compare-verified two ticks EARLIER
 * than that (1964 itself is register-envelope-active per the RAM probe but
 * still oracle-baseline-exact - `n=0`'s placeholder zero offset draws two
 * fully-overlapping zero-motion clones whose blended result happens to sit
 * one tick before the oracle's own real transition), and both edges were
 * swept directly against the compare tool rather than assumed: `+47`/`+174`
 * (ticks 1966/2093) is the pair that zeroes out ticks 1964-1965 and 2094+
 * while keeping the whole interior clean. */
export const DOUBLE_TEAM_VISIBLE_START_DELAY = 47;
export const DOUBLE_TEAM_VISIBLE_END_DELAY = 174;

/** First/last trace tick of the stat-change banner's own register-active
 * window (`General_StatsChange`/`StatsChangeAnimation_Step1-3`,
 * `src/battle_anim_utility_funcs.c:415-628`) - `BLDCNT`/`BLDALPHA` first
 * write at `+208` (2127, `eva=0/evb=16`) and both zero out at `+274` (2193,
 * this slice's own committed-trace end tick). RAM/register-exact, no render
 * lag (unlike the clone window above): this session's dense diff shows the
 * first PIXEL-visible tick is `+213` (2132, `eva=1`) purely because `eva=0`
 * is a mathematical no-op, not a lag - `statsBannerEva` naturally reproduces
 * that by construction. */
export const STATS_BANNER_START_DELAY = 208;
export const STATS_BANNER_END_DELAY = 274;

/**
 * `BLDALPHA`'s `eva` at trace tick `t` (`evb = 16 - eva` throughout - unlike
 * the clone window's flat 12/8, this session's stride-1 register re-probe
 * confirms every sampled tick sums to exactly 16), or `null` outside the
 * banner's register-active window. RAM-exact schedule (`dump-registers.py`,
 * stride 1, 2127-2193): flat 0 for 5 ticks, then +1 every 2 ticks up to 10
 * (reached tick+23/2150), held 22 ticks, then the same ramp back down to 0.
 *
 * **Formerly a known gap, RESOLVED (docs/battle-menu-notes.md §10d)**: this
 * `eva`/`evb` schedule alone never reproduced the banner's pixels 0-diff -
 * the apparent "per-tick motion under a flat blend" a prior session sampled
 * (raw pixel color cycling tick-to-tick at 2150-2160 despite flat `eva`) was
 * never a second, separate mechanism: it's `gBattle_BG1_Y`'s own real,
 * continuous scroll (`statsBannerBg1Y` below) - target-1 is a genuinely
 * scrolling tilemap, not a flat white flash. This function's own schedule
 * needed no change once that was found.
 */
export function statsBannerEva(t: number, pressTick: number): number | null {
  const start = pressTick + STATS_BANNER_START_DELAY;
  const end = pressTick + STATS_BANNER_END_DELAY;
  if (t < start || t > end) return null;
  const d = t - start;
  if (d <= 4) return 0;
  if (d <= 22) return Math.min(10, Math.floor((d - 5) / 2) + 1);
  if (d <= 44) return 10;
  return Math.max(0, 10 - (Math.floor((d - 45) / 2) + 1));
}

/**
 * `gBattle_BG1_Y` as it actually affects the RENDERED frame at trace tick
 * `t` (docs/battle-menu-notes.md §10d): `StatsChangeAnimation_Step3` runs
 * `gBattle_BG1_Y += tVelocity` (`tVelocity = 3` for a stat INCREASE, e.g.
 * DOUBLE_TEAM's `EFFECT_EVASION_UP`) unconditionally at the top of every
 * call, all three fade-in/wait/fade-out states alike - so BG1 keeps
 * scrolling continuously through the whole banner, including the "flat
 * eva/evb" hold. RAM-exact schedule (fresh register probe, stride 1, ticks
 * 2120-2193): flat 0 through RAM tick 2129, then a clean `+3`/tick ramp
 * (`3,6,...,180`) from RAM tick 2130 through 2189, holding at 180 after.
 *
 * **Needs the same one-tick render lag `bg1X` above already established for
 * BG scroll registers** (`battleScene.ts`'s own `gBattle_BG1_X` doc
 * comment: "the value the oracle displays for tick `t` is the register as
 * of tick `t-1`") - NOT `statsBannerEva`'s own no-lag convention (a
 * different register class, `BLDALPHA`, apparently copied to the display
 * pipeline on a different cadence than `BG1VOFS`). Confirmed empirically,
 * not assumed: a per-tick brute-force sweep against the oracle
 * (`tools/compare/scratch/diagnose_banner.mjs`) found the exact map-space Y
 * shift needed at several ticks (2132/2140/2150/2160) is periodic mod 32
 * (this tilemap's own vertical repeat - see `extract-stat-anim.ts`'s
 * `increase.bin`), and the residue at every one of those ticks matches
 * `3*clamp((t-1)-2129, 0, 60)` exactly, i.e. RAM tick `t-1`'s own value -
 * never matches the naive same-tick `3*clamp(t-2129,0,60)`.
 * `STATS_BANNER_BG1_Y_ANCHOR_DELAY=211` folds that single extra tick into
 * the anchor (`pressTick+211` = RAM tick 2130, one past the ramp's own
 * RAM-tick-2129 zero point) rather than threading a separate `-1` through
 * the call site. Clamped to [0,180] outside the ramp's own active span
 * rather than continuing to apply `tVelocity` past task teardown - never
 * observed to matter since `statsBannerEva` gates every caller to the
 * banner's own active window anyway.
 */
export const STATS_BANNER_BG1_Y_ANCHOR_DELAY = 211;

export function statsBannerBg1Y(t: number, pressTick: number): number {
  const d = t - (pressTick + STATS_BANNER_BG1_Y_ANCHOR_DELAY);
  return Math.max(0, Math.min(180, 3 * d));
}

// --- S7 slice C: the ROCK_SLIDE window (docs/battle-move-anim-notes.md §9,
// docs/battle-turn-notes.md §9) - picks up exactly where slice B's stat-
// change banner leaves off (its own last active-but-zero-effect tick,
// pressTick+274 = 2193) through the tick before the HP-bar drain sentinel
// (pressTick+596 = 2515; slice D owns 2516+). All delays/tables below are
// cited to this session's own re-run of the two committed probe scripts
// (`dump-registers.py`/`dump-rockslide-sprites.py`) against the already-
// committed dense ground-truth traces (`battle1-rockslide-dense-{a,b}.json`)
// - RAM-tick-indexed, twice-run byte-identical - not re-derived from source
// alone. Three text boxes share the same box/font/cadence mechanism as
// `TURN_KICKOFF_LINE1/2` above: the held DOUBLE_TEAM text (unchanged,
// through pressTick+283/2202), then "Foe GROVYLE's evasiveness\nrose!"
// (opens pressTick+284/2203), then "ONIX used\nROCK SLIDE!" (opens
// pressTick+393/2312) - `battle-message-templates.json`'s own
// `STRINGID_ATTACKERSSTATROSE`/`STRINGID_USEDMOVE` templates, resolved for
// this turn's actual attacker/stat/move.

/** `STRINGID_ATTACKERSSTATROSE` (`"{B_ATK_NAME_WITH_PREFIX}'s {B_BUFF1}\n{B_BUFF2}"`) resolved for DOUBLE_TEAM's own evasion-up stat change: attacker "Foe GROVYLE", stat "evasiveness", buff2 "rose!" - line 1 wraps after "evasiveness" (pixel-confirmed, docs/battle-move-anim-notes.md §9.2). */
/** Uses U+2019 (the game's own charmap right-single-quote glyph, `src/data/gen/charmap.json` code 180) not the ASCII apostrophe U+0027 - the font has no glyph for the latter. */
export const STAT_ROSE_LINE1 = "Foe GROVYLE’s evasiveness";
export const STAT_ROSE_LINE2 = "rose!";
export const STAT_ROSE_TEXT_TOTAL = STAT_ROSE_LINE1.length + STAT_ROSE_LINE2.length;

/** Ticks from the A-confirm press to this textbox's own clear+first-glyph tick (RAM/pixel-confirmed 2203, same "clear and draw in the same tick" convention as `TURN_KICKOFF_LINE1`). */
export const STAT_ROSE_TEXT_DELAY = 284;

export function statRoseTextStartTick(pressTick: number): number {
  return pressTick + STAT_ROSE_TEXT_DELAY;
}

/** Visible character count (0..STAT_ROSE_TEXT_TOTAL) at absolute trace tick `t` - same 1-tick/char-including-spaces mechanism as `turnKickoffTextVisibleChars`. */
export function statRoseTextVisibleChars(t: number, pressTick: number): number {
  const start = statRoseTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(STAT_ROSE_TEXT_TOTAL, t - start + 1);
}

/** `STRINGID_USEDMOVE` resolved for Onix's own turn: "ONIX used\nROCK SLIDE!" (attacker is the PLAYER's own Onix, no "Foe " prefix - `HANDLE_NICKNAME_STRING_CASE`'s side check, `battle-message-templates.json`'s `usedMove` entry). */
export const ROCK_SLIDE_LINE1 = "ONIX used";
export const ROCK_SLIDE_LINE2 = "ROCK SLIDE!";
export const ROCK_SLIDE_TEXT_TOTAL = ROCK_SLIDE_LINE1.length + ROCK_SLIDE_LINE2.length;

/** Ticks from the A-confirm press to this textbox's own clear+first-glyph tick (RAM/pixel-confirmed 2312). */
export const ROCK_SLIDE_TEXT_DELAY = 393;

export function rockSlideTextStartTick(pressTick: number): number {
  return pressTick + ROCK_SLIDE_TEXT_DELAY;
}

/** Visible character count (0..ROCK_SLIDE_TEXT_TOTAL) at absolute trace tick `t`. */
export function rockSlideTextVisibleChars(t: number, pressTick: number): number {
  const start = rockSlideTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(ROCK_SLIDE_TEXT_TOTAL, t - start + 1);
}

/**
 * `gBattle_BG3_Y` (`shake_mon_or_platform velocity=7,shakeTimer=1,
 * shakeDuration=11`, docs/battle-move-anim-notes.md §9.3) - the RAM sequence
 * itself, indexed from RAM tick `pressTick+ROCK_SLIDE_RAM_ANCHOR_DELAY`
 * (2347): `0,-7,-7,0,0,-7,-7,0,0,-7,-7`, then flat 0. RAM-reconfirmed this
 * session (`dump-registers.py`, stride 1, ticks 2337-2365) bit-exact against
 * §9.3's own table.
 */
const ROCK_SLIDE_SHAKE_SEQUENCE: readonly number[] = [0, -7, -7, 0, 0, -7, -7, 0, 0, -7, -7];

/** Ticks from the A-confirm press to RAM tick 2347 (the shake's own first write, and rock #1's own `createsprite` tick - both anchored to the same RAM tick, §9.3). */
export const ROCK_SLIDE_RAM_ANCHOR_DELAY = 428;

/**
 * `gBattle_BG3_Y` as it actually affects the RENDERED frame at trace tick
 * `t` - needs the same one-tick render lag `bg1X`/`statsBannerBg1Y`
 * (`battleScene.ts`) already established for BG scroll registers (module
 * doc above): the value the oracle displays for tick `t` is the register as
 * of RAM tick `t-1`. Confirmed empirically, not assumed: docs/battle-move-
 * anim-notes.md §9.2's own dense pixel-diff pass shows the first VISIBLE
 * screen change for the whole attack is tick 2349 (diff 539667), with 2348
 * still exact-0-diff - only explained if render tick 2348 shows RAM tick
 * 2347's PRE-write value (0, the flat baseline) and render tick 2349 is the
 * first to show RAM tick 2348's already-written `-7`, i.e. the no-lag
 * mapping (which would make 2348 the first visible tick) is wrong.
 */
export function rockSlideBg3Y(t: number, pressTick: number): number {
  const ramTick = t - 1;
  const d = ramTick - (pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY);
  if (d < 0 || d >= ROCK_SLIDE_SHAKE_SEQUENCE.length) return 0;
  return ROCK_SLIDE_SHAKE_SEQUENCE[d]!;
}

/**
 * All 20 `createsprite gFallingRockSpriteTemplate` argv triples (docs/
 * battle-move-anim-notes.md §9.3's own table, cross-verified this session
 * against `dump-rockslide-sprites.py`'s per-tick `data[5]`/`x`/`animNum`
 * reads for every one of the 20 spawns - bit-exact, not just source-
 * transcribed): `[xOffset, animNum, velocity]` in script call order (the
 * main script's 4 + 2×`RockSlideRocks` calls of 8 each, the second call
 * reproducing the first's argv set verbatim).
 */
const ROCK_SLIDE_ROCK_TABLE: readonly { xOffset: number; animNum: 0 | 1 | 2; velocity: number }[] = [
  { xOffset: -5, animNum: 1, velocity: -5 },
  { xOffset: 5, animNum: 0, velocity: 6 },
  { xOffset: 19, animNum: 1, velocity: 10 },
  { xOffset: -23, animNum: 2, velocity: -10 },
  { xOffset: -20, animNum: 0, velocity: -10 },
  { xOffset: 28, animNum: 1, velocity: 10 },
  { xOffset: -10, animNum: 1, velocity: -5 },
  { xOffset: 10, animNum: 0, velocity: 6 },
  { xOffset: 24, animNum: 1, velocity: 10 },
  { xOffset: -32, animNum: 2, velocity: -10 },
  { xOffset: -20, animNum: 0, velocity: -10 },
  { xOffset: 30, animNum: 2, velocity: 10 },
  { xOffset: -20, animNum: 0, velocity: -10 },
  { xOffset: 28, animNum: 1, velocity: 10 },
  { xOffset: -10, animNum: 1, velocity: -5 },
  { xOffset: 10, animNum: 0, velocity: 6 },
  { xOffset: 24, animNum: 1, velocity: 10 },
  { xOffset: -32, animNum: 2, velocity: -10 },
  { xOffset: -20, animNum: 0, velocity: -10 },
  { xOffset: 30, animNum: 2, velocity: 10 },
];

export const ROCK_SLIDE_ROCK_COUNT = ROCK_SLIDE_ROCK_TABLE.length;

/** Ticks between consecutive rock spawns (RAM-confirmed exact, §9.3). */
export const ROCK_SLIDE_SPAWN_STRIDE = 4;

/** `SetAverageBattlerPositions(gBattleAnimTarget, FALSE, ...)`'s own result for this single (non-double) battle - collapses to Grovyle's own `BATTLER_COORD_X/Y` (`battle_anim_mons.c:2289-2318`, `partnerX/Y = battlerX/Y` when `!IsDoubleBattle()`), plus `AnimFallingRock`'s own one-time `sprite->y += 14`. Empirically anchored this session (not source-derived - `GetBattlerSpriteCoord`'s coordinate tables aren't ported here): every one of the 20 rocks' own RAM `x` at its spawn tick equals `176 + xOffset` exactly and `y` equals `54` exactly (`dump-rockslide-sprites.py`, all 20 spawns cross-checked), so this pair is taken as the fixed anchor rather than re-derived. Sprite `x`/`y` are CENTER coordinates (GBA OAM convention) - the draw call subtracts half the 32x32 frame size to get the top-left corner. */
const ROCK_SLIDE_ROCK_BASE = { x: 176, y: 54 };

/** `gSineTable[i]` (`reference/pokeemerald/src/trig.c`), same literal Q8.8 table as `GBA_SINE_TABLE_256` above but exposed as a general `Sin(index, amplitude)`/`Cos(index, amplitude)` pair (not the amplitude-1-only `bounceSin`) - needed for the falling-rock ellipse motion's much larger amplitudes (up to 70). `Math.floor` on the already-signed product matches C's arithmetic-shift-by-8 (round toward -infinity) bit-for-bit for two's-complement values in this range - RAM-cross-verified this session against all 20 rocks' own per-tick `x2`/`y2` reads, 0 mismatches. */
function gbaSinTable(index: number, amplitude: number): number {
  const v = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor((amplitude * v) / 256);
}
function gbaCosTable(index: number, amplitude: number): number {
  return gbaSinTable(index + 64, amplitude);
}

/**
 * A single falling rock's render state at absolute trace tick `t`, or
 * `null` outside its RAM-confirmed active window. `index` is 0-based
 * (`ROCK_SLIDE_ROCK_TABLE[index]`).
 *
 * **Call-timing model** (docs/battle-move-anim-notes.md §3's source formula,
 * corrected this session against `dump-rockslide-sprites.py`'s own per-tick
 * `data[]` reads - the naive "one `TranslateSpriteInEllipse` call per RAM
 * tick from the spawn tick" reading is off by one call on the spawn tick
 * itself): the spawn tick gets TWO motion calls (both `CreateSprite`'s own
 * init-invocation of the initial callback AND that same frame's regular
 * per-frame sprite dispatch, since the callback pointer has already been
 * reassigned to `TranslateSpriteInEllipse` inside the first call - RAM-
 * confirmed via the stored `circlePos`/`duration` jumping by 2 steps, not 1,
 * on the spawn tick alone), every tick after gets exactly ONE call while
 * `duration` is nonzero, then exactly one HELD tick (duration hits 0, the
 * callback pointer switches but no motion write happens) before phase 2's
 * own single setup-call tick (`AnimFallingRock_Step`, itself making exactly
 * one `TranslateSpriteInEllipse` call - unlike the spawn tick, this
 * transition does NOT double-call). This gives, in local ticks `n` since
 * spawn (`n=0` at the spawn tick itself):
 * - `n=0..14`: phase 1 (arc down), circlePos input `4+4n`, `y2=Cos(4+4n,-70)`, `x2=0`.
 * - `n=15`: held (repeats `n=14`'s value - the duration-hits-0 tick).
 * - `n=16..47`: phase 2 (settle wobble), circlePos input `128+4n`,
 *   `x2=Sin(128+4n,velocity)`, `y2=Cos(128+4n,-24)`, plus the one-time
 *   `sprite->x += velocity` baked into the base X from `n=16` on.
 * - `n=48`: held (repeats `n=47`'s value).
 * - `n<0` or `n>48`: not rendered (not yet spawned / already destroyed -
 *   RAM-confirmed gone from `gSprites[]` at `n=49`).
 *
 * Render tick `t` maps to RAM tick `t-1` (the same one-tick lag as
 * `rockSlideBg3Y` above and this codebase's other sprite-state mechanisms,
 * e.g. `doubleTeamCloneOffsets`) before computing `n`.
 */
export function rockSlideRockState(index: number, t: number, pressTick: number): { centerX: number; centerY: number; animNum: 0 | 1 | 2 } | null {
  const args = ROCK_SLIDE_ROCK_TABLE[index];
  if (!args) return null;
  const spawnRamTick = pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY + ROCK_SLIDE_SPAWN_STRIDE * index;
  const ramTick = t - 1;
  const n = ramTick - spawnRamTick;
  if (n < 0 || n > 48) return null;
  let x2: number;
  let y2: number;
  let xShift = 0;
  if (n <= 15) {
    const nClamped = Math.min(n, 14);
    const circlePosIn = 4 + 4 * nClamped;
    x2 = 0;
    y2 = gbaCosTable(circlePosIn, -70);
  } else {
    const nClamped = Math.min(n, 47);
    const circlePosIn = 128 + 4 * nClamped;
    x2 = gbaSinTable(circlePosIn, args.velocity);
    y2 = gbaCosTable(circlePosIn, -24);
    xShift = args.velocity;
  }
  return {
    centerX: ROCK_SLIDE_ROCK_BASE.x + args.xOffset + xShift + x2,
    centerY: ROCK_SLIDE_ROCK_BASE.y + y2,
    animNum: args.animNum,
  };
}

/**
 * Rock-vs-rock OAM stacking order (docs/battle-menu-notes.md §11's own
 * named residual) - a faithful port of the real `SortSprites`
 * insertion-sort comparator (`reference/pokeemerald/src/sprite.c:372-467`)
 * plus `CreateSprite`'s "lowest free slot" allocator (`:502-510`), run
 * forward tick-by-tick from a RAM-read seed. RAM-validated (new probe
 * `tools/probe/dump-rockslide-slot-order.py`, run against the committed
 * `battle1-rockslide-dense-b.json`, twice for determinism): **0
 * mismatches** on slot assignment (all 20 rocks + the shake sprite,
 * every one of 143 sampled RAM ticks 2338-2480) AND **0 mismatches** on
 * the resulting relative rock draw order (all 117 multi-rock ticks in
 * that window, including the 56 that have at least one exact on-screen-Y
 * tie among simultaneously alive rocks).
 *
 * **Why simulate at all, not a static table**: only 13 distinct
 * `gSprites[]` slots host all 20 rocks (slots free up and get reused as
 * earlier rocks despawn, RAM-confirmed - `rockSlideRockState`'s own doc
 * comment on the `n=49` destroy), so "spawn order" and "final OAM order"
 * diverge over the window - the prior session's fixed table-index draw
 * order only got ~71% of frames right.
 *
 * **Why the simulation only needs to track the 20 rocks (not the other
 * ~50 `gSprites[]` slots the real hardware also sorts every frame)**:
 * `SortSprites`'s own tie-break only fires between two slots with an
 * EXACT packed-key tie (`subpriority | oam.priority<<8`). RAM-confirmed
 * the 20 rocks are the ONLY sprites in this whole scene that ever share
 * their exact key - `oam.priority=2` for every one
 * (`gOamData_AffineOff_ObjNormal_32x32`, `battle_anim_rock.c:59`) and
 * `subpriority=38` for every one (`Cmd_createsprite`'s own
 * `GetBattlerSpriteSubpriority(target)-2` formula, constant since the
 * target battler never changes mid-window). The shake sprite itself is
 * RAM-confirmed `oam.priority=3` (never 2); every battle-scene-persistent
 * sprite (healthboxes, mons, etc.) is RAM-confirmed `oam.priority` 0 or 1.
 * Since `SortSprites` is a STABLE sort (ties never swap), two elements
 * that never tie with any third element can only have their relative
 * order changed by a DIRECT comparison against each other - confirmed
 * empirically too, not just argued: collapsing every non-rock slot to
 * one shared filler key (`sDummySprite`'s own packed key,
 * `sprite.c:159-169`) changed 0 of the 117 validated ticks.
 */
const ROCK_SLIDE_BASELINE_SLOTS: readonly number[] = [0, 1, 2, 6, 8, 60, 61, 62, 63];

/** `shake_mon_or_platform`'s own `shake_duration=11` (`Move_ROCK_SLIDE`, `data/battle_anim_scripts.s`) - the shake sprite's own lifetime in RAM ticks, RAM-confirmed (`gSprites[3]` inUse 2347..2357, freed by 2358). */
const ROCK_SLIDE_SHAKE_LIFETIME = 11;

/** `Cmd_createsprite`'s own `GetBattlerSpriteSubpriority(gBattleAnimTarget) - 2` result for every one of the 20 rocks (`subpriority_offset=2` is the same literal in every ROCK_SLIDE `createsprite` call, `data/battle_anim_scripts.s`) - RAM-confirmed a single constant across all 20 spawns, not re-derived from `GetBattlerSpriteSubpriority`'s own coordinate tables (not ported to this engine). */
const ROCK_SLIDE_SUBPRIORITY = 38;

/** RAM ticks before the shake/rock-0 creation event (`ROCK_SLIDE_RAM_ANCHOR_DELAY`) used as the simulation's seed point - `sSpriteOrder` (below) is RAM-confirmed unchanged for at least this many ticks beforehand, so it's a stable, non-mid-transition seed. */
const ROCK_SLIDE_ORDER_SEED_OFFSET = 9;

/**
 * `sSpriteOrder` (`EWRAM_DATA static u8 sSpriteOrder[MAX_SPRITES]`,
 * `reference/pokeemerald/src/sprite.c:282`) read directly via a live RAM
 * probe at RAM tick `pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY -
 * ROCK_SLIDE_ORDER_SEED_OFFSET` (2338 in the probed trace) - the array
 * has no exported symbol (`bin/oracle symbols` can't resolve it, it's
 * `static`); its address (`0x020217F4`) was resolved once via
 * `arm-none-eabi-nm -n --defined-only reference/pokeemerald/
 * pokeemerald.elf` (same technique this run already uses for other
 * static callbacks, e.g. `dump-rockslide-sprites.py`'s
 * `HEALTHBOX_WOBBLE_CB`). Values are real `gSprites[]` slot indices;
 * `AddSpritesToOamBuffer` (`sprite.c:482-500`) walks this array ASCENDING
 * assigning ASCENDING real OAM index, and lower OAM index renders on top
 * - so within this array, background-to-foreground draw order is
 * DESCENDING array position.
 */
const ROCK_SLIDE_ORDER_SEED: readonly number[] = [
  62, 60, 0, 63, 1, 61, 6, 8, 2, 3, 4, 21, 20, 5, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 7, 54, 55, 56, 57, 58,
  59, 23, 22, 48, 49, 50, 51, 52, 53, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
  44, 45, 46, 47,
];

/** `sDummySprite`'s own packed sort key (`sprite.c:159-169`: `DUMMY_OAM_DATA`'s `.priority=3` ["lowest priority", the macro's own comment], `.subpriority=0xFF`) - the shared filler every non-rock slot collapses to (see the derivation above). */
const ROCK_SLIDE_FILLER_PACKED_KEY = (3 << 8) | 255;
/** `sDummySprite.y = DISPLAY_HEIGHT` (160), wrapped the same way `SortSprites` wraps every `oam.y` (`>= 160` subtracts 256). */
const ROCK_SLIDE_FILLER_Y = -96;

function rockSlideSpawnRamTick(index: number, pressTick: number): number {
  return pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY + ROCK_SLIDE_SPAWN_STRIDE * index;
}

/** RAM-confirmed: a rock's host slot is freed the tick after its last rendered tick (`rockSlideRockState`'s own `n=49` destroy). */
function rockSlideDespawnRamTick(index: number, pressTick: number): number {
  return rockSlideSpawnRamTick(index, pressTick) + 49;
}

/** `sprite->y + sprite->y2 + centerToCornerVecY` (`UpdateOamCoords`, `sprite.c`) wrapped to the real 8-bit OAM `y` field's signed-screen-position semantics (`SortSprites`'s own `>= DISPLAY_HEIGHT` check) - numerically cross-checked this session against 980 RAM-read `oam.y` samples (all 20 rocks, full window), 0 mismatches. */
function wrapOamY(cornerY: number): number {
  const u8 = ((cornerY % 256) + 256) % 256;
  return u8 >= 160 ? u8 - 256 : u8;
}

type RockSlideOrderEvent = { ramTick: number; isDestroy: boolean; rank: number; rockIndex: number | null };

/** Per-`pressTick` memo of `computeRockSlideOrders`'s result - a single compare/render run only ever needs one `pressTick`, and recomputing the ~200-tick simulation from scratch on every rendered frame would be wasteful (though not incorrect - the function is pure). */
const rockSlideOrderCache = new Map<number, Map<number, readonly number[]>>();

/**
 * Simulates the whole ROCK_SLIDE window's slot lifecycle + `SortSprites`
 * passes, RAM tick by RAM tick, from the seed above through the last
 * rock's own despawn. Returns a map from RAM tick to the alive rocks (by
 * `ROCK_SLIDE_ROCK_TABLE` index), background-to-foreground.
 */
function computeRockSlideOrders(pressTick: number): Map<number, readonly number[]> {
  const anchor = pressTick + ROCK_SLIDE_RAM_ANCHOR_DELAY;
  const seedRamTick = anchor - ROCK_SLIDE_ORDER_SEED_OFFSET;
  const lastRamTick = rockSlideDespawnRamTick(ROCK_SLIDE_ROCK_COUNT - 1, pressTick);

  // Event order matches real RAM behavior, confirmed by the 0-mismatch
  // slot-assignment validation above: destroys process before creates on
  // a shared tick (never actually co-occurs in this schedule, but kept
  // for robustness), and the shake sprite's own creation - earlier in
  // Move_ROCK_SLIDE's script than rock 0's - claims the lower slot when
  // both are created on the anchor tick.
  const events: RockSlideOrderEvent[] = [
    { ramTick: anchor, isDestroy: false, rank: -1, rockIndex: null },
    { ramTick: anchor + ROCK_SLIDE_SHAKE_LIFETIME, isDestroy: true, rank: -1, rockIndex: null },
  ];
  for (let i = 0; i < ROCK_SLIDE_ROCK_COUNT; i += 1) {
    events.push({ ramTick: rockSlideSpawnRamTick(i, pressTick), isDestroy: false, rank: i, rockIndex: i });
    events.push({ ramTick: rockSlideDespawnRamTick(i, pressTick), isDestroy: true, rank: i, rockIndex: i });
  }
  events.sort((a, b) => a.ramTick - b.ramTick || Number(a.isDestroy) - Number(b.isDestroy) || a.rank - b.rank);

  const inUse = new Array<boolean>(64).fill(false);
  for (const slot of ROCK_SLIDE_BASELINE_SLOTS) inUse[slot] = true;
  let shakeSlot = -1;
  const rockSlot = new Array<number>(ROCK_SLIDE_ROCK_COUNT).fill(-1);

  const order = ROCK_SLIDE_ORDER_SEED.slice();
  const result = new Map<number, readonly number[]>();

  let eventIdx = 0;
  for (let ramTick = seedRamTick + 1; ramTick <= lastRamTick; ramTick += 1) {
    while (eventIdx < events.length && events[eventIdx]!.ramTick === ramTick) {
      const ev = events[eventIdx]!;
      if (ev.isDestroy) {
        const slot = ev.rockIndex === null ? shakeSlot : rockSlot[ev.rockIndex]!;
        inUse[slot] = false;
        if (ev.rockIndex === null) shakeSlot = -1;
        else rockSlot[ev.rockIndex] = -1;
      } else {
        let slot = 0;
        while (inUse[slot]) slot += 1;
        inUse[slot] = true;
        if (ev.rockIndex === null) shakeSlot = slot;
        else rockSlot[ev.rockIndex] = slot;
      }
      eventIdx += 1;
    }

    const packedKey = new Array<number>(64).fill(ROCK_SLIDE_FILLER_PACKED_KEY);
    const yKey = new Array<number>(64).fill(ROCK_SLIDE_FILLER_Y);
    for (let i = 0; i < ROCK_SLIDE_ROCK_COUNT; i += 1) {
      const slot = rockSlot[i]!;
      if (slot < 0) continue;
      const state = rockSlideRockState(i, ramTick + 1, pressTick);
      if (!state) continue;
      packedKey[slot] = (2 << 8) | ROCK_SLIDE_SUBPRIORITY;
      yKey[slot] = wrapOamY(state.centerY - 16);
    }

    // One `SortSprites` pass - the exact insertion-sort comparator
    // (`sprite.c:372-467`, minus the double-affine-size-3 special case,
    // irrelevant to every sprite in this window).
    for (let i = 1; i < 64; i += 1) {
      let j = i;
      while (j > 0) {
        const s1 = order[j - 1]!;
        const s2 = order[j]!;
        const p1 = packedKey[s1]!;
        const p2 = packedKey[s2]!;
        if (p1 > p2 || (p1 === p2 && yKey[s1]! < yKey[s2]!)) {
          order[j - 1] = s2;
          order[j] = s1;
          j -= 1;
        } else {
          break;
        }
      }
    }

    const alive: { index: number; pos: number }[] = [];
    for (let i = 0; i < ROCK_SLIDE_ROCK_COUNT; i += 1) {
      const slot = rockSlot[i]!;
      if (slot >= 0) alive.push({ index: i, pos: order.indexOf(slot) });
    }
    alive.sort((a, b) => b.pos - a.pos);
    result.set(
      ramTick,
      alive.map((r) => r.index),
    );
  }

  return result;
}

/**
 * The alive falling rocks (by `ROCK_SLIDE_ROCK_TABLE` index) at trace tick
 * `t`, in real-hardware draw order (background-first, on-top last) - see
 * `computeRockSlideOrders`'s own derivation above. Same one-tick render
 * lag as `rockSlideRockState`/`rockSlideBg3Y`.
 */
export function rockSlideDrawOrder(t: number, pressTick: number): readonly number[] {
  const ramTick = t - 1;
  let cached = rockSlideOrderCache.get(pressTick);
  if (!cached) {
    cached = computeRockSlideOrders(pressTick);
    rockSlideOrderCache.set(pressTick, cached);
  }
  return cached.get(ramTick) ?? [];
}

/**
 * `AnimTask_ShakeMon`'s own `y2` bounce on Grovyle (`(ANIM_TARGET, 0, 5, 50,
 * 1)`, docs/battle-move-anim-notes.md §3) - toggles the target's sprite `y2`
 * between 0 and the given offset. **Pixel-fit, not source-derived**: this
 * session found (via a per-tick brute-force roll search against the dense
 * ground-truth PNGs, cropped to a rock-free strip of Grovyle's own lower
 * body, `y=64..76`) that Grovyle is genuinely NOT static during this window
 * despite going `.invisible`-flagged (§9.3's `targetInvisible` RAM signal) -
 * contrary to §9.6's own "a pixel-matching engine can likely get away with
 * simply not hiding the sprite" prediction, the visible stand-in DOES track
 * the shake task's `y2`. The render-tick pattern is a period-4 repeat of
 * `[5,5,0,0]` (NOT a flat 1-tick toggle - the doubled hold is presumably an
 * interaction between the task's own per-tick write and this window's
 * one-tick render lag, not independently re-derived from source), active
 * render ticks 2362-2455 (94 ticks) then flat 0 - both boundaries pixel-
 * swept exact (0 diff in the crop at every tested tick from 2349-2459).
 */
const ROCK_SLIDE_MON_SHAKE_START_DELAY = 443;
const ROCK_SLIDE_MON_SHAKE_END_DELAY = 536;

export function rockSlideMonShakeY2(t: number, pressTick: number): number {
  const start = pressTick + ROCK_SLIDE_MON_SHAKE_START_DELAY;
  const end = pressTick + ROCK_SLIDE_MON_SHAKE_END_DELAY;
  if (t < start || t > end) return 0;
  const d = (t - start) % 4;
  return d < 2 ? 5 : 0;
}

/** Ticks from the A-confirm press to RAM tick 2481 (both hit-flash sub-effects' own shared start tick, §9.3/§9.4 - `waitforvisualfinish`/`clearmonbg`/`hitanimation` overhead after the last rock disappears). */
export const HIT_FLASH_RAM_ANCHOR_DELAY = 562;

/** The real opponent healthbox sprite's own `y2` wobble (`SpriteCB_HitAnimHealthoxEffect`, `+1/-1` alternating every RAM tick for 20 ticks then 0, §9.3) at trace tick `t` - same one-tick render lag as `rockSlideBg3Y`. RAM-confirmed this session (`dump-rockslide-sprites.py`'s own `healthboxY2` field, ticks 2481-2501): `+1,-1,+1,-1,...` starting at RAM tick 2481, 20 values, 0 outside. */
export function rockSlideHealthboxWobbleY2(t: number, pressTick: number): number {
  const d = t - 1 - (pressTick + HIT_FLASH_RAM_ANCHOR_DELAY);
  if (d < 0 || d > 19) return 0;
  return d % 2 === 0 ? 1 : -1;
}

/** Grovyle's own `.invisible` blink bit (`DoHitAnimBlinkSpriteEffect`, 4-tick on/off cycles for 32 ticks, §9.3) at trace tick `t` - same one-tick render lag. RAM-confirmed this session (`dump-rockslide-sprites.py`'s own `targetInvisible` field, ticks 2481-2513): visible at `d=0` (setup), then 4-tick invisible/visible cycles from `d=1` through `d=32`. */
export function rockSlideMonBlinkInvisible(t: number, pressTick: number): boolean {
  const d = t - 1 - (pressTick + HIT_FLASH_RAM_ANCHOR_DELAY);
  if (d < 1 || d > 32) return false;
  return Math.floor((d - 1) / 4) % 2 === 0;
}

// --- S7 slice D: HP drain + turn-end (docs/battle-turn-notes.md §9,
// docs/battle-menu-notes.md §12) - the opponent's HP-bar drain
// (`pressTick`+597 = RAM tick 2516 on) through the resettled next-action
// idle cycle. Grid-searched against this session's own dense oracle capture
// (a 161-frame scratch trace, ticks 2500-2660) rather than the RAM-only
// `bar1Curr` schedule alone, since what matters here is the RENDERED pixel
// bar, not the raw counter.

/**
 * `bar1Curr`'s own drain schedule (`battle-turn-notes.md` §9: sentinel
 * -32768 at RAM 2516, then 1-HP-unit/tick 142->101 over 2517-2558, done
 * sentinel 0 at 2559) - but this window's render/RAM relationship is a
 * genuine EXCEPTION to the one-tick render lag every other ROCK_SLIDE
 * mechanism in this file uses (`rockSlideBg3Y`/`rockSlideHealthboxWobbleY2`
 * etc. all subtract 1 from `t`): the drained bar's pixel-fill count matches
 * `floor(hp/maxHp*48)` for `hp = startHp - clamp(t - drainStartTick, 0,
 * startHp-endHp)` with **`t` itself**, no `-1` - fit exact (0 residual)
 * against all 15 fill-count transitions in the dense capture (tick
 * 2517->47px through 2558->33px settled). Plausible mechanism: unlike a
 * hardware-register write that only becomes visible next vblank, the bar's
 * sprite tiles are CPU-copied into VRAM synchronously within
 * `MoveBattleBarGraphically`'s own call this same frame, so no extra frame
 * of lag accrues. `startHp`/`endHp` are the caller's own battler HP values
 * (this trace's own 143/101, not hardcoded here) - the formula is
 * value-agnostic. Valid for every `t`, not just mid-drain: before the
 * drain starts it clamps to `startHp` (full), after it's done it clamps to
 * `endHp` (settled) - safe to call unconditionally for the healthbox render
 * path.
 */
export const ROCK_SLIDE_HP_DRAIN_START_DELAY = 597;

export function rockSlideOpponentHp(t: number, pressTick: number, startHp: number, endHp: number): number {
  const d = t - (pressTick + ROCK_SLIDE_HP_DRAIN_START_DELAY);
  return Math.max(endHp, startHp - Math.max(d, 0));
}

/**
 * Turn-end: the held "ONIX used\nROCK SLIDE!" text (already drawn by
 * `drawRockSlideWindow`) goes blank (box stays, no text - same "teal blank
 * box" shape as `MENU_IDLE_BLANK_END_TICK`'s own pre-battle precedent) at
 * `pressTick`+657 (RAM/render tick 2576, pixel-confirmed: the 60x26 text
 * crop is byte-identical background-only from here, `battle-turn-notes.md`
 * §9's own silent-rolls span - flinch/turn-pass/ShouldSwitch/AI-setup all
 * land inside this blank hold with zero visible effect), then hard-cuts to
 * the resettled action menu at `pressTick`+664 (RAM/render tick 2583,
 * pixel-confirmed: a single-tick ~6000px swap of the whole bottom half of
 * the screen, the same atomic BG0-scroll-reveal mechanism as the original
 * menu's own tick-1748 draw, `battle-menu-notes.md` §5).
 */
export const ROCK_SLIDE_TEXT_CLEAR_DELAY = 657;
export const ROCK_SLIDE_MENU_REDRAW_DELAY = 664;

/**
 * The resettled action menu's own idle-bounce phase, mapped onto the
 * SAME closed-form `menuIdleBounce` this file already uses for the very
 * first (pre-turn) menu - not a new formula. Grid-search evidence (this
 * session): the resettled window's own observed sha sequence from
 * `pressTick`+664 on (`c2a09dbe1350`x1, `a4bffb32ef6b`x1, `c2a09dbe1350`x9,
 * `229869e8d282`x9, `0269314e68ff`x9, `a4bffb32ef6b`x9, repeat - the same
 * short 1-tick "blip" before the first full 9-tick dwell that the very
 * first menu ALSO shows at ticks 1748/1749, `battle-menu-notes.md` §4)
 * matches `menuIdleBounce(localT)` tick-for-tick when `localT` is anchored
 * so `pressTick`+664 (the redraw tick) lines up with `MENU_IDLE_BLANK_END_
 * TICK+1` (1748, the very first menu's own first content tick) - i.e. the
 * resettled menu's bounce task re-initializes fresh at redraw, not a
 * continuation of the pre-turn absolute-`t` counter (that hypothesis was
 * tried first and rejected: plain `menuIdleBounce(t)` does not reproduce
 * the observed blip/dwell boundaries at this `t` range at all).
 */
export function rockSlideResettledBounceTick(t: number, pressTick: number): number {
  return t - (pressTick + ROCK_SLIDE_MENU_REDRAW_DELAY) + (MENU_IDLE_BLANK_END_TICK + 1);
}

// --- S7 slice E1: turn 2's FIGHT-submenu reopen through ENDEAVOR's kickoff
// text (docs/battle-turn-notes.md §12, docs/battle-menu-notes.md §13). The
// resettled menu's own A-press (`rockSlideResettledBounceTick`'s domain)
// reopens FIGHT fresh via the existing generic `openFightSubmenu` - cursor
// rests at slot 0 (ROCK_SLIDE) same as turn 1's own rest, so no new "cursor
// persistence" mechanism is needed this specific case (see the module's own
// doc for the caveat: this only re-confirms turn 1's rest was ALSO slot 0,
// not a general multi-slot persistence model). The one genuinely new thing
// while dwelling on ROCK_SLIDE is its PP display: turn 1's own use dropped
// it 10/10 -> 9/10, so the per-slot STATIC harvest (baked at 10/10) is now
// stale for its own PP digits alone - `fight-submenu-window.json`'s
// ROCK_SLIDE patch is still valid for every OTHER pixel (name/type/PP
// label/cursor/border, byte-confirmed unchanged), it's just the "10/10"
// glyph run within it that needs to become a fresh "9/10" render.

/**
 * Turn 1's own A-confirm press tick (RAM/render 1919 - matches
 * `FIGHT_CONFIRM_TEXT_DELAY`'s own doc: press-registers 1919 -> first glyph
 * 1929; `1919 + ROCK_SLIDE_MENU_REDRAW_DELAY(664) = 2583` matches the
 * resettled-menu redraw tick exactly). Needed here because reopening FIGHT
 * for turn 2 does NOT reset the underlying bounce task
 * (`HandleInputChooseMove` doesn't call `DoBounceEffect`/`EndBounceEffect`,
 * per this file's own turn-1 doc) - it inherits the RESETTLED action menu's
 * own re-anchored phase (`rockSlideResettledBounceTick`), not a fresh
 * absolute-`t` mapping the way turn 1's own very first open happened to
 * (that one coincided with the very first menu's own natural anchor, a
 * coincidence turn 2 doesn't share - oracle-pixel-confirmed this session:
 * the plain `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` formula that works for
 * turn 1 produces a wrong phase for turn 2's own dwelling ticks).
 */
const TURN1_CONFIRM_PRESS_TICK = 1919;

/** S7 slice E1: turn 2's own reopened submenu's bounce overlay - composes the resettled remap (`TURN1_CONFIRM_PRESS_TICK`'s own doc) with the ordinary `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` DMA-wait correction every submenu open needs. */
export function turn2SubmenuBounceTick(t: number): number {
  return rockSlideResettledBounceTick(t, TURN1_CONFIRM_PRESS_TICK) - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;
}

/**
 * The onix/healthbox bounce overlay's frozen state once turn 2's confirm
 * hands off (mirrors `turnKickoffFrozenBounceTick`'s own doc: the bounce
 * task stops a few ticks into the resolution, at whatever phase it happens
 * to be on then - not simply the live formula's own value at the freeze
 * moment, tried first and rejected here too, same as turn 1's own case).
 * Grid-searched directly against `battle1-turn2.json`'s own dwelling ticks
 * 2948-2999 (docs/battle-menu-notes.md §13): the oracle shows NEITHER
 * bounce region raised the entire span (`onixY2`=`healthboxY2`=0) - this is
 * any tick in that plateau (`menuIdleBounce`'s own 9-tick "flat" stretch),
 * kept as a literal pixel-fit constant per this run's established
 * convention for exactly this situation (`turnKickoffFrozenBounceTick`'s
 * own `pressTick - 19` precedent), not re-derived from `pressTick` this
 * time since the plateau found isn't a small offset from it.
 */
const TURN2_KICKOFF_FROZEN_BOUNCE_TICK = 2119;

/** S7 slice E1's own analogue of `turnKickoffBounceTick`, composed with `turn2SubmenuBounceTick`'s own resettled remap - live for the same `FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY` ticks after the press, then frozen at `TURN2_KICKOFF_FROZEN_BOUNCE_TICK`. */
export function turn2KickoffBounceTick(t: number, pressTick: number): number {
  if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return turn2SubmenuBounceTick(t);
  return TURN2_KICKOFF_FROZEN_BOUNCE_TICK;
}

/**
 * `GetCurrentPPToMaxPPState` (battle_message.c:3047-3075) - the PP-color
 * band `SetPPNumbersPaletteInMoveSelection` selects (0=empty..3=full).
 * Needed to verify (not assume) whether ROCK_SLIDE's 9/10 needs a different
 * color pair than the harvest's own baked-in full-PP band: for maxPP=10,
 * currentPP=9 this returns 3 (currentPP(9) > floor(maxPP/2)=5) - the SAME
 * band as 10/10, so no palette change accompanies the PP digit's own
 * redraw this turn (confirmed against a real oracle capture, not assumed -
 * see docs/battle-menu-notes.md §13).
 */
/**
 * ISSUES #20's ONLY previously-live PP change (ROCK_SLIDE spending 1 PP
 * once turn 1 resolves, docs/battle-menu-notes.md §13/§13b), now generalized
 * to whatever `activeMonMoveset` the caller supplies - `turn1Resolved` still
 * only ever decrements SLOT 0 (this engine's own scripted turn-1 choice is
 * always slot 0, `core.ts`'s own confirm gate), not "whichever move was
 * actually confirmed" in general. `turn2Resolved` (S7 slice F, docs/
 * battle-turn-notes.md §14: "DRAGON_BREATH... 19/20 remaining going into
 * turn 12 thanks to turn 2's own prior use") adds the SAME one-shot
 * decrement for SLOT 2 (DRAGON_BREATH, this engine's own scripted turn-2
 * choice) once turn 2 resolves - still only ever these two fixed slots, not
 * "whichever move was actually confirmed" in general; BIND/SANDSTORM's own
 * PP-after-use remains unoracled and would still be faking data to model.
 */
/**
 * S7 slice I: `turn3Resolved` (docs/battle-turn-notes.md §13/§22) adds a
 * SECOND slot-0 decrement - turn 3 also used ROCK_SLIDE (this engine's own
 * scripted turn-3 choice, cursor 0 again after the turn-2->3 UP-nav), so by
 * turn 4's own reopen ROCK_SLIDE has been used twice (turns 1 and 3, PP
 * 10->8), independent of `turn2Resolved`'s own slot-2 (DRAGON_BREATH)
 * decrement.
 *
 * S7 slice J: `turn4Resolved` (docs/battle-turn-notes.md §13/§23) adds a
 * THIRD slot-0 decrement - turn 4 also used ROCK_SLIDE (cursor stayed at 0,
 * no nav needed), so by turn 5's own reopen ROCK_SLIDE has been used three
 * times (turns 1, 3, 4 - PP 10->7), oracle-pixel-confirmed exact.
 */
export function currentPPForActiveMon(
  moveset: ActiveMonMoveset,
  turn1Resolved: boolean,
  turn2Resolved: boolean = false,
  turn3Resolved: boolean = false,
  turn4Resolved: boolean = false,
): readonly [number, number, number, number] {
  const [a, b, c, d] = moveset.maxPP;
  const slot0Uses = (turn1Resolved ? 1 : 0) + (turn3Resolved ? 1 : 0) + (turn4Resolved ? 1 : 0);
  return [a - slot0Uses, b, turn2Resolved ? c - 1 : c, d];
}

export function getCurrentPPToMaxPPState(currentPP: number, maxPP: number): 0 | 1 | 2 | 3 {
  if (maxPP === currentPP) return 3;
  if (maxPP <= 2) return currentPP > 1 ? 3 : ((2 - currentPP) as 0 | 1 | 2);
  if (maxPP <= 7) return currentPP > 2 ? 3 : ((2 - currentPP) as 0 | 1 | 2);
  if (currentPP === 0) return 2;
  if (currentPP <= Math.floor(maxPP / 4)) return 1;
  if (currentPP > Math.floor(maxPP / 2)) return 3;
  return 0;
}

/** `CHAR_SPACER` (characters.h:74, "Empty space") - `ConvertIntToDecimalStringN`'s own right-align padding glyph, a genuinely distinct font-encoding code from the plain ASCII space (width 6, matching a digit's own width, vs. the plain space's width 3) - not in `charmap.json` (that only covers printable/typed characters). */
export const CHAR_SPACER = 119;

/** FONT_NORMAL glyph codes for each decimal digit + slash, `src/data/gen/charmap.json`'s own codes (kept local since `ppRemainingGlyphCodes` needs to interleave `CHAR_SPACER`, which has no charmap entry, so it can't just build a JS string and hand it to the charmap-based `drawText`). */
const PP_DIGIT_CODES: readonly number[] = [161, 162, 163, 164, 165, 166, 167, 168, 169, 170];
const PP_SLASH_CODE = 186;

/**
 * `MoveSelectionDisplayPPNumber` (battle_controller_player.c): prints
 * `ConvertIntToDecimalStringN(currentPP, STR_CONV_MODE_RIGHT_ALIGN, 2)` +
 * "/" + the same for `maxPP`, on `B_WIN_PP_REMAINING` (FONT_NORMAL, a
 * separate window from the FONT_NARROW move-name/PP-label/type text - see
 * ISSUES #20). Right-align width 2 means a single-digit value gets a
 * leading `CHAR_SPACER` instead of a second digit (specialized to 0-99,
 * this window's only real domain). Oracle-pixel-confirmed exact for 9/10
 * against `battle1-turn2.json` tick 2911 (docs/battle-menu-notes.md §13) -
 * not just source-reasoned.
 */
export function ppRemainingGlyphCodes(currentPP: number, maxPP: number): number[] {
  const codes: number[] = [];
  const pushRightAligned2 = (value: number): void => {
    if (value > 9) codes.push(PP_DIGIT_CODES[Math.floor(value / 10)]!);
    else codes.push(CHAR_SPACER);
    codes.push(PP_DIGIT_CODES[value % 10]!);
  };
  pushRightAligned2(currentPP);
  codes.push(PP_SLASH_CODE);
  pushRightAligned2(maxPP);
  return codes;
}

/** ROCK_SLIDE's own PP digit window origin, patch-local to `fight-submenu-window.json`'s ROCK_SLIDE slot (grid-searched byte-exact against oracle tick 2911, 0/450 mismatches - docs/battle-menu-notes.md §13). Cross-confirmed by tile-position arithmetic: `B_WIN_PP_REMAINING`'s own `sStandardBattleWindowTemplates` entry (battle_bg.c) is 4 tiles (+32px) right of `B_WIN_PP`'s own column with a further +2px from the window's own internal text.x, matching this exactly relative to `PP_LABEL_ORIGIN` (tests/fontNarrow.test.ts). */
export const ROCK_SLIDE_PP_REMAINING_ORIGIN = { x: 201, y: 8 };

/** Grovyle's turn-2 move, ENDEAVOR - the kickoff message's own line 2 (line 1, "Foe GROVYLE used", is identical text to turn 1's own `TURN_KICKOFF_LINE1` - same attacker, same STRINGID_USEDMOVE template, reused verbatim). */
export const TURN2_KICKOFF_LINE2 = "ENDEAVOR!";
/** Total printable characters across both lines for turn 2's kickoff message (`TURN_KICKOFF_LINE1.length` + this line's own length) - `\n` free, same rule as `TURN_KICKOFF_TEXT_TOTAL`. */
export const TURN2_KICKOFF_TEXT_TOTAL = TURN_KICKOFF_LINE1.length + TURN2_KICKOFF_LINE2.length;

/**
 * Turn 2's own kickoff message hard-cuts in 1 tick EARLIER than
 * `turnKickoffTextStartTick`'s general formula predicts - oracle-confirmed
 * against `battle1-turn2.json` (the whole message window, all ~10900px of
 * it, differs at tick 2954 but not 2953 or 2955): pressTick(2945) +
 * `FIGHT_CONFIRM_TEXT_DELAY`(10) - 1 = 2954. A pixel-fit correction, not
 * source-attributed this session (plausible unverified guess: the
 * reopened-submenu's own extra DMA-wait state costs this transition 1 tick
 * the same way `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` costs the bounce overlay 2
 * - not confirmed further, flagged for a future session per this run's
 * no-silent-exclusion policy).
 */
export function turn2KickoffTextStartTick(pressTick: number): number {
  return turnKickoffTextStartTick(pressTick) - 1;
}

/** Visible character count (0..TURN2_KICKOFF_TEXT_TOTAL) of "Foe GROVYLE used\nENDEAVOR!" at absolute trace tick `t` - same 1-tick/char mechanism as turn 1's own `turnKickoffTextVisibleChars`, just a different total (26 vs turn 1's 29, only line 2 differs) and start tick (`turn2KickoffTextStartTick`). */
export function turn2KickoffTextVisibleChars(t: number, pressTick: number): number {
  const start = turn2KickoffTextStartTick(pressTick);
  if (t < start) return 0;
  return Math.min(TURN2_KICKOFF_TEXT_TOTAL, t - start + 1);
}

// --- S7 slice E1b: ENDEAVOR's own resolution window - Onix's HP-bar drain
// (docs/battle-turn-notes.md §12: RAM sentinel at tick 3098, drains
// 116->101 over 3099-3114, done sentinel 3115, `gBattleMons[0].hp` itself
// updates 3116) + the player healthbox's own HP-digit text
// (docs/battle-menu-notes.md §13/§14). ENDEAVOR's own attack animation
// (the attacker's squish/sweat-droplet/yellow-blend task plus the target's
// generic hit-flash, `Move_ENDEAVOR`/`BattleScript_HitFromAtkAnimation` -
// genuinely NOT the "plain generic hit" the prior slice's handoff assumed,
// see the doc) is explicitly NOT modeled this session - out of scope, see
// the doc's "what's left" note. Only the drain itself (which starts after
// the animation's own hit-flash has already finished, RAM tick 3096) is
// wired here.

/**
 * Ticks from the A-confirm press to the HP-bar's own sentinel tick (RAM/
 * render 3098 = pressTick(2945)+153, oracle/RAM-cross-confirmed against
 * `battle1-turn2-ram-dump.json`'s `healthBar0Curr` column this session -
 * NOT the same delay as `HIT_FLASH_RAM_ANCHOR_DELAY`/
 * `ROCK_SLIDE_HP_DRAIN_START_DELAY` above, since ENDEAVOR's own attack
 * animation (unmodeled, see this section's own doc) takes a different
 * number of ticks than ROCK_SLIDE's before the target's hit-flash finishes
 * and `healthbarupdate` fires).
 */
export const ENDEAVOR_HP_DRAIN_START_DELAY = 153;

/**
 * Onix's own HP-bar drain value at trace tick `t` (`startHp`=117, `endHp`=
 * 101 for this trace) - same shape as `rockSlideOpponentHp` (1 HP unit per
 * tick, clamped, valid for every `t`) but its own named function since the
 * anchor delay differs (see `ENDEAVOR_HP_DRAIN_START_DELAY`'s doc) and this
 * is the PLAYER side, not the opponent's. **Grid-search-confirmed (this
 * session) the render tick uses `t` directly, no `-1` lag** - same
 * same-frame-CPU-copy mechanism `rockSlideOpponentHp`'s own doc already
 * reasoned about for the opponent bar, now independently re-confirmed
 * player-side rather than assumed: fit exact (0/288 mismatches) against 6
 * distinct fill-pixel-count/digit-text ticks spanning the drain (2999, 3099,
 * 3103, 3107, 3111, 3128) via `battle-healthbox.json`'s `hpbar`/`hpbarAnim`
 * tile sheets, cropped to the player healthbox's own fill strip.
 */
export function endeavorOnixHp(t: number, pressTick: number, startHp: number, endHp: number): number {
  const d = t - (pressTick + ENDEAVOR_HP_DRAIN_START_DELAY);
  return Math.max(endHp, startHp - Math.max(d, 0));
}
