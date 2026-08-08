import { describe, expect, it } from "vitest";
import {
  DETECT_SPARKLE_DISPLAY_FIRST_AGE,
  DETECT_SPARKLE_DISPLAY_LAST_AGE,
  detectAtAge,
  detectAttackerPaletteYAtAge,
  detectBgBlendYAtAge,
  detectSparkleAtAge,
  detectVisualTaskCountAtAge,
} from "../../src/animation/detect.ts";

describe("detectBgBlendYAtAge (displayed F_PAL_BG toward-black)", () => {
  it("ramps 0,2,4,6,8,9 up with 4-frame holds and holds 9 through the sparkle", () => {
    expect(detectBgBlendYAtAge(0)).toBe(0);
    expect(detectBgBlendYAtAge(7)).toBe(0);
    expect(detectBgBlendYAtAge(8)).toBe(2);
    expect(detectBgBlendYAtAge(11)).toBe(2);
    expect(detectBgBlendYAtAge(12)).toBe(4);
    expect(detectBgBlendYAtAge(20)).toBe(8);
    expect(detectBgBlendYAtAge(24)).toBe(9);
    expect(detectBgBlendYAtAge(50)).toBe(9);
    expect(detectBgBlendYAtAge(83)).toBe(9);
  });
  it("ramps 7,5,3,1,0 down and returns to 0", () => {
    expect(detectBgBlendYAtAge(84)).toBe(7);
    expect(detectBgBlendYAtAge(88)).toBe(5);
    expect(detectBgBlendYAtAge(92)).toBe(3);
    expect(detectBgBlendYAtAge(96)).toBe(1);
    expect(detectBgBlendYAtAge(100)).toBe(0);
    expect(detectBgBlendYAtAge(109)).toBe(0);
  });
});

describe("detectAttackerPaletteYAtAge (displayed F_PAL_ATTACKER toward-white)", () => {
  it("ramps 0,1,2..9 up (2-frame holds) and holds 9 through the sparkle", () => {
    expect(detectAttackerPaletteYAtAge(0)).toBe(0);
    expect(detectAttackerPaletteYAtAge(33)).toBe(0);
    expect(detectAttackerPaletteYAtAge(34)).toBe(1);
    expect(detectAttackerPaletteYAtAge(36)).toBe(2);
    expect(detectAttackerPaletteYAtAge(40)).toBe(4);
    expect(detectAttackerPaletteYAtAge(49)).toBe(8);
    expect(detectAttackerPaletteYAtAge(50)).toBe(9);
    expect(detectAttackerPaletteYAtAge(60)).toBe(9);
    expect(detectAttackerPaletteYAtAge(84)).toBe(9);
  });
  it("ramps 8..1,0 down", () => {
    expect(detectAttackerPaletteYAtAge(85)).toBe(8);
    expect(detectAttackerPaletteYAtAge(88)).toBe(7);
    expect(detectAttackerPaletteYAtAge(94)).toBe(5);
    expect(detectAttackerPaletteYAtAge(100)).toBe(3);
    expect(detectAttackerPaletteYAtAge(106)).toBe(1);
    expect(detectAttackerPaletteYAtAge(109)).toBe(0);
  });
});

describe("detectSparkleAtAge", () => {
  it("is displayed exactly at ages 52..67 (software spawn +1 / destroy +1)", () => {
    const off = { x: 72, y: 92 };
    expect(detectSparkleAtAge(DETECT_SPARKLE_DISPLAY_FIRST_AGE - 1, off, "player")).toBeNull();
    expect(detectSparkleAtAge(DETECT_SPARKLE_DISPLAY_FIRST_AGE, off, "player")).not.toBeNull();
    expect(detectSparkleAtAge(DETECT_SPARKLE_DISPLAY_LAST_AGE, off, "player")).not.toBeNull();
    expect(detectSparkleAtAge(DETECT_SPARKLE_DISPLAY_LAST_AGE + 1, off, "player")).toBeNull();
  });
  it("sits at attacker picture + (+20,-20) on the player side and (-20,-20) on the opponent side", () => {
    const sparkle = detectSparkleAtAge(60, { x: 72, y: 92 }, "player");
    expect(sparkle).toEqual({ x: 92, y: 72, tileOffset: 48 });
    const opponent = detectSparkleAtAge(60, { x: 176, y: 42 }, "opponent");
    expect(opponent).toEqual({ x: 156, y: 22, tileOffset: 48 });
  });
  it("runs the 3-tick sAnim_SpinningSparkle frame program (0,16,32,48,64)", () => {
    const off = { x: 72, y: 92 };
    expect(detectSparkleAtAge(52, off, "player")?.tileOffset).toBe(0);
    expect(detectSparkleAtAge(53, off, "player")?.tileOffset).toBe(0);
    expect(detectSparkleAtAge(54, off, "player")?.tileOffset).toBe(16);
    expect(detectSparkleAtAge(57, off, "player")?.tileOffset).toBe(32);
    expect(detectSparkleAtAge(60, off, "player")?.tileOffset).toBe(48);
    expect(detectSparkleAtAge(63, off, "player")?.tileOffset).toBe(64);
    expect(detectSparkleAtAge(67, off, "player")?.tileOffset).toBe(64);
  });
});

describe("detectVisualTaskCountAtAge (software gAnimVisualTaskCount)", () => {
  it("counts the up blend sprite, up task, sparkle, then the down pair", () => {
    expect(detectVisualTaskCountAtAge(3)).toBe(0);
    expect(detectVisualTaskCountAtAge(4)).toBe(1);
    expect(detectVisualTaskCountAtAge(30)).toBe(0);
    expect(detectVisualTaskCountAtAge(31)).toBe(1);
    expect(detectVisualTaskCountAtAge(50)).toBe(0);
    expect(detectVisualTaskCountAtAge(51)).toBe(1);
    expect(detectVisualTaskCountAtAge(66)).toBe(1);
    expect(detectVisualTaskCountAtAge(67)).toBe(0);
    expect(detectVisualTaskCountAtAge(80)).toBe(2);
    expect(detectVisualTaskCountAtAge(106)).toBe(1);
    expect(detectVisualTaskCountAtAge(108)).toBe(0);
  });
});

describe("detectAtAge", () => {
  it("assembles the full state and marks the window active", () => {
    const state = detectAtAge(60, { x: 72, y: 92 }, "player");
    expect(state).toMatchObject({
      age: 60,
      bgBlendY: 9,
      attackerPaletteY: 9,
      visualTaskCount: 1,
      active: true,
    });
    expect(state.sparkle).not.toBeNull();
    expect(detectAtAge(109, { x: 72, y: 92 }, "player").active).toBe(false);
  });
});
