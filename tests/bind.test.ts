import { describe, expect, it } from "vitest";
import {
  BIND_ANIMATION_PROFILE,
  bindAnimationAtAge,
  scaleMonAndRestoreAtAge,
  swayMonOffsetAtAge,
} from "../src/engine/bind.ts";

describe("BIND source-owned move body", () => {
  it("pins the source arguments and two script-scheduled squeeze calls", () => {
    expect(BIND_ANIMATION_PROFILE).toEqual({
      sway: { direction: 0, amplitude: 6, period: 3328, sways: 4 },
      squeeze: { xDelta: 10, yDelta: -5, duration: 5 },
      squeezeStarts: [3, 21],
    });
  });

  it("replays the four-sway attacker x2 timeline and restores it", () => {
    expect(Array.from({ length: 45 }, (_, age) =>
      bindAnimationAtAge(age, "player").attackerX2
    )).toEqual([
      0, 0, 0, 1, 3, 4, 5, 5, 5, 4, 3, 1, -1, -3, -4,
      -6, -6, -6, -6, -5, -4, -2, 0, 2, 4, 5, 5, 5, 5, 4,
      2, 1, -1, -3, -5, -6, -6, -6, -6, -5, -3, -1, 0, 0, 0,
    ]);
    expect(swayMonOffsetAtAge(3, BIND_ANIMATION_PROFILE.sway, "opponent"))
      .toBe(-2);
  });

  it("runs reusable scale-and-restore deltas without mutating inputs", () => {
    const params = { xDelta: 10, yDelta: -5, duration: 5 } as const;
    const before = structuredClone(params);
    expect(Array.from({ length: 11 }, (_, age) =>
      scaleMonAndRestoreAtAge(age, params)
    )).toEqual([
      { active: true, xScale: 266, yScale: 251 },
      { active: true, xScale: 276, yScale: 246 },
      { active: true, xScale: 286, yScale: 241 },
      { active: true, xScale: 296, yScale: 236 },
      { active: true, xScale: 306, yScale: 231 },
      { active: true, xScale: 296, yScale: 236 },
      { active: true, xScale: 286, yScale: 241 },
      { active: true, xScale: 276, yScale: 246 },
      { active: true, xScale: 266, yScale: 251 },
      { active: false, xScale: 256, yScale: 256 },
      { active: false, xScale: 256, yScale: 256 },
    ]);
    expect(params).toEqual(before);
  });
});
