import { describe, expect, it } from "vitest";
import {
  DISABLE_ALPHA_FIRST_AGE,
  DISABLE_ALPHA_LAST_AGE,
  DISABLE_GROW_FIRST_AGE,
  DISABLE_GROW_LAST_AGE,
  DISABLE_MONBG_FIRST_AGE,
  DISABLE_MONBG_LAST_AGE,
  DISABLE_SPARKLE_FIRST_AGE,
  DISABLE_SPARKLE_LAST_AGE,
  disableAtAge,
  disableDisplayedTargetScaleAtAge,
  disableSparkleAtAge,
  disableSparkleTileOffsetAtAge,
} from "../../src/animation/disable.ts";
import {
  createSceneOnMovePresentation,
  sceneOnDisableView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_DISABLE source-relative reducer", () => {
  it("ports monbg/alpha lead-in, the shared sparkle program, and cleanup", () => {
    const center = { x: 72, y: 93 };
    expect(disableAtAge(0, center, "player")).toMatchObject({
      targetInMonBg: false, alpha: null, sparkle: null, targetScale: null,
      visualTaskCount: 0, soundTaskCount: 0, active: true,
    });
    expect(disableAtAge(DISABLE_MONBG_FIRST_AGE, center, "player").targetInMonBg).toBe(true);
    expect(disableAtAge(DISABLE_ALPHA_FIRST_AGE, center, "player").alpha).toEqual({ eva: 8, evb: 8 });
    expect(disableAtAge(DISABLE_SPARKLE_FIRST_AGE, center, "player").visualTaskCount).toBe(1);
    expect(disableAtAge(DISABLE_SPARKLE_LAST_AGE + 1, center, "player").sparkle).toBeNull();
    expect(disableAtAge(DISABLE_GROW_FIRST_AGE, center, "player")).toMatchObject({
      targetScale: { xScale: 0xd0, yScale: 0xd0, objBlend: true, grayscale: true, doubled: true },
      visualTaskCount: 1, soundTaskCount: 1,
    });
    expect(disableAtAge(DISABLE_GROW_LAST_AGE + 1, center, "player").targetScale).toBeNull();
    expect(disableDisplayedTargetScaleAtAge(DISABLE_GROW_LAST_AGE + 1))
      .toMatchObject({ grayscale: true, xScale: 0xd0 });
    expect(disableDisplayedTargetScaleAtAge(DISABLE_GROW_LAST_AGE + 2))
      .toMatchObject({ grayscale: false, xScale: 0xd0 });
    expect(disableDisplayedTargetScaleAtAge(DISABLE_GROW_LAST_AGE + 3)).toBeNull();
    expect(disableAtAge(DISABLE_ALPHA_LAST_AGE + 1, center, "player").alpha).toBeNull();
    expect(disableAtAge(DISABLE_MONBG_LAST_AGE + 2, center, "player")).toMatchObject({
      targetInMonBg: false, active: false,
    });
  });

  it("uses the exact 3-tick sparkle tile program and mirrors arg0 by side", () => {
    expect(disableSparkleTileOffsetAtAge(7)).toBe(0);
    expect(disableSparkleTileOffsetAtAge(8)).toBe(0);
    expect(disableSparkleTileOffsetAtAge(9)).toBe(16);
    expect(disableSparkleTileOffsetAtAge(12)).toBe(32);
    expect(disableSparkleTileOffsetAtAge(15)).toBe(48);
    expect(disableSparkleTileOffsetAtAge(18)).toBe(64);
    expect(disableSparkleAtAge(7, { x: 72, y: 93 }, "player"))
      .toEqual({ x: 96, y: 85, tileOffset: 0, subpriority: 17 });
    expect(disableSparkleAtAge(7, { x: 176, y: 47 }, "opponent"))
      .toEqual({ x: 152, y: 31, tileOffset: 0, subpriority: 27 });
  });

  it("keeps battle inputs immutable through the typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "DISABLE",
      attacker: { species: "DROWZEE", geometry: { side: "opponent", spriteCorner: { x: 144, y: 15 }, animationCenter: { x: 176, y: 47 }, battlePositionCenter: { x: 176, y: 40 } } },
      target: { species: "ONIX", geometry: { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } },
      fieldProfile: { playerHp: 117, playerMaxHp: 117, opponentHp: 125, opponentMaxHp: 142 },
    });
    expect(sceneOnDisableView({ ...stage, age: DISABLE_GROW_FIRST_AGE })).toMatchObject({
      targetScale: { xScale: 0xd0, objBlend: true, grayscale: true },
      sparkle: null,
    });
    expect(stage.config).not.toHaveProperty("disableTurns");
  });
});
