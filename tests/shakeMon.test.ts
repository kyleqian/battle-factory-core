import { describe, expect, it } from "vitest";
import { shakeMonOffsetAtTick, shakeMonSequence } from "../src/engine/shakeMon.ts";

describe("AnimTask_ShakeMon 1:1 port", () => {
  it("reproduces QUICK_ATTACK's dense-oracle-pinned display ages exactly", () => {
    // Source call: AnimTask_ShakeMon(ANIM_TARGET,5,0,6,1), created the same
    // age impact becomes visible (age 58). Oracle-pinned nonzero ages:
    // 58, 61, 62, 65, 66 (quickAttack.test.ts / 219/219 + 214/214 comparators).
    const nonzeroTicks = shakeMonSequence(5, 0, 6, 1)
      .map((offset, tick) => ({ tick, x2: offset.x2 }))
      .filter(({ x2 }) => x2 !== 0)
      .map(({ tick }) => tick);
    expect(nonzeroTicks).toEqual([0, 3, 4, 7, 8]);
    expect([58, 61, 62, 65, 66].map((age) => shakeMonOffsetAtTick(5, 0, 6, 1, age - 58).x2))
      .toEqual([5, 5, 5, 5, 5]);
    expect(shakeMonOffsetAtTick(5, 0, 6, 1, 11).x2).toBe(0);
  });

  it(
    "documents a genuine divergence from FLY's hand-fit shake table (not ported)",
    () => {
      // FlyUnleash's own instance: AnimTask_ShakeMon(ANIM_TARGET,6,0,8,1)
      // (battle_anim_scripts.s:6418), created the same tick as the
      // hitsplat (script has zero `delay` between them). The literal port
      // predicts 7 nonzero ticks after creation - an isolated tick 0, then
      // three 2-tick pairs - for ANY numTimes/frameDelay combination where
      // frameDelay==1 and numTimes is even, because toggle-then-hold-then-
      // toggle only settles into steady 2-tick pairs after the first
      // isolated toggle.
      const nonzeroTicks = shakeMonSequence(6, 0, 8, 1)
        .map((offset, tick) => ({ tick, x2: offset.x2 }))
        .filter(({ x2 }) => x2 !== 0)
        .map(({ tick }) => tick);
      expect(nonzeroTicks).toEqual([0, 3, 4, 7, 8, 11, 12]);
      // fly.ts's committed FLY_SHAKE_AGES = {24,25,28,29,32,33} is exactly
      // this shape MINUS the isolated leading tick, at creationAge=21 (one
      // before FLY_IMPACT_FIRST_AGE=22): {21,24,25,28,29,32,33} vs
      // {24,25,28,29,32,33}. Swapping the literal port in at that
      // alignment was verified against the real oracle this session and
      // DOES regress FLY's strike comparator (248/248 -> 247/248, one
      // mismatched frame at the extra age-21 tick) - see
      // ANIMATION_PROGRESS.md's RUNG 1 entry. fly.ts's hand-fit stays as
      // the source of truth; this test only pins the port's own
      // (correct-per-source, divergent-per-oracle) prediction so the gap
      // is visible without a second oracle round-trip.
      const creationAge = 21;
      const portPredicted = [0, 3, 4, 7, 8, 11, 12].map((t) => t + creationAge);
      expect(portPredicted).toEqual([21, 24, 25, 28, 29, 32, 33]);
    },
  );
});
