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
