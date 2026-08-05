import { describe, expect, it } from "vitest";
import {
  AGILITY_FIRST_CLEAR_AGE,
  AGILITY_FIRST_TRAVEL_AGE,
  AGILITY_FRAME_COUNT,
  AGILITY_LAST_TRAVEL_AGE,
  agilityAfterimagesAtAge,
  agilityAnimationAtAge,
  agilityAttackerOffset,
} from "../../src/animation/agility.ts";

describe("MOVE_AGILITY source-relative reducer", () => {
  it("spans 87 dense frames through the first inactive/clear cleanup", () => {
    expect(AGILITY_FRAME_COUNT).toBe(87);
    const first = agilityAnimationAtAge(0, "player");
    expect(first.monbgLoaded).toBe(false);
    const last = agilityAnimationAtAge(AGILITY_FRAME_COUNT - 1, "player");
    expect(last.afterimages).toEqual([]);
    expect(last.monbgLoaded).toBe(false);
  });

  it("tracks the monbg/alpha lifecycle to the clearmonbg boundary", () => {
    expect(agilityAnimationAtAge(0, "player").monbgLoaded).toBe(false);
    expect(agilityAnimationAtAge(1, "player").monbgLoaded).toBe(true);
    expect(agilityAnimationAtAge(AGILITY_FIRST_CLEAR_AGE, "player").monbgLoaded).toBe(true);
    expect(agilityAnimationAtAge(AGILITY_FIRST_CLEAR_AGE + 3, "player").monbgLoaded).toBe(false);
    expect(agilityAnimationAtAge(3, "player").alpha).toBeNull();
    expect(agilityAnimationAtAge(4, "player").alpha).toEqual({ eva: 12, evb: 8 });
    expect(agilityAnimationAtAge(73, "player").alpha).toEqual({ eva: 12, evb: 8 });
    expect(agilityAnimationAtAge(74, "player").alpha).toBeNull();
  });

  it("pins the five SE_M_DOUBLE_TEAM restarts at script offsets 43/49/55/61/67", () => {
    const restarts = [4, 18, 32, 46, 60];
    for (const age of restarts) {
      expect(agilityAnimationAtAge(age, "player").soundRestart).toBe(true);
    }
    for (const age of [0, 5, 17, 33, 61]) {
      expect(agilityAnimationAtAge(age, "player").soundRestart).toBe(false);
    }
  });

  it("renders the four-loop elliptical offset (width 24, height 6, speed 4)", () => {
    expect(agilityAttackerOffset(0, "player")).toEqual({ x2: 0, y2: 0 });
    // Task created at age 3 (software θ=0 origin); first visible step θ=16 at age 4.
    expect(agilityAttackerOffset(AGILITY_FIRST_TRAVEL_AGE, "player")).toEqual({ x2: 0, y2: 0 });
    expect(agilityAttackerOffset(4, "player")).toEqual({ x2: 9, y2: 1 });
    expect(agilityAttackerOffset(5, "player")).toEqual({ x2: 16, y2: 2 });
    expect(agilityAttackerOffset(7, "player")).toEqual({ x2: 24, y2: 6 });
    expect(agilityAttackerOffset(11, "player")).toEqual({ x2: 0, y2: 12 });
    // Loop-2 wrap renders the origin again at θ=256 mod 256 (age 19).
    expect(agilityAttackerOffset(19, "player")).toEqual({ x2: 0, y2: 0 });
    // The destroy-reset terminal: age 65 is the last θ=224 step, age 66 reads origin.
    expect(agilityAttackerOffset(AGILITY_LAST_TRAVEL_AGE, "player")).toEqual({ x2: -17, y2: 2 });
    expect(agilityAttackerOffset(AGILITY_LAST_TRAVEL_AGE + 1, "player")).toEqual({ x2: 0, y2: 0 });
    // Opponent side negates the width only.
    expect(agilityAttackerOffset(5, "opponent")).toEqual({ x2: -17, y2: 2 });
    expect(agilityAttackerOffset(7, "opponent")).toEqual({ x2: -24, y2: 6 });
  });

  it("creates ten TraceMonBlended clones alternating slots 3/4", () => {
    // Clone creation software ages 4,9,...,49; each drawn from C+1 through C+7.
    expect(agilityAfterimagesAtAge(4, "player")).toEqual([]);
    expect(agilityAfterimagesAtAge(5, "player")).toEqual([
      { slot: 3, x2: 9, y2: 1 },
    ]);
    expect(agilityAfterimagesAtAge(10, "player")).toEqual([
      { slot: 3, x2: 9, y2: 1 },
      { slot: 4, x2: 16, y2: 11 },
    ]);
    expect(agilityAfterimagesAtAge(21, "player")).toEqual([
      { slot: 3, x2: -23, y2: 9 },
      { slot: 4, x2: 0, y2: 0 },
    ]);
    expect(agilityAfterimagesAtAge(49, "player")).toEqual([
      { slot: 3, x2: -10, y2: 12 },
    ]);
    expect(agilityAfterimagesAtAge(50, "player")).toEqual([
      { slot: 3, x2: -10, y2: 12 },
      { slot: 4, x2: -17, y2: 2 },
    ]);
    expect(agilityAfterimagesAtAge(56, "player")).toEqual([
      { slot: 4, x2: -17, y2: 2 },
    ]);
    expect(agilityAfterimagesAtAge(57, "player")).toEqual([]);
  });

  it("pins the opponent-side clone mirroring", () => {
    expect(agilityAfterimagesAtAge(5, "opponent")).toEqual([
      { slot: 3, x2: -10, y2: 1 },
    ]);
    expect(agilityAfterimagesAtAge(21, "opponent")).toEqual([
      { slot: 3, x2: 22, y2: 9 },
      { slot: 4, x2: 0, y2: 0 },
    ]);
  });
});
