import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  sceneOnRazorWindView,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  razorWindAtAge,
  type RazorWindAnimationProfile,
} from "../../src/animation/razorWind.ts";

const profile: RazorWindAnimationProfile = {
  tornadoSpriteSlots: [3, 4, 5],
  tornadoMatrixIds: [0, 3, 4],
  crescentSpriteSlots: [7, 8, 9],
  crescentMatrixIds: [16, 8, 0],
  spriteOrderSeed: [3, 4, 5, 7, 8, 9],
};

const geometry = {
  attackerPositionCenter: { x: 72, y: 80 },
  attackerPictureCenter: { x: 72, y: 98 },
  targetPictureCenter: { x: 176, y: 42 },
};

describe("MOVE_RAZOR_WIND source-relative reducer", () => {
  it("reproduces setup tornado creation, circle phase, affine scale, and teardown", () => {
    expect(razorWindAtAge(3, "setup", "player", geometry, profile).sprites).toEqual([]);
    expect(razorWindAtAge(4, "setup", "player", geometry, profile).sprites).toEqual([
      expect.objectContaining({ slot: 3, matrixId: 0, x: 104, y: 96, x2: 2, y2: 15, matrix: [3276, 0, 0, 256] }),
      expect.objectContaining({ slot: 4, matrixId: 3, x2: 12, y2: -11 }),
      expect.objectContaining({ slot: 5, matrixId: 4, x2: -15, y2: -6 }),
    ]);
    expect(razorWindAtAge(43, "setup", "player", geometry, profile).sprites).toHaveLength(3);
    expect(razorWindAtAge(44, "setup", "player", geometry, profile).sprites).toEqual([]);
    expect(razorWindAtAge(4, "setup", "opponent", {
      ...geometry,
      attackerPositionCenter: { x: 176, y: 40 },
    }, profile).sprites[0]).toMatchObject({ x: 144, y: 40, x2: 2, y2: 15 });
  });

  it("reproduces the three source crescent paths, cell flips, and destruction rows", () => {
    const first = razorWindAtAge(10, "unleash", "player", geometry, profile).sprites[0];
    expect(first).toMatchObject({ x: 86, y: 106, x2: 4, y2: -2, frame: 2, hFlip: false, vFlip: true });
    const second = razorWindAtAge(14, "unleash", "player", geometry, profile).sprites[1];
    expect(second).toMatchObject({ x: 86, y: 90, x2: 4, y2: -1, frame: 1, hFlip: true, vFlip: false });
    const third = razorWindAtAge(18, "unleash", "player", geometry, profile).sprites[2];
    expect(third).toMatchObject({ x: 86, y: 110, x2: 3, y2: -3, frame: 0 });
    expect(razorWindAtAge(33, "unleash", "player", geometry, profile).sprites[0]).toMatchObject({
      callback: "DestroyAnimSprite", x2: 89, y2: -64,
    });
    expect(razorWindAtAge(34, "unleash", "player", geometry, profile).sprites.some((sprite) => sprite.index === 0)).toBe(false);
    const opponent = razorWindAtAge(10, "unleash", "opponent", {
      ...geometry,
      attackerPositionCenter: { x: 176, y: 40 },
      attackerPictureCenter: { x: 176, y: 48 },
      targetPictureCenter: { x: 72, y: 88 },
    }, profile).sprites[0];
    expect(opponent).toMatchObject({ x: 162, y: 40, x2: -4, y2: 2 });
  });

  it("keeps monbg/alpha cleanup and ShakeMon2 source-relative", () => {
    const at7 = razorWindAtAge(7, "unleash", "player", geometry, profile);
    const at10 = razorWindAtAge(10, "unleash", "player", geometry, profile);
    expect(at7.registers).toEqual({ monbg: true, alpha: null });
    expect(at10.registers).toEqual({ monbg: true, alpha: [12, 8] });
    expect(razorWindAtAge(55, "unleash", "player", geometry, profile).registers.alpha).toEqual([12, 8]);
    expect(razorWindAtAge(56, "unleash", "player", geometry, profile).registers.alpha).toBeNull();
    expect(razorWindAtAge(37, "unleash", "player", geometry, profile).targetOffset).toEqual({ x2: 2, y2: 0 });
    expect(razorWindAtAge(38, "unleash", "player", geometry, profile).targetOffset).toEqual({ x2: -2, y2: 0 });
    expect(razorWindAtAge(59, "unleash", "player", geometry, profile).cleanup).toMatchObject({ clearmonbg: true, blendoff: true });
  });

  it("uses live geometry, slots, matrices, and order through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "RAZOR_WIND",
      attacker: {
        species: "WINGULL",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 62 },
          animationCenter: { x: 72, y: 94 }, battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 110, opponentMaxHp: 110 },
      attackerPictureCenter: { x: 72, y: 94 },
      targetPictureCenter: { x: 176, y: 42 },
      animationProfile: profile,
    });
    const setup = sceneOnRazorWindView({ ...stage, age: 4 });
    const unleash = sceneOnRazorWindView({ ...stage, age: 56 });
    expect(setup).toMatchObject({ body: "setup", sprites: expect.any(Array), attacker: { species: "WINGULL" } });
    expect(unleash).toMatchObject({ body: "unleash", age: 10, registers: { monbg: true }, target: { species: "ONIX" } });
    const altered = razorWindAtAge(10, "setup", "player", geometry, {
      ...profile,
      tornadoSpriteSlots: [12, 13, 14],
      tornadoMatrixIds: [20, 21, 22],
      spriteOrderSeed: [12, 13, 14, 7, 8, 9],
    });
    expect(altered.sprites.map((sprite) => [sprite.slot, sprite.matrixId])).toEqual([[12, 20], [13, 21], [14, 22]]);
  });
});
