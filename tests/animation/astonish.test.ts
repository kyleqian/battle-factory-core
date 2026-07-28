import { describe, expect, it } from "vitest";
import {
  ASTONISH_FRAME_COUNT,
  astonishAtAge,
} from "../../src/animation/astonish.ts";
import {
  createSceneOnMovePresentation,
  sceneOnAstonishView,
} from "../../src/animation/sceneOnPresentation.ts";

const playerRandom = [
  { v1: 299, v2: 127 },
  { v1: 291, v2: 74 },
] as const;
const opponentRandom = [
  { v1: 432, v2: 50 },
  { v1: 395, v2: 52 },
] as const;

describe("MOVE_ASTONISH source reducer", () => {
  it("ports the complete HorizontalLunge and both source sound commands", () => {
    expect([3, 4, 5, 7, 8, 9, 10, 13, 14].map((age) => ({
      age,
      x2: astonishAtAge(
        age, "player", { x: 176, y: 42 }, 2, playerRandom,
      ).attackerX2,
    }))).toEqual([
      { age: 3, x2: 0 },
      { age: 4, x2: 6 },
      { age: 5, x2: 12 },
      { age: 7, x2: 24 },
      { age: 8, x2: 24 },
      { age: 9, x2: 24 },
      { age: 10, x2: 18 },
      { age: 13, x2: 0 },
      { age: 14, x2: 0 },
    ]);
    expect(astonishAtAge(
      3, "player", { x: 176, y: 42 }, 2, playerRandom,
    ).sound).toEqual({ id: "SE_M_ENCORE", pan: -64 });
    expect(astonishAtAge(
      31, "opponent", { x: 72, y: 80 }, 0, opponentRandom,
    ).sound).toEqual({ id: "SE_M_SKETCH", pan: -63 });
  });

  it("ports both Random2-derived SprayWaterDroplet callbacks and cleanup", () => {
    const first = astonishAtAge(
      31, "player", { x: 176, y: 42 }, 2, playerRandom,
    );
    expect(first.droplets).toEqual([
      {
        index: 0, slot: 3, x: 176, y: 72, x2: 4, y2: -3,
        hFlip: false, callbackCount: 1, velocityX: 1035, velocityY: 1023,
      },
      {
        index: 1, slot: 4, x: 176, y: 72, x2: -4, y2: -3,
        hFlip: true, callbackCount: 1, velocityX: 1027, velocityY: 822,
      },
    ]);
    expect(astonishAtAge(
      60, "player", { x: 176, y: 42 }, 2, playerRandom,
    ).droplets.map(({ x2, y2, callbackCount }) => ({
      x2, y2, callbackCount,
    }))).toEqual([
      { x2: 120, y2: -48, callbackCount: 30 },
      { x2: -120, y2: -26, callbackCount: 30 },
    ]);
    expect(astonishAtAge(
      61, "player", { x: 176, y: 42 }, 2, playerRandom,
    ).droplets).toEqual([]);
  });

  it("ports task-slot shared writes, both affine legs, and side pic offsets", () => {
    expect([31, 32, 33, 34, 38, 39, 40, 41, 49, 50, 51].map((age) => {
      const target = astonishAtAge(
        age, "player", { x: 176, y: 42 }, 2, playerRandom,
      ).target;
      return {
        age, x2: target.x2, y2: target.y2,
        matrix: [target.matrix.a, target.matrix.d],
      };
    })).toEqual([
      { age: 31, x2: 4, y2: -1, matrix: [266, 243] },
      { age: 32, x2: -4, y2: -3, matrix: [276, 230] },
      { age: 33, x2: -4, y2: -5, matrix: [286, 217] },
      { age: 34, x2: 4, y2: -7, matrix: [296, 204] },
      { age: 38, x2: 4, y2: -20, matrix: [336, 152] },
      { age: 39, x2: 0, y2: -25, matrix: [346, 139] },
      { age: 40, x2: 0, y2: -30, matrix: [356, 126] },
      { age: 41, x2: 0, y2: -25, matrix: [346, 139] },
      { age: 49, x2: 0, y2: -1, matrix: [266, 243] },
      { age: 50, x2: 0, y2: 0, matrix: [256, 256] },
      { age: 51, x2: 0, y2: 0, matrix: [256, 256] },
    ]);
    expect(astonishAtAge(
      40, "opponent", { x: 72, y: 80 }, 0, opponentRandom,
    ).target.y2).toBe(-32);
  });

  it("exposes only relative source inputs through the typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "ASTONISH",
      attacker: {
        species: "LOUDRED",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 57 },
          animationCenter: { x: 72, y: 89 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 191, playerMaxHp: 191,
        opponentHp: 110, opponentMaxHp: 110,
      },
      targetPictureYOffset: 2,
      dropletRandom: playerRandom,
    });
    expect(sceneOnAstonishView({ ...stage, age: 31 })).toMatchObject({
      age: 31,
      attacker: { species: "LOUDRED" },
      targetBattler: { species: "ONIX" },
      attackerX2: 0,
      target: { x2: 4, y2: -1, matrix: { a: 266, d: 243 } },
      droplets: [{ x: 176, y: 72 }, { x: 176, y: 72 }],
    });
    expect(ASTONISH_FRAME_COUNT).toBe(63);
    expect(sceneOnAstonishView({ ...stage, age: 62 }).active).toBe(true);
    expect(sceneOnAstonishView({ ...stage, age: 63 }).active).toBe(false);
  });
});
