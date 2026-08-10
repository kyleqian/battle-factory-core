// SpriteCB_Pokeball (reference/pokeemerald/src/battle_factory_screen.c:1059-
// 1090): once a ball's palette is PALTAG_BALL_SELECTED, its sprite callback
// alternates between a "rocking" cycle (sAnim_Select_Pokeball_Moving,
// battle_factory_screen.c:498-518 - 17 tile/duration steps below, tiles
// 0/16/32 map to pokeball.json's 3 extracted 4-tile-tall animation frames)
// and Random()%5==0-gated rest breaks. Not re-derivable from the source
// alone: the *visible* animNum only flips 1 tick after a roll SUCCEEDS
// (StartSpriteAnim(0) is immediately overridden by the outer
// `else StartSpriteAnimIfDifferent(sprite,1)` branch the very next tick,
// since animEnded is false right after a fresh anim starts) but flips
// immediately on a FAILED roll (StartSpriteAnim(1) called directly) -
// RAM-dumped ground truth (dev-time RAM inspection recipe, ROADMAP.md Domain
// notes) pins this exactly; see tests/ballAnim.test.ts for the two
// checkpoints (a SUCCESS and a FAILURE roll) against gRngValue.
//
// A freshly-selected ball's first roll-eligibility check lands 2 ticks after
// the selection tick, not sooner or immediately (also RAM-dumped, not
// re-derived) - modeled as the "settling" phase below. Per-tick RNG order
// (RAM-confirmed via the SUCCESS checkpoint): this engine's standard
// per-VBlank Random() advance (core.ts) always happens BEFORE a ball's own
// roll draw on any tick both occur.

import { advanceRngValue } from "./rng.ts";

interface MovingCmd {
  tile: number;
  duration: number;
}

// sAnim_Select_Pokeball_Moving: ANIMCMD_FRAME(tile, duration) pairs.
const MOVING_CMDS: MovingCmd[] = [
  { tile: 16, duration: 4 },
  { tile: 0, duration: 4 },
  { tile: 32, duration: 4 },
  { tile: 0, duration: 4 },
  { tile: 16, duration: 4 },
  { tile: 0, duration: 4 },
  { tile: 32, duration: 4 },
  { tile: 0, duration: 4 },
  { tile: 0, duration: 32 },
  { tile: 16, duration: 8 },
  { tile: 0, duration: 8 },
  { tile: 32, duration: 8 },
  { tile: 0, duration: 8 },
  { tile: 16, duration: 8 },
  { tile: 0, duration: 8 },
  { tile: 32, duration: 8 },
  { tile: 0, duration: 8 },
];

// Random() % 5 == 0 success holds the ball still ("data[0] = 32") for this
// many further ticks once its rocking cycle finishes - matches RAM's data[0]
// exactly (rollRest below stores this as `pendingRest`, RAM-pinned at 32 by
// tests/ballAnim.test.ts's frame-39 checkpoint), so keep this the literal
// RAM-visible cooldown value.
const REST_TICKS = 32;
// RAM-confirmed (single ball AND two-ball probes, ISSUES #6): data[0] counts
// REST_TICKS -> 0 one tick each, then the NEXT roll's Random() draw happens
// on the FOLLOWING tick - a (REST_TICKS + 1)-tick span from the success tick
// to the next roll. This model's "resting" phase begins one internal tick
// *before* that RAM-visible success tick (the same pre-existing internal/RAM
// offset the settling->moving transition also has - harmless there since
// nothing ever samples a frame between the two), so the resting phase's
// internal timer needs REST_TICKS + 2 (not just +1) to land the next roll's
// draw on the exact same absolute tick RAM does. Applied only at the
// resting-phase transition below, kept separate from `pendingRest`'s own
// RAM-accurate value (used as the displayed/tested cooldown), so this offset
// never leaks into anything RAM-observable - only the internal Random()-draw
// timing changes. Single-ball behavior is unaffected either way (nothing
// samples a frame in that 2-tick gap there), but a second ball's own
// interleaved draws made during that gap desync without this.
const REST_INTERNAL_OFFSET = 2;
// RAM-confirmed (ISSUES #6, two-ball probe): a moving cycle that ends on a
// FAILURE (pendingRest 0, no rest queued) doesn't reroll on the same tick
// its last cmd exhausts - the reroll's Random() draw lands exactly one tick
// later. See the "moving" phase's pendingRest===0 branch below.
const FAILURE_REROLL_DELAY = 1;
// A freshly-selected ball's first roll check lands 2 ticks after selection.
const SETTLE_TICKS = 2;

export type BallAnimPhase = "settling" | "moving" | "resting";

