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
// many further ticks once its rocking cycle finishes.
const REST_TICKS = 32;
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
}

export interface BallAnimState extends BallAnimCore {
  /**
   * The tile actually shown on screen this tick - always TWO ticks behind
   * `phase`/`cmdIndex`'s own internal transition (oracle-verified dense
   * compare: every phase/cmdIndex transition's pixels land exactly 2 ticks
   * later than the RAM-dumped internal transition itself - OAM double-
   * buffering plus this sprite callback's own StartSpriteAnim-vs-
   * StartSpriteAnimIfDifferent one-tick quirk stack; not re-derived from
   * first principles, just pinned from the oracle same as this screen's
   * other render-lag quirks, e.g. monPic.ts's spriteVisible split). Kept
   * separate from `phase`/`cmdIndex` so the RNG-critical internal timing
   * (RAM-pinned, tests/ballAnim.test.ts) stays undisturbed by this purely-
   * visual delay - `pendingDisplayTile` is the 1-tick stage in between.
   */
  displayTile: number;
  pendingDisplayTile: number;
}

/** A ball's anim state the instant Select_HandleMonSelectionChange selects it - still shows the Still tile. */
export function initialBallAnimState(): BallAnimState {
  return { phase: "settling", timer: SETTLE_TICKS, cmdIndex: 0, pendingRest: 0, displayTile: 0, pendingDisplayTile: 0 };
}

function internalTile(state: BallAnimCore): number {
  return state.phase === "moving" ? MOVING_CMDS[state.cmdIndex]!.tile : 0;
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

function beginMoving(rngValue: number): { state: BallAnimCore; rngValue: number } {
  const rolled = rollRest(rngValue);
  return {
    state: { phase: "moving", timer: MOVING_CMDS[0]!.duration, cmdIndex: 0, pendingRest: rolled.pendingRest },
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
 */
export function advanceBallAnim(state: BallAnimState, rngValue: number): { state: BallAnimState; rngValue: number } {
  const pendingDisplayTile = internalTile(state);
  const displayTile = state.pendingDisplayTile;
  const result = advanceBallAnimCore(state, rngValue);
  return { state: { ...result.state, displayTile, pendingDisplayTile }, rngValue: result.rngValue };
}

function advanceBallAnimCore(state: BallAnimCore, rngValue: number): { state: BallAnimCore; rngValue: number } {
  if (state.phase === "settling") {
    if (state.timer > 1) return { state: { ...state, timer: state.timer - 1 }, rngValue };
    return beginMoving(rngValue);
  }
  if (state.phase === "moving") {
    if (state.timer > 1) return { state: { ...state, timer: state.timer - 1 }, rngValue };
    const nextCmdIndex = state.cmdIndex + 1;
    if (nextCmdIndex < MOVING_CMDS.length) {
      return { state: { ...state, cmdIndex: nextCmdIndex, timer: MOVING_CMDS[nextCmdIndex]!.duration }, rngValue };
    }
    if (state.pendingRest > 0) {
      return { state: { phase: "resting", timer: state.pendingRest, cmdIndex: state.cmdIndex, pendingRest: 0 }, rngValue };
    }
    return beginMoving(rngValue);
  }
  // resting
  if (state.timer > 1) return { state: { ...state, timer: state.timer - 1 }, rngValue };
  return beginMoving(rngValue);
}
