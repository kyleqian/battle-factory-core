import { describe, expect, it } from "vitest";
import {
  grantingStarFrameAtLocalAge,
  SYNTHESIS_BLEND_TIMING,
  SYNTHESIS_GRANTING_STAR_DURATION,
  SYNTHESIS_HEALING_START_AGE,
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
  });

  it("loops all eight seven-tick GrantingStars frames through duration 60", () => {
    expect([0, 6, 7, 55, 56, 60, 61].map(grantingStarFrameAtLocalAge))
      .toEqual([0, 0, 1, 7, 0, 0, null]);
    expect(SYNTHESIS_GRANTING_STAR_DURATION).toBe(60);
  });

  it("creates both stars eight ticks apart and mirrors only their x offsets", () => {
    const player = synthesisEffectAtAge(8, "player", { x: 72, y: 80 });
    const opponent = synthesisEffectAtAge(8, "opponent", { x: 176, y: 40 });
    expect(player.sprites.filter((sprite) => sprite.kind === "grantingStar"))
      .toHaveLength(2);
    expect(player.sprites[0]!.x - 72).toBe(-(opponent.sprites[0]!.x - 176));
    expect(player.sprites[0]!.y - 80).toBe(opponent.sprites[0]!.y - 40);
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