interface BallAnimCore {
  phase: BallAnimPhase;
  /** Ticks remaining in the current phase/cmd before the next transition. */
  timer: number;
  /** Index into MOVING_CMDS; only meaningful while phase === "moving". */
  cmdIndex: number;
  /** Rest ticks queued for when the in-progress moving cycle completes (0 = reroll immediately instead). */
  pendingRest: number;
  /** Source success branch's StartSpriteAnim(0) defers moving anim 1 until the next callback. */
  movingStartDelay?: boolean;
}

/** internalTile() display-lag history depth this file ever needs (see BallAnimState.tileHistory's doc): slot 0 pre-rest (2) + the ISSUES #9 reveal-stall bump (+1) = 3 max, so 2 history entries (index 0/1) cover every case with a spare. */
const TILE_HISTORY_LENGTH = 2;

export interface BallAnimState extends BallAnimCore {
  /**
   * The tile actually shown on screen this tick - lags `phase`/`cmdIndex`'s
   * own internal transition by a per-tick, per-slot number of ticks (see
   * `advanceBallAnim`'s `lag` computation). RAM-dumped ground truth (ISSUES
   * #7 remainder, dev-time RAM probe: direct `struct Sprite` reads of
   * `animCmdIndex` cross-correlated tick-by-tick against raw framebuffer
   * diffs, ~80 transitions across both balls of a 2-rent dwell) found the
   * real hardware's OWN OAM-buffer display lag from its *own* animCmdIndex is
   * a uniform 1 tick for every ball - the apparent "2" for slot 0 is this
   * engine's own settling-phase internal cmdIndex running exactly 1 tick
   * EARLY vs the real hardware's animCmdIndex for slot 0's *first* moving
   * cycle only (a pre-existing quirk this file's `REST_INTERNAL_OFFSET`
   * comment already flagged as present but "harmless" for single-ball).
   * ISSUES #9 (RAM-probed: all 3 ball slots simultaneously across a long
   * undisturbed 3-ball idle, cross-correlated tick-by-tick against this
   * file's internal cmdIndex): that 1-tick-early quirk is NOT a permanent
   * shift - `REST_INTERNAL_OFFSET`'s own extra tick self-corrects it the
   * moment slot 0 first passes through "resting" (RAM-confirmed: slot 0's
   * *second* moving cycle matches RAM's own animCmdIndex exactly, transition
   * for transition, with no offset), so the 2-tick delay is only correct
   * while `hasRested` is still false; once true, slot 0 needs only the same
   * 1-tick lag every other slot always has. Separately, ALL 3 slots drift 1
   * tick early again starting right around the reveal's window-fully-grown
   * hold (RAM-confirmed via each slot's own next cmdIndex-transition boundary
   * after that point, all consistent with one shared, screen-level 1-tick
   * cost - see confirmReveal.ts's `isRevealStallActive` doc) - modeled as a
   * flat +1 on top of the per-slot base lag once that predicate is true.
   * These two adjustments are captured in `hasRested` (data) and
   * `isRevealStallActive` (computed from `confirmReveal.ts`, passed in by
   * `core.ts`), kept entirely separate from `phase`/`cmdIndex` so the
   * RNG-critical internal timing (RAM-pinned, tests/ballAnim.test.ts) stays
   * undisturbed by this purely-visual delay.
   */
  displayTile: number;
  /** internalTile() history, most recent first - tileHistory[0] is the internalTile() value `advanceBallAnim` computed on the immediately-preceding call, tileHistory[1] the one before that. Sized by TILE_HISTORY_LENGTH; only indices needed for `lag - 2` are ever read. */
  tileHistory: readonly number[];
  /** Whether this ball has ever completed a full moving cycle (entered "resting" at least once) - see `displayTile`'s doc. */
  hasRested: boolean;
}

/** A ball's anim state the instant Select_HandleMonSelectionChange selects it - still shows the Still tile. */
export function initialBallAnimState(): BallAnimState {
  return { phase: "settling", timer: SETTLE_TICKS, cmdIndex: 0, pendingRest: 0, displayTile: 0, tileHistory: [], hasRested: false };
}

/**
 * Fresh selected-palette sprite created by Swap_InitAllSprites. Its still
 * animation has not ended, so SpriteCB_Pokeball immediately selects moving
 * anim 1 without a Random() roll; the first roll is at this cycle's end.
 */
export function initialMovingBallAnimState(): BallAnimState {
  return {
    phase: "moving",
    timer: MOVING_CMDS[0]!.duration,
    cmdIndex: 0,
    pendingRest: 0,
    displayTile: 0,
    tileHistory: [],
    hasRested: false,
  };
}

function internalTile(state: BallAnimCore): number {
  return state.phase === "moving" && !state.movingStartDelay
    ? MOVING_CMDS[state.cmdIndex]!.tile
    : 0;
}

