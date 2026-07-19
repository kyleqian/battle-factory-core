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
