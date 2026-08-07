import { describe, expect, it } from "vitest";
import {
  minimizeAtAge,
  minimizeScaleAtAge,
  minimizeY2FromScale,
  minimizeClonesAtAge,
  MINIMIZE_FIRST_TASK_AGE,
  MINIMIZE_LAST_TASK_AGE,
  MINIMIZE_BLEND_OFF_AGE,
} from "../../src/animation/minimize.ts";

describe("minimizeAtAge task lifecycle", () => {
  it("runs the task ages 1-150 and blends through 151", () => {
    expect(minimizeAtAge(0).visualTaskCount).toBe(0);
    expect(minimizeAtAge(1).visualTaskCount).toBe(1);
    expect(minimizeAtAge(MINIMIZE_LAST_TASK_AGE).visualTaskCount).toBe(1);
    expect(minimizeAtAge(MINIMIZE_LAST_TASK_AGE + 1).visualTaskCount).toBe(0);
    expect(minimizeAtAge(MINIMIZE_FIRST_TASK_AGE).blendActive).toBe(true);
    expect(minimizeAtAge(MINIMIZE_BLEND_OFF_AGE).blendActive).toBe(false);
  });

  it("scales 296..1536 in the shrink, pins 1536 in the hold, 1456..256 in grow-back", () => {
    expect(minimizeScaleAtAge(0)).toBe(0x100);
    expect(minimizeScaleAtAge(1)).toBe(296);
    expect(minimizeScaleAtAge(32)).toBe(1536);
    expect(minimizeScaleAtAge(33)).toBe(0x100);
    expect(minimizeScaleAtAge(34)).toBe(0x100);
    expect(minimizeScaleAtAge(35)).toBe(296);
    expect(minimizeScaleAtAge(66)).toBe(1536);
    expect(minimizeScaleAtAge(100)).toBe(1536);
    expect(minimizeScaleAtAge(101)).toBe(1536);
    expect(minimizeScaleAtAge(134)).toBe(1536);
    expect(minimizeScaleAtAge(135)).toBe(1456);
    expect(minimizeScaleAtAge(150)).toBe(0x100);
    expect(minimizeScaleAtAge(151)).toBe(0x100);
  });

  it("computes the SetBattlerSpriteYOffsetFromYScale y2 series from var=40", () => {
    expect(minimizeY2FromScale(256)).toBe(0);
    expect(minimizeY2FromScale(296)).toBe(3);
    expect(minimizeY2FromScale(336)).toBe(5);
    expect(minimizeY2FromScale(376)).toBe(6);
    expect(minimizeY2FromScale(416)).toBe(8);
    expect(minimizeY2FromScale(496)).toBe(10);
    expect(minimizeY2FromScale(816)).toBe(14);
    expect(minimizeY2FromScale(1536)).toBe(17);
    expect(minimizeY2FromScale(1456)).toBe(16);
  });
});

describe("minimizeClonesAtAge", () => {
  it("spawns three clones per cycle at ages 1/4/7, 35/38/41, 69/72/75", () => {
    for (const spawnAge of [1, 4, 7, 35, 38, 41, 69, 72, 75]) {
      expect(minimizeClonesAtAge(spawnAge).some((c) => c.spawnAge === spawnAge)).toBe(true);
    }
    expect(minimizeClonesAtAge(1).map((c) => c.index)).toEqual([0]);
    expect(minimizeClonesAtAge(4).map((c) => c.index)).toEqual([0, 1]);
    expect(minimizeClonesAtAge(7).map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it("freezes clone matrices at 256/376/496 and gives y2 0/6/10", () => {
    const at7 = minimizeClonesAtAge(7);
    expect(at7.map((c) => c.matrix)).toEqual([256, 376, 496]);
    expect(at7.map((c) => c.y2)).toEqual([0, 6, 10]);
  });

  it("lives exactly 16 frames: lifetime 16..1, gone at spawn+16", () => {
    const clone0 = minimizeClonesAtAge(1).find((c) => c.index === 0)!;
    expect(clone0.lifetime).toBe(16);
    expect(minimizeClonesAtAge(16).find((c) => c.index === 0)?.lifetime).toBe(1);
    expect(minimizeClonesAtAge(17).find((c) => c.index === 0)).toBeUndefined();
  });

  it("reports the live-count schedule 1,2,3 then 2 at +16, 1 at +19, 0 at +22", () => {
    expect(minimizeClonesAtAge(1).length).toBe(1);
    expect(minimizeClonesAtAge(4).length).toBe(2);
    expect(minimizeClonesAtAge(7).length).toBe(3);
    expect(minimizeClonesAtAge(17).length).toBe(2);
    expect(minimizeClonesAtAge(20).length).toBe(1);
    expect(minimizeClonesAtAge(23).length).toBe(0);
  });
});
