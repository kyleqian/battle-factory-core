// snd233 Part B: the player send-out ball's tail (landing ticks, closed ball, open / open-final) for species whose ball lands above the terrain clip row.
import { describe, expect, it } from "vitest";
import { midBattleSwitchInAt } from "../src/engine/battleResolutionPresentationRender.ts";

const poses = (monY: number, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, k) => {
    const v = midBattleSwitchInAt(from + k, 0, undefined, undefined, undefined, monY);
    return v.ballVisible ? v.ballPose : null;
  });

describe("snd233 player send-out ball tail", () => {
  it("monY 93 (default) keeps no ball after the tabulated flight", () => {
    expect(poses(93, 45, 70).every((p) => p === null)).toBe(true);
  });

  it("a high-landing species (monY 80, 84) keeps the ball through landing, then 5 open and 6 open-final rows", () => {
    for (const monY of [80, 84]) {
      const flat = poses(monY, 40, 62).map((p) => p ?? "-");
      expect(flat.slice(0, 8)).toEqual(Array(8).fill("closed")); // elapsed 40..47: flight, landing tick, unrotated closed ball
      expect(flat.slice(8, 13)).toEqual(Array(5).fill("open")); // 48..52
      expect(flat.slice(13, 19)).toEqual(Array(6).fill("open-final")); // 53..58
      expect(flat.slice(19)).toEqual(Array(4).fill("-")); // 59..
    }
  });

  it("a species whose landed ball is under the clip row (monY 86, 88) shows nothing after elapsed 45", () => {
    for (const monY of [86, 88]) expect(poses(monY, 46, 70).every((p) => p === null)).toBe(true);
  });

  it("the landed open ball is above the terrain clip row and the closed ball tail pose is closed", () => {
    const v = midBattleSwitchInAt(49, 0, undefined, undefined, undefined, 84);
    expect(v.ballPose).toBe("open");
    expect(v.ballPosition!.y - 8).toBeLessThan(112);
  });

  it("opponent side is untouched", () => {
    const a = midBattleSwitchInAt(50, 1, undefined, undefined, undefined, 84);
    const b = midBattleSwitchInAt(50, 1);
    expect(a.ballPose).toBe(b.ballPose);
    expect(a.ballVisible).toBe(b.ballVisible);
  });
});
