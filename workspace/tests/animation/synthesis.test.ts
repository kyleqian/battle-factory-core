import { describe, expect, it } from "vitest";
import {
  grantingStarFrameAtLocalAge,
  SYNTHESIS_BLEND_TIMING,
  SYNTHESIS_GRANTING_STAR_DURATION,
  SYNTHESIS_HEALING_START_AGE,
  synthesisAttackerObjYAtAge,
  synthesisBlendTaskActiveAtAge,
  synthesisEffectAtAge,
} from "../../src/animation/synthesis.ts";
import { blendColorCycleLegDuration } from "../../src/animation/blendColorCycle.ts";

describe("MOVE_SYNTHESIS source-relative body", () => {
  it("pins the literal delay-2 two-leg 0<->16 attacker blend", () => {
    expect(SYNTHESIS_BLEND_TIMING.legs).toEqual([
      { startY: 0, targetY: 16 },
      { startY: 16, targetY: 0 },
    ]);
    expect(blendColorCycleLegDuration(
      SYNTHESIS_BLEND_TIMING.legs[0]!, 2, false,
    )).toBe(21);
    expect([0, 3, 4, 31, 32, 41, 42, 69, 70].map(
      synthesisAttackerObjYAtAge,
    )).toEqual([0, 0, 2, 14, 16, 16, 14, 2, 0]);
    expect([74, 75].map(synthesisBlendTaskActiveAtAge))
      .toEqual([true, false]);
  });

  it("loops all eight seven-tick GrantingStars frames through duration 60", () => {
    expect([0, 5, 6, 54, 55, 60, 61].map(grantingStarFrameAtLocalAge))
      .toEqual([0, 0, 1, 7, 0, 0, null]);
    expect(SYNTHESIS_GRANTING_STAR_DURATION).toBe(60);
  });

  it("creates both stars across the literal delay-8 interpreter boundary and mirrors only x", () => {
    const player = synthesisEffectAtAge(10, "player", { x: 72, y: 101 });
    const opponent = synthesisEffectAtAge(10, "opponent", { x: 176, y: 43 });
    expect(player.sprites.filter((sprite) => sprite.kind === "grantingStar"))
      .toHaveLength(2);
    expect(player.sprites[0]!.x - 72).toBe(-(opponent.sprites[0]!.x - 176));
    expect(player.sprites[0]!.y - 101).toBe(opponent.sprites[0]!.y - 43);
  });

  it("reuses the shared HealingEffect only after the unload/delay/load boundary", () => {
    expect(synthesisEffectAtAge(
      SYNTHESIS_HEALING_START_AGE - 1, "player", { x: 72, y: 80 },
    ).sprites.some((sprite) => sprite.kind === "star")).toBe(false);
    expect(synthesisEffectAtAge(
      SYNTHESIS_HEALING_START_AGE, "player", { x: 72, y: 80 },
    ).sprites.filter((sprite) => sprite.kind === "star")).toHaveLength(1);
  });
});
