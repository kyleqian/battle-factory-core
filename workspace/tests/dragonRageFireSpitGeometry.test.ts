import { describe, expect, it } from "vitest";
import { DRAGON_RAGE_FIRE_SPIT_GEOMETRY, dragonRageFireSpitGeometryFor } from "../src/animation/dragonRage.ts";

describe("Dragon Rage fire-spit aim (#145 D1)", () => {
  const charmeleonPic = { x: 72, y: 97 };
  it("reproduces the ONIX literals for both sides", () => {
    const player = dragonRageFireSpitGeometryFor("player", charmeleonPic, { x: 176, y: 42 });
    expect(player).toEqual(DRAGON_RAGE_FIRE_SPIT_GEOMETRY.player);
  });
  it("derives the delta from the target pic offset (player attacker)", () => {
    const dy = (y: number) => dragonRageFireSpitGeometryFor("player", charmeleonPic, { x: 176, y }).deltaYQ8;
    expect(dy(45)).toBe(-1459);
    expect(dy(35)).toBe(-1715);
    expect(dy(49)).toBe(-1357);
  });
});
