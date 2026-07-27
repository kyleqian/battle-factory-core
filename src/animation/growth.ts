// MOVE_GROWTH's own animation body (`GrowthEffect`, `battle_anim_scripts.s:
// 2026-2030`): `call GrowthEffect` x2 with `waitforvisualfinish` between,
// each call driving the SAME two already-ported mechanisms simultaneously on
// the attacker - `blend_color_cycle` (src/animation/blendColorCycle.ts, RAM-
// probed argv: selector=ATTACKER, delay=0, numBlends=2, initialBlendY=0,
// targetBlendY=8, color=WHITE) and `createvisualtask
// AnimTask_ScaleMonAndRestore, 5, -3, -3, 16, ANIM_ATTACKER, 0` (already-
// proven `scaleMonAndRestoreAtAge` from src/animation/bind.ts, xDelta=-3,
// yDelta=-3, duration=16).
//
// RAM-probed directly (`tools/probe/dump-growth-blendcolorcycle.py` against
// `tools/battle-lab/mechanic-growth-player-ivysaur-opponent-onix.json`,
// ticks 205-245): both tasks for a given `GrowthEffect` call are created on
// the SAME tick (211 for the first call, 243 for the second) - i.e. they
// share one age-0 reference per call, no relative offset between them.
// `waitforvisualfinish` blocks the second call until BOTH tasks from the
// first call are gone; since ScaleMonAndRestore (31 ticks active, age 0-30)
// outlasts the blend cycle (27 ticks), the second call's own tasks begin
// exactly 32 ticks after the first (tick 243 - tick 211 = 32,
// scaleMonTask last alive at age 30 = tick 241, gone by tick 242, next
// call's tasks appear at tick 243) - GROWTH_CALL_STARTS below is this
// probed constant, not derived from the source script alone (no `delay`
// commands exist between the two `call GrowthEffect`s; the gap is entirely
// `waitforvisualfinish` waiting on the longer-lived scale task).
import {
  blendColorCycleObjYAtAge,
  type BlendColorCycleTiming,
} from "./blendColorCycle.ts";
import {
  scaleMonAndRestoreAtAge,
  type ScaleMonAndRestoreParameters,
} from "./bind.ts";

export const GROWTH_BLEND_TIMING: Readonly<BlendColorCycleTiming> =
  Object.freeze({
    legs: [
      Object.freeze({ startY: 0, targetY: 8 }),
      Object.freeze({ startY: 8, targetY: 0 }),
    ],
    deltaY: 2,
  });

export const GROWTH_SCALE_PARAMS: Readonly<ScaleMonAndRestoreParameters> =
  Object.freeze({ xDelta: -3, yDelta: -3, duration: 16 });

export const GROWTH_CALL_STARTS: readonly [number, number] = [0, 32];

export interface GrowthAnimationState {
  readonly attackerObjY: number;
  readonly attackerScale: Readonly<{
    readonly active: boolean;
    readonly xScale: number;
    readonly yScale: number;
  }>;
}

const GROWTH_CALL_ACTIVE_TICKS = GROWTH_SCALE_PARAMS.duration * 2 - 1;

/** `age` is ticks since the FIRST `GrowthEffect` call's task-creation tick. */
export function growthAnimationAtAge(age: number): GrowthAnimationState {
  for (const start of GROWTH_CALL_STARTS) {
    const local = age - start;
    if (local >= 0 && local < GROWTH_CALL_ACTIVE_TICKS) {
      return {
        attackerObjY: blendColorCycleObjYAtAge(local, GROWTH_BLEND_TIMING),
        attackerScale: scaleMonAndRestoreAtAge(local, GROWTH_SCALE_PARAMS),
      };
    }
  }
  return {
    attackerObjY: 0,
    attackerScale: { active: false, xScale: 256, yScale: 256 },
  };
}
