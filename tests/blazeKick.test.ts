import { describe, expect, it } from "vitest";
import {
  BLAZE_KICK_FIRE_SPREAD_FIRST_AGE,
  BLAZE_KICK_FIRE_SPREAD_LAST_AGE,
  BLAZE_KICK_MOVE_BODY_LAST_AGE,
  blazeKickAnimationAtAge,
  blazeKickFireSpreadAtAge,
  blazeKickPaletteAtAge,
  blazeKickSpinningFootMatrixAtAge,
  blazeKickSpritesAtAge,
} from "../src/engine/blazeKick.ts";

describe("source-relative Blaze Kick presentation checkpoint", () => {
  const target = { x: 176, y: 51 };

  it("pins the complete seven-sprite FireSpreadEffect translation program", () => {
    expect(BLAZE_KICK_FIRE_SPREAD_FIRST_AGE).toBe(35);
    expect(BLAZE_KICK_FIRE_SPREAD_LAST_AGE).toBe(75);
    expect(blazeKickFireSpreadAtAge(34, target)).toEqual([]);
    expect(blazeKickFireSpreadAtAge(35, target)).toEqual([
      { index: 0, centerX: 176, centerY: 61, sheetFrame: 1 },
      { index: 1, centerX: 175, centerY: 61, sheetFrame: 1 },
      { index: 2, centerX: 176, centerY: 60, sheetFrame: 1 },
      { index: 3, centerX: 175, centerY: 60, sheetFrame: 1 },
      { index: 4, centerX: 176, centerY: 61, sheetFrame: 1 },
      { index: 5, centerX: 175, centerY: 60, sheetFrame: 1 },
      { index: 6, centerX: 176, centerY: 60, sheetFrame: 1 },
    ]);
    expect(blazeKickFireSpreadAtAge(75, target)).toEqual([
      { index: 0, centerX: 206, centerY: 88, sheetFrame: 2 },
      { index: 1, centerX: 146, centerY: 98, sheetFrame: 2 },
      { index: 2, centerX: 206, centerY: 36, sheetFrame: 2 },
      { index: 3, centerX: 146, centerY: 43, sheetFrame: 2 },
      { index: 4, centerX: 201, centerY: 68, sheetFrame: 2 },
      { index: 5, centerX: 141, centerY: 56, sheetFrame: 2 },
      { index: 6, centerX: 193, centerY: 41, sheetFrame: 2 },
    ]);
    expect(blazeKickFireSpreadAtAge(76, target)).toEqual([]);
  });

  it("pins the shared monbg, alpha, ShakeMon2, and hitsplat epochs", () => {
    expect(blazeKickAnimationAtAge(0, target).targetOnMonBg).toBe(true);
    expect(blazeKickAnimationAtAge(3, target).alpha).toEqual({ eva: 12, evb: 8 });
    expect(blazeKickAnimationAtAge(35, target).targetX2).toBe(-3);
    expect(blazeKickAnimationAtAge(37, target).targetX2).toBe(3);
    expect(blazeKickAnimationAtAge(43, target).hitsplatVisible).toBe(true);
    expect(blazeKickAnimationAtAge(44, target).hitsplatVisible).toBe(false);
    expect(blazeKickAnimationAtAge(60, target).targetX2).toBe(-3);
    expect(blazeKickAnimationAtAge(61, target).targetX2).toBe(0);
    expect(blazeKickAnimationAtAge(BLAZE_KICK_MOVE_BODY_LAST_AGE, target))
      .toMatchObject({ targetOnMonBg: false, alpha: null, targetX2: 0 });
  });

  it("is side-independent and only consumes the target center", () => {
    expect(blazeKickFireSpreadAtAge(75, { x: 72, y: 97 })[0]).toEqual({
      index: 0,
      centerX: 102,
      centerY: 134,
      sheetFrame: 2,
    });
  });

  it("derives the double-affine spinning-foot OAM matrix and palette epochs", () => {
    expect(blazeKickSpinningFootMatrixAtAge(2)).toBeNull();
    expect(blazeKickSpinningFootMatrixAtAge(3)).toEqual({
      pa: 232,
      pb: -124,
      pc: 124,
      pd: 232,
    });
    expect(blazeKickSpinningFootMatrixAtAge(33)).toEqual({
      pa: -7224,
      pb: -3861,
      pc: 3861,
      pd: -7224,
    });
    expect(blazeKickSpinningFootMatrixAtAge(34)).toEqual({
      pa: 256,
      pb: 0,
      pc: 0,
      pd: 256,
    });
    expect(blazeKickSpinningFootMatrixAtAge(56)).toBeNull();

    expect(blazeKickPaletteAtAge(6).targetTint).toBeNull();
    expect(blazeKickPaletteAtAge(7).targetTint).toEqual({
      color: "white",
      coeff: 1,
    });
    expect(blazeKickPaletteAtAge(25).targetTint).toEqual({
      color: "white",
      coeff: 7,
    });
    expect(blazeKickPaletteAtAge(35)).toEqual({
      targetTint: { color: "black", coeff: 8 },
      attackerBlackCoeff: 8,
      backgroundBlackCoeff: 8,
    });
    expect(blazeKickPaletteAtAge(36)).toEqual({
      targetTint: null,
      attackerBlackCoeff: 8,
      backgroundBlackCoeff: 8,
    });
    expect(blazeKickPaletteAtAge(38)).toEqual({
      targetTint: null,
      attackerBlackCoeff: 0,
      backgroundBlackCoeff: 0,
    });
  });

  it("preserves the source allocation and full component painter order", () => {
    const geometry = {
      targetCenter: target,
      targetSubpriority: 40,
      attackerSide: "player",
      spriteSlots: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14],
      spriteOrderSeed: [3, 10, 9, 7, 5, 4, 14, 13, 12, 11],
    } as const;
    expect(blazeKickSpritesAtAge(3, geometry)).toMatchObject([
      { kind: "foot", slot: 3 },
    ]);
    expect(blazeKickSpritesAtAge(35, geometry).map((sprite) => sprite.slot))
      .toEqual([11, 13, 14, 10, 12, 7, 9, 4, 3]);
    expect(blazeKickSpritesAtAge(36, geometry).map((sprite) => sprite.slot))
      .toEqual([10, 11, 13, 14, 12, 7, 9, 4, 3]);
    expect(blazeKickSpritesAtAge(43, geometry).map((sprite) => sprite.slot))
      .toEqual([10, 14, 11, 13, 12, 7, 9, 4, 3]);
    expect(blazeKickSpritesAtAge(44, geometry).map((sprite) => sprite.slot))
      .toEqual([10, 14, 11, 13, 12, 7, 9, 3]);
    expect(blazeKickSpritesAtAge(56, geometry).map((sprite) => sprite.slot))
      .toEqual([10, 14, 11, 13, 12, 7, 9]);
    expect(blazeKickSpritesAtAge(76, geometry)).toEqual([]);
  });
});
