import { describe, expect, it } from "vitest";
import { doubleSlapAtAge } from "../../src/animation/doubleSlap.ts";

describe("MOVE_DOUBLE_SLAP source-relative reducer", () => {
  const player = { attackerSide: "player" as const, targetCenter: { x: 176, y: 42 } };
  const opponent = { attackerSide: "opponent" as const, targetCenter: { x: 72, y: 88 } };
  it("selects both choosetwoturnanim routes without owning hit count", () => {
    expect(doubleSlapAtAge(7, 0, player)).toMatchObject({ branch: "left", hitsplat: { x: 168, y: 42 }, targetX2: 0 });
    expect(doubleSlapAtAge(7, 1, player)).toMatchObject({ branch: "right", hitsplat: { x: 184, y: 42 } });
    expect(doubleSlapAtAge(7, 2, opponent)).toMatchObject({ branch: "left", hitsplat: { x: 80, y: 88 } });
    expect(doubleSlapAtAge(7, 3, opponent)).toMatchObject({ branch: "right", hitsplat: { x: 64, y: 88 } });
  });
  it("ports resource, monbg, alpha, ShakeMon and cleanup ages", () => {
    expect(doubleSlapAtAge(1, 0, player).impactLoaded).toBe(true);
    expect(doubleSlapAtAge(4, 0, player).targetOnMonBg).toBe(true);
    expect(doubleSlapAtAge(17, 0, player)).toMatchObject({ hitsplat: null, shakeTaskActive: false });
    expect(doubleSlapAtAge(29, 0, player)).toMatchObject({ targetOnMonBg: false, alpha: null });
    expect(doubleSlapAtAge(33, 0, player)).toMatchObject({ active: false, impactLoaded: false });
  });
});
