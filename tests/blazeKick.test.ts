import { describe, expect, it } from "vitest";
import {
  BLAZE_KICK_FIRE_SPREAD_FIRST_AGE,
  BLAZE_KICK_FIRE_SPREAD_LAST_AGE,
  BLAZE_KICK_MOVE_BODY_LAST_AGE,
  blazeKickAnimationAtAge,
  blazeKickFireSpreadAtAge,
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
});
