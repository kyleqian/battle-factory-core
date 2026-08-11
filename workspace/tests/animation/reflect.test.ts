import { describe, expect, it } from "vitest";
import { reflectAtAge } from "../../src/animation/reflect.ts";
import {
  createSceneOnMovePresentation,
  sceneOnReflectView,
} from "../../src/animation/sceneOnPresentation.ts";

const player = {
  species: "MINUN" as const,
  geometry: {
    side: "player" as const,
    spriteCorner: { x: 40, y: 56 },
    animationCenter: { x: 72, y: 88 },
    battlePositionCenter: { x: 72, y: 80 },
  },
};
const opponent = {
  species: "SHUCKLE" as const,
  geometry: {
    side: "opponent" as const,
    spriteCorner: { x: 144, y: 17 },
    animationCenter: { x: 176, y: 49 },
    battlePositionCenter: { x: 176, y: 40 },
  },
};

describe("MOVE_REFLECT source reducer", () => {
  it("ports the wall alpha, palette rotation, and teardown lifecycle", () => {
    expect(reflectAtAge(-1, { x: 72, y: 80 }, "player").active).toBe(false);
    expect(reflectAtAge(0, { x: 72, y: 80 }, "player")).toMatchObject({
      wall: { x: 112, y: 80, paletteRotationSteps: 0 },
      alpha: { eva: 0, evb: 16 }, soundTaskActive: true,
    });
    expect(reflectAtAge(16, { x: 72, y: 80 }, "player").wall)
      .toMatchObject({ paletteRotationSteps: 1 });
    expect(reflectAtAge(46, { x: 72, y: 80 }, "player").wall)
      .toMatchObject({ paletteRotationSteps: 16 });
    expect(reflectAtAge(60, { x: 72, y: 80 }, "player")).toMatchObject({
      alpha: { eva: 0, evb: 16 }, opponentBattlerHidden: false,
    });
    expect(reflectAtAge(64, { x: 72, y: 80 }, "player").wall).toBeNull();
    expect(reflectAtAge(68, { x: 72, y: 80 }, "player")).toMatchObject({
      active: false, alpha: null,
    });
  });

  it("ports all three SPARKLE_4 lifecycles and mirrors attacker geometry", () => {
    expect(reflectAtAge(22, { x: 72, y: 80 }, "player").sparkles)
      .toEqual([{ spawnIndex: 0, x: 102, y: 80, tileOffset: 0 }]);
    expect(reflectAtAge(40, { x: 72, y: 80 }, "player").sparkles)
      .toEqual([
        { spawnIndex: 1, x: 91, y: 68, tileOffset: 48 },
        { spawnIndex: 2, x: 82, y: 100, tileOffset: 0 },
      ]);
    expect(reflectAtAge(22, { x: 176, y: 40 }, "opponent").sparkles[0])
      .toEqual({ spawnIndex: 0, x: 146, y: 40, tileOffset: 0 });
  });

  it("threads REFLECT through the typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "REFLECT", attacker: player, target: opponent,
      allocatorProfile: { wall: 3, sparkles: [4, 5, 4] },
      fieldProfile: {
        playerHp: 167, playerMaxHp: 167,
        opponentHp: 127, opponentMaxHp: 127,
        playerGender: "female", opponentGender: "male",
      },
    });
    expect(sceneOnReflectView({ ...stage, age: 0 }).wall)
      .toEqual({ x: 112, y: 80, paletteRotationSteps: 0 });
  });
});
