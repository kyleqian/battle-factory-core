import { describe, expect, it } from "vitest";
import {
  CALM_MIND_CLEANUP_AGE,
  CALM_MIND_RING_START_AGES,
  calmMindAtAge,
} from "../../src/animation/calmMind.ts";

describe("CALM MIND source reducer", () => {
  it("blends every selected palette except the attacker to black and back", () => {
    expect(calmMindAtAge(2).paletteBlendY).toBe(0);
    expect(calmMindAtAge(3).paletteBlendY).toBe(0);
    expect(calmMindAtAge(19).paletteBlendY).toBe(16);
    expect(calmMindAtAge(83).paletteBlendY).toBe(16);
    expect(calmMindAtAge(84).paletteBlendY).toBe(16);
    expect(calmMindAtAge(100).paletteBlendY).toBe(0);
  });

  it("ports attacker-partner monbg and non-attacker hide/reveal cleanup", () => {
    expect(calmMindAtAge(0)).toMatchObject({
      attackerOnMonBg: false, nonAttackerInvisible: false,
    });
    expect(calmMindAtAge(1)).toMatchObject({
      attackerOnMonBg: true, nonAttackerInvisible: false,
    });
    expect(calmMindAtAge(20).nonAttackerInvisible).toBe(true);
    expect(calmMindAtAge(83).nonAttackerInvisible).toBe(true);
    expect(calmMindAtAge(84).nonAttackerInvisible).toBe(false);
    expect(calmMindAtAge(CALM_MIND_CLEANUP_AGE).attackerOnMonBg).toBe(false);
  });

  it("creates all three shrinking rings on the literal delay-14 schedule", () => {
    expect(CALM_MIND_RING_START_AGES).toEqual([20, 36, 52]);
    expect(calmMindAtAge(20).rings).toEqual([{
      spawnIndex: 0, localAge: 0, sourceScale: 496, oamScale: 132,
    }]);
    expect(calmMindAtAge(35).rings[0]).toMatchObject({
      localAge: 15, sourceScale: 256, oamScale: 256,
    });
    expect(calmMindAtAge(36).rings.map((ring) => ring.spawnIndex))
      .toEqual([0, 1]);
    expect(calmMindAtAge(52).rings.map((ring) => ring.spawnIndex))
      .toEqual([1, 2]);
  });

  it("uses the source 30-callback affine lifetime and destroys matrices", () => {
    expect(calmMindAtAge(50).rings[0]).toMatchObject({
      localAge: 30, sourceScale: 32, oamScale: 2048,
    });
    expect(calmMindAtAge(51).rings.map((ring) => ring.spawnIndex)).toEqual([1]);
    expect(calmMindAtAge(82).rings[0]).toMatchObject({
      spawnIndex: 2, localAge: 30, oamScale: 2048,
    });
    expect(calmMindAtAge(83).rings).toEqual([]);
  });
});