/** Which pokeball.json animation-frame tile (0/16/32) this ball is currently showing. */
export function ballAnimTile(state: BallAnimState): number {
  return state.displayTile;
}

function rollRest(rngValue: number): { rngValue: number; pendingRest: number } {
  const nextRngValue = advanceRngValue(rngValue);
  const roll = (nextRngValue >>> 16) & 0xffff;
  return { rngValue: nextRngValue, pendingRest: roll % 5 === 0 ? REST_TICKS : 0 };
}

function beginMoving(
  rngValue: number,
  delaySuccessfulStart: boolean,
): { state: BallAnimCore; rngValue: number } {
  const rolled = rollRest(rngValue);
  return {
    state: {
      phase: "moving",
      timer: MOVING_CMDS[0]!.duration,
      cmdIndex: 0,
      pendingRest: rolled.pendingRest,
      movingStartDelay: delaySuccessfulStart && rolled.pendingRest > 0,
    },
    rngValue: rolled.rngValue,
  };
}

/**
 * Advance one selected ball's anim state by one tick, consuming `rngValue`
 * further (Random() % 5 == 0) exactly when a roll happens this tick. Call
 * once per selected ball per engine tick, threading `rngValue` through in
 * ball-index order (matches the sprite-array iteration order
 * AnimateSprites() uses, per-VBlank consumption already applied by the
 * caller before this runs - see core.ts).
 *
 * `isSlot0`/`revealStallActive`: display-only lag inputs (see
 * `BallAnimState.displayTile`'s doc, ISSUES #7/#9) - neither affects
 * `rngValue` or any field `advanceBallAnimCore` returns.
 */
export function advanceBallAnim(
  state: BallAnimState,
  rngValue: number,
  isSlot0: boolean,
  revealStallActive: boolean,
  delaySuccessfulStart = false,
): { state: BallAnimState; rngValue: number } {
  const currentInternalTile = internalTile(state);
  const lag = (isSlot0 && !state.hasRested ? 2 : 1) + (revealStallActive ? 1 : 0);
  const displayTile = lag <= 1 ? currentInternalTile : (state.tileHistory[lag - 2] ?? 0);
  const result = advanceBallAnimCore(state, rngValue, delaySuccessfulStart);
  const hasRested = state.hasRested || result.state.phase === "resting";
  const tileHistory = [currentInternalTile, ...state.tileHistory].slice(0, TILE_HISTORY_LENGTH);
  return { state: { ...result.state, displayTile, tileHistory, hasRested }, rngValue: result.rngValue };
}

function advanceBallAnimCore(
  state: BallAnimCore,
  rngValue: number,
  delaySuccessfulStart: boolean,
): { state: BallAnimCore; rngValue: number } {
  if (state.phase === "settling") {
    if (state.timer > 1) return { state: { ...state, timer: state.timer - 1 }, rngValue };
    return beginMoving(rngValue, delaySuccessfulStart);
  }
  if (state.phase === "moving") {
    if (state.movingStartDelay) {
      return {
        state: { ...state, movingStartDelay: false },
        rngValue,
      };
    }
    if (state.timer > 1) return { state: { ...state, timer: state.timer - 1 }, rngValue };
    const nextCmdIndex = state.cmdIndex + 1;
    if (nextCmdIndex < MOVING_CMDS.length) {
      return { state: { ...state, cmdIndex: nextCmdIndex, timer: MOVING_CMDS[nextCmdIndex]!.duration }, rngValue };
    }
    if (state.pendingRest > 0) {
      return {
        state: { phase: "resting", timer: state.pendingRest + REST_INTERNAL_OFFSET, cmdIndex: state.cmdIndex, pendingRest: 0 },
        rngValue,
      };
    }
    // A moving cycle that ends on a FAILURE (no queued rest) rerolls
    // immediately - but RAM-confirmed (ISSUES #6, two-ball probe: ball1's
    // own first cycle failed, then finished its 128-tick cycle at tick249,
    // yet its reroll's Random() draw and cmdIndex reset don't land until
    // tick250) that reroll's draw lands one tick after the cycle-exhaustion
    // tick, not the same tick - reuse the "resting" phase's own
    // timer-expiry-calls-beginMoving mechanism with timer=1 for exactly that
    // one-tick delay (no visible tile change in between - internalTile()
    // returns the same "still" tile 0 for both "moving" cmdIndex 16 and
    // "resting", so this is unobservable beyond the RNG-draw timing it fixes).
    return { state: { phase: "resting", timer: FAILURE_REROLL_DELAY, cmdIndex: state.cmdIndex, pendingRest: 0 }, rngValue };
  }
  // resting
  if (state.timer > 1) return { state: { ...state, timer: state.timer - 1 }, rngValue };
  return beginMoving(rngValue, delaySuccessfulStart);
}
