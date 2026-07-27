import { describe, expect, it } from "vitest";
import {
  encoreAtAge,
  encoreBldyAtAge,
  encoreHandsAtAge,
  encoreSpotlightAtAge,
  encoreTargetY2AtAge,
} from "../../src/animation/encore.ts";

describe("Encore source reducer", () => {
  it("ports both rate-3 hardware darken and restore fades", () => {
    expect([0, 1, 4, 5, 37, 40, 41].map(encoreBldyAtAge))
      .toEqual([0, 1, 1, 2, 10, 10, 10]);
    expect([170, 171, 174, 175, 207, 208, 214].map(encoreBldyAtAge))
      .toEqual([10, 9, 9, 8, 0, 0, 0]);
  });

  it("runs all nine claps with source x2 and facing", () => {
    const center = { x: 72, y: 80 };
    expect(encoreHandsAtAge(41, center)).toEqual([]);
    expect(encoreHandsAtAge(42, center)).toEqual([
      { centerX: 70, centerY: 80, hFlip: true, x2: -10, remainingClaps: 9 },
      { centerX: 74, centerY: 80, hFlip: false, x2: 10, remainingClaps: 9 },
    ]);
    expect(encoreHandsAtAge(47, center)[0]).toMatchObject({ x2: 0 });
    expect(encoreHandsAtAge(53, center)[0])
      .toMatchObject({ x2: -12, remainingClaps: 8 });
    expect(encoreHandsAtAge(148, center)[0])
      .toMatchObject({ x2: -10, remainingClaps: 1 });
    expect(encoreHandsAtAge(149, center)).toEqual([]);
  });

  it("ports spotlight affine and three-part horizontal sweep", () => {
    const target = { x: 176, y: 40 };
    expect(encoreSpotlightAtAge(42, target)).toBeNull();
    expect(encoreSpotlightAtAge(43, target))
      .toMatchObject({
        centerX: 176, centerY: 32, x2: 0,
        pa: 4096, pb: 0, pc: 0, pd: 170,
      });
    expect(encoreSpotlightAtAge(63, target)?.pa).toBe(204);
    expect(encoreSpotlightAtAge(84, target)?.x2).toBe(9);
    expect(encoreSpotlightAtAge(105, target)?.x2).toBe(0);
    expect(encoreSpotlightAtAge(125, target)?.x2).toBe(-10);
    expect(encoreSpotlightAtAge(148, target)?.x2).toBe(0);
    expect(encoreSpotlightAtAge(149, target)?.pa).toBe(215);
    expect(encoreSpotlightAtAge(167, target)?.pa).toBe(4096);
    expect(encoreSpotlightAtAge(168, target)).toBeNull();
  });

  it("ports the side-oriented five-sway target task and PlaySE2 boundary", () => {
    expect(encoreTargetY2AtAge(59, "player")).toBe(0);
    expect(encoreTargetY2AtAge(60, "player")).toBe(-1);
    expect(encoreTargetY2AtAge(60, "opponent")).toBe(2);
    expect(encoreTargetY2AtAge(167, "player")).toBe(0);
    const player = encoreAtAge(
      60, "player", { x: 72, y: 80 }, { x: 176, y: 40 },
    );
    expect(player).toMatchObject({ playSe2: true, playSe2Pan: 63 });
    const opponent = encoreAtAge(
      60, "opponent", { x: 176, y: 40 }, { x: 72, y: 80 },
    );
    expect(opponent).toMatchObject({ playSe2: true, playSe2Pan: -63 });
  });
});
