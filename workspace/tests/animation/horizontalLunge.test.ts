import { describe, expect, it } from "vitest";
import {
  horizontalLungeDestroyTick,
  horizontalLungeX2AtTick,
} from "../../src/animation/horizontalLunge.ts";

describe("gHorizontalLungeSpriteTemplate source port", () => {
  it("reproduces Knock Off's 4x6 player-side lunge and callback pauses", () => {
    expect(
      Array.from(
        { length: 12 },
        (_, tick) => horizontalLungeX2AtTick(4, 6, "player", tick),
      ),
    ).toEqual([0, 6, 12, 18, 24, 24, 24, 18, 12, 6, 0, 0]);
    expect(horizontalLungeDestroyTick(4)).toBe(12);
  });

  it("mirrors the delta for an opponent-side attacker", () => {
    expect(horizontalLungeX2AtTick(4, 6, "opponent", 4)).toBe(-24);
    expect(horizontalLungeX2AtTick(4, 6, "opponent", 10)).toBe(0);
  });
});
