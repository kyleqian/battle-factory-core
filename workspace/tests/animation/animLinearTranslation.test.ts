import { describe, expect, it } from "vitest";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "../../src/animation/animLinearTranslation.ts";

describe("StartAnimLinearTranslation Q8.8 accumulator port", () => {
  it("reproduces firePunch.ts's formerly-hardcoded burn-flame deltas", () => {
    // ((200 - 152) << 8) / 20 = 614; moving left forces the low bit (615).
    expect(linearTranslationDeltaQ8(48, 20)).toBe(614);
    expect(linearTranslationDeltaQ8(-48, 20)).toBe(-615);
  });

  it("accumulates and freezes at durationTicks callbacks", () => {
    const delta = linearTranslationDeltaQ8(48, 20);
    expect(linearTranslationOffsetAfterCallbacks(delta, 0, 20)).toBe(0);
    expect(linearTranslationOffsetAfterCallbacks(delta, 1, 20)).toBe(2);
    expect(linearTranslationOffsetAfterCallbacks(delta, 20, 20)).toBe(47);
    // Frozen: further callbacks beyond durationTicks don't move the sprite.
    expect(linearTranslationOffsetAfterCallbacks(delta, 21, 20)).toBe(47);
    expect(linearTranslationOffsetAfterCallbacks(delta, 1000, 20)).toBe(47);
  });

  it("matches fly.ts's independently-derived closed form for the strike ball", () => {
    // fly.ts's flyStrikeBallAtAge: startX=272 (opponent), targetCenter.x=72,
    // FLY_STRIKE_DURATION=20, callbacks=age+1. Cross-checked against the
    // same math this module now shares with firePunch.ts's burn flames
    // (fly.ts is not re-driven through this module this step - see
    // ANIMATION_PROGRESS.md's RUNG 2 entry - but its own private
    // `linearDeltaQ8`/`truncDiv` helpers compute the identical formula).
    const delta = linearTranslationDeltaQ8(72 - 272, 20);
    expect(delta).toBe(-2561); // magnitude 2560, forced odd, negated
    const offsetAtAge0 = linearTranslationOffsetAfterCallbacks(delta, 1, 20);
    expect(272 + offsetAtAge0).toBe(262);
  });
});
