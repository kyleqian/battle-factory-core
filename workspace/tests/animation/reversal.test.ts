import { describe, expect, it } from "vitest";
import { reversalAtAge } from "../../src/animation/reversal.ts";
import {
  createSceneOnMovePresentation,
  sceneOnReversalView,
} from "../../src/animation/sceneOnPresentation.ts";

const shake = { kind: "resolved-power-shake", amplitude: 1 } as const;
const player = (age: number) =>
  reversalAtAge(age, "player", { x: 72, y: 98 }, { x: 176, y: 48 }, shake);

describe("MOVE_REVERSAL complete source-relative reducer", () => {
  it("ports the load, both palette lifecycles, cycle, and cleanup envelope", () => {
    expect(player(0).assetsLoaded).toEqual({
      blueOrb: true, handsAndFeet: false, impact: false,
    });
    expect(player(6).assetsLoaded).toEqual({
      blueOrb: true, handsAndFeet: true, impact: true,
    });
    expect(player(10).paletteBlend).toEqual({ color: "white", coefficient: 8 });
    expect(player(13).paletteBlend).toBeNull();
    expect(player(17).paletteBlend).toEqual({ color: "white", coefficient: 8 });
    expect(player(154).paletteBlend).toEqual({ color: "white", coefficient: 8 });
    expect(player(173)).toMatchObject({
      active: false,
      assetsLoaded: { blueOrb: false, handsAndFeet: false, impact: false },
      visualTaskCount: 0,
    });
  });

  it("creates exactly six source phases with 26-frame grow/shrink callbacks", () => {
    expect(player(70).orbs).toHaveLength(0);
    expect(player(71).orbs.map((orb) => orb.phase)).toEqual(
      [18, 60, 102, 144, 186, 228],
    );
    expect(player(71).orbs[0]).toMatchObject({
      x: 72, y: 98, radiusX: 2048, radiusY: 512,
    });
    expect(player(95).orbs).toHaveLength(6);
    expect(player(120).orbs).toHaveLength(6);
    expect(player(121).orbs).toHaveLength(0);
  });

  it("ports lunge, fist, animation-1 impact, and receipt-driven shake", () => {
    expect([143, 144, 149, 150, 151, 158, 159].map(
      (age) => player(age).attackerX2,
    )).toEqual([0, 4, 24, 24, 24, 0, 0]);
    expect(player(154).fist).toMatchObject({ x: 176, y: 48, remaining: 10 });
    expect(player(154).hitsplat).toEqual({ x: 176, y: 48, animation: 1 });
    expect([154, 155, 156, 157, 158, 159, 168, 169].map(
      (age) => player(age).targetX2,
    )).toEqual([0, 1, 1, 0, 0, 1, 1, 0]);
  });

  it("threads only an already-resolved shake receipt through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "REVERSAL",
      attacker: {
        species: "VIGOROTH",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 58 },
          animationCenter: { x: 72, y: 90 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "DELCATTY",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 16 },
          animationCenter: { x: 176, y: 48 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 104, playerMaxHp: 144,
        opponentHp: 134, opponentMaxHp: 134,
      },
      attackerPictureOffset: { x: 72, y: 98 },
      targetPictureOffset: { x: 176, y: 48 },
      resolvedShake: shake,
    });
    expect(sceneOnReversalView({ ...stage, age: 155 })).toMatchObject({
      age: 155,
      attacker: stage.config.attacker,
      target: stage.config.target,
      resolvedShake: shake,
      targetX2: 1,
    });
    expect(() => sceneOnReversalView({
      ...stage,
      config: { ...stage.config, move: "SMOKESCREEN" },
    } as never)).toThrow("expected REVERSAL presentation");
  });
});
