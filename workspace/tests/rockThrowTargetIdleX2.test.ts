import { describe, expect, it } from "vitest";
import { ROCK_THROW_ANIMATION_PROFILE, rockThrowTargetX2 } from "../src/animation/rockThrow.ts";

// docs/live-species-audit-2.md 2.3: the target holds its species' own idle x2 until the shake task writes 0.
describe("rockThrowTargetX2 species idle x2", () => {
  it("defaults to the ONIX +1 and honours a zero-idle species", () => {
    expect(rockThrowTargetX2(0)).toBe(1);
    expect(rockThrowTargetX2(20)).toBe(1);
    expect(rockThrowTargetX2(21)).toBe(0);
    const golbat = { ...ROCK_THROW_ANIMATION_PROFILE, targetIdleX2: 0 };
    expect(rockThrowTargetX2(0, golbat)).toBe(0);
    expect(rockThrowTargetX2(20, golbat)).toBe(0);
    expect(rockThrowTargetX2(5, { ...ROCK_THROW_ANIMATION_PROFILE, targetIdleX2: 1 })).toBe(1);
  });
});
