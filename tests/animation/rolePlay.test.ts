import { describe, expect, it } from "vitest";
import { rolePlayAtAge } from "../../src/animation/rolePlay.ts";

describe("rolePlayAtAge", () => {
  it("ports the pointer, palette, monbg, and cleanup schedule", () => {
    expect(rolePlayAtAge(0, "player", { x: 72, y: 80 })).toMatchObject({ active: true, scriptOffset: 0, attackerOnMonBg: false });
    expect(rolePlayAtAge(7, "player", { x: 72, y: 80 })).toMatchObject({ scriptOffset: 36, bgBlackCoefficient: 2, targetWhiteCoefficient: 0 });
    expect(rolePlayAtAge(8, "player", { x: 72, y: 80 })).toMatchObject({ bgBlackCoefficient: 2, targetWhiteCoefficient: 1 });
    expect(rolePlayAtAge(53, "player", { x: 72, y: 80 })).toMatchObject({ scriptOffset: 36, targetWhiteCoefficient: 16, sound: null });
    expect(rolePlayAtAge(54, "player", { x: 72, y: 80 })).toMatchObject({ scriptOffset: 53, sound: "SE_M_TRI_ATTACK" });
    expect(rolePlayAtAge(94, "player", { x: 72, y: 80 })).toMatchObject({ scriptOffset: 75, attackerOnMonBg: false, blend: null });
    expect(rolePlayAtAge(145, "player", { x: 72, y: 80 })).toMatchObject({ active: true, scriptOffset: null, targetWhiteCoefficient: 0, visualTaskCount: 0 });
    expect(rolePlayAtAge(146, "player", { x: 72, y: 80 })).toMatchObject({ active: false, scriptOffset: null });
  });

  it("ports the bilateral additional-ONIX lifecycle and nine affine callbacks", () => {
    expect(rolePlayAtAge(54, "player", { x: 72, y: 80 }).silhouette).toMatchObject({ art: "back", x: 52, y: 80, affineMode: 1, matrix: { a: 256, d: 256 } });
    expect(rolePlayAtAge(54, "opponent", { x: 176, y: 42 }).silhouette).toMatchObject({ art: "front", x: 196, y: 42 });
    expect(rolePlayAtAge(83, "player", { x: 72, y: 80 })).toMatchObject({ blend: { eva: 9, evb: 7 }, sound: null });
    expect(rolePlayAtAge(84, "player", { x: 72, y: 80 })).toMatchObject({ blend: { eva: 10, evb: 6 }, sound: "SE_M_DETECT" });
    expect(rolePlayAtAge(84, "player", { x: 72, y: 80 }).silhouette).toMatchObject({ affineMode: 3, matrix: { a: 240, d: 384 } });
    expect(rolePlayAtAge(91, "player", { x: 72, y: 80 }).silhouette).toMatchObject({ matrix: { a: 128, d: 1280 } });
    expect(rolePlayAtAge(92, "player", { x: 72, y: 80 })).toMatchObject({ silhouette: null, silhouetteResourceLoaded: false, visualTaskCount: 1 });
  });

  it("pins both three/four-callback palette ramps", () => {
    const white = Array.from({ length: 147 }, (_, age) => rolePlayAtAge(age, "player", { x: 72, y: 80 }).targetWhiteCoefficient);
    expect(white.slice(8, 53).filter((value, index, all) => index === 0 || value !== all[index - 1])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(white.slice(53, 100).every((value) => value === 16)).toBe(true);
    expect(rolePlayAtAge(23, "player", { x: 72, y: 80 }).bgBlackCoefficient).toBe(10);
    expect(rolePlayAtAge(108, "player", { x: 72, y: 80 }).bgBlackCoefficient).toBe(10);
    expect(rolePlayAtAge(109, "player", { x: 72, y: 80 }).bgBlackCoefficient).toBe(8);
    expect(rolePlayAtAge(125, "player", { x: 72, y: 80 }).bgBlackCoefficient).toBe(0);
  });
});
