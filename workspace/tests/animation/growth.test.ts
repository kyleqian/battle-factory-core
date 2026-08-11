import { describe, expect, it } from "vitest";
import { growthAnimationAtAge } from "../../src/animation/growth.ts";

// RAM-probed via tools/probe/dump-growth-blendcolorcycle.py against
// tools/battle-lab/mechanic-growth-player-ivysaur-opponent-onix.json,
// ticks 205-245 (age = tick - 211, the first call's task-creation tick).
// scaleMonTask.data[2] is the remaining-step counter (16 down to 1 for the
// shrink leg, then 16 down to 4 for the observed tail of the restore leg);
// data[3] (duration) reads 16 throughout the shrink leg and 0 once the
// restore leg begins - both consistent with scaleMonAndRestoreAtAge's own
// (xDelta=-3, yDelta=-3, duration=16) step formula.
describe("MOVE_GROWTH's GrowthEffect (blend_color_cycle + ScaleMonAndRestore)", () => {
  it("creates both tasks on the same tick, both calls, per the RAM probe", () => {
    // First call: task alive age 0..30 (tick 211..241), gone by age 31 (tick 242).
    expect(growthAnimationAtAge(0).attackerScale.active).toBe(true);
    expect(growthAnimationAtAge(30).attackerScale.active).toBe(true);
    expect(growthAnimationAtAge(31).attackerScale.active).toBe(false);
    // Second call starts exactly 32 ticks later (tick 243), per the probe.
    expect(growthAnimationAtAge(32).attackerScale.active).toBe(true);
    expect(growthAnimationAtAge(62).attackerScale.active).toBe(true);
    expect(growthAnimationAtAge(63).attackerScale.active).toBe(false);
  });

  it("shrinks the attacker by 3px/step down to a 16-step trough, then restores", () => {
    // age 0 -> step 1 -> xScale/yScale = 256 - 3 = 253.
    expect(growthAnimationAtAge(0).attackerScale.xScale).toBe(253);
    expect(growthAnimationAtAge(0).attackerScale.yScale).toBe(253);
    // age 15 -> step 16 (the trough) -> 256 - 48 = 208.
    expect(growthAnimationAtAge(15).attackerScale.xScale).toBe(208);
    // age 16 -> mirrored step 15 -> 256 - 45 = 211 (matches the RAM-probed
    // data[2]=15 at the first tick of the restore leg, tick 226).
    expect(growthAnimationAtAge(16).attackerScale.xScale).toBe(211);
    // age 30 -> mirrored step 1 -> 253 (back to the first-tick value).
    expect(growthAnimationAtAge(30).attackerScale.xScale).toBe(253);
  });

  it("flashes the attacker's own OBJ row toward WHITE and back, in step with the blend cycle's own even-age lag", () => {
    expect(growthAnimationAtAge(-1).attackerObjY).toBe(0);
    expect(growthAnimationAtAge(0).attackerObjY).toBe(0);
    expect(growthAnimationAtAge(8).attackerObjY).toBe(8);
    expect(growthAnimationAtAge(13).attackerObjY).toBe(8);
    expect(growthAnimationAtAge(20).attackerObjY).toBe(2);
    // Blend cycle finishes well before the scale task (age 26 vs age 30);
    // the row stays restored to 0 (no tint) for the scale task's own tail.
    expect(growthAnimationAtAge(26).attackerObjY).toBe(0);
    expect(growthAnimationAtAge(30).attackerObjY).toBe(0);
    // Second call repeats the identical relative shape at its own age 0.
    expect(growthAnimationAtAge(32).attackerObjY).toBe(0);
    expect(growthAnimationAtAge(40).attackerObjY).toBe(8);
  });

  it("is fully idle before the first call and after the second call ends", () => {
    const before = growthAnimationAtAge(-1);
    expect(before.attackerScale).toEqual({ active: false, xScale: 256, yScale: 256 });
    expect(before.attackerObjY).toBe(0);
    const after = growthAnimationAtAge(63);
    expect(after.attackerScale).toEqual({ active: false, xScale: 256, yScale: 256 });
    expect(after.attackerObjY).toBe(0);
  });
});
