import { describe, expect, it } from "vitest";
import {
  thrashAtAge,
  thrashDisplayedTargetOffsetAtAge,
  type ThrashGeometry,
} from "../../src/animation/thrash.ts";
import {
  createSceneOnMovePresentation,
  sceneOnThrashView,
  type SceneOnThrashConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const PLAYER_RANDOM = [
  { x: 11893, y: 50161, xSign: 30189, ySign: 42348 },
  { x: 64666, y: 49322, xSign: 60288, ySign: 41562 },
  { x: 22148, y: 62276, xSign: 9547, ySign: 39955 },
] as const;
const OPPONENT_RANDOM = [
  { x: 51833, y: 29052, xSign: 59060, ySign: 50251 },
  { x: 46000, y: 50354, xSign: 15243, ySign: 2228 },
  { x: 21825, y: 50293, xSign: 19220, ySign: 46856 },
] as const;

const PLAYER_GEOMETRY: ThrashGeometry = {
  attackerSide: "player",
  targetSide: "opponent",
  targetCenter: { x: 176, y: 42 },
  targetDimensions: { width: 56, height: 64 },
  fistRandom: PLAYER_RANDOM,
};
const OPPONENT_GEOMETRY: ThrashGeometry = {
  attackerSide: "opponent",
  targetSide: "player",
  targetCenter: { x: 72, y: 88 },
  targetDimensions: { width: 56, height: 64 },
  fistRandom: OPPONENT_RANDOM,
};

describe("MOVE_THRASH source-relative reducer", () => {
  it("ports all three script-created fist/hitsplat/shake groups without owning RNG", () => {
    expect(thrashAtAge(7, PLAYER_GEOMETRY)).toMatchObject({
      active: true,
      impactLoaded: true,
      handsAndFeetLoaded: true,
      attackerPosition: { x: 4, y: 0 },
      attackerMatrix: { a: 246, b: 0, c: 0, d: 265 },
      targetOffset: { x2: -4, y2: 0 },
      fists: [{ slot: 3, childSlot: 4, x: 155, y: 43, animation: 0, remaining: 9 }],
      hitsplats: [{ slot: 4, parentSlot: 3, x: 155, y: 43 }],
      soundEvents: [{ age: 7, song: "SE_M_COMET_PUNCH", panTarget: true }],
    });
    expect(thrashAtAge(37, PLAYER_GEOMETRY).fists).toEqual([
      { slot: 3, childSlot: 4, x: 190, y: 52, animation: 1, remaining: 9 },
    ]);
    expect(thrashAtAge(67, PLAYER_GEOMETRY).fists).toEqual([
      { slot: 3, childSlot: 4, x: 176, y: 38, animation: 3, remaining: 9 },
    ]);
    expect(thrashAtAge(7, OPPONENT_GEOMETRY).fists[0]).toMatchObject({
      x: 77, y: 60, animation: 0,
    });
    expect(thrashAtAge(37, OPPONENT_GEOMETRY).fists[0]).toMatchObject({
      x: 48, y: 74, animation: 1,
    });
    expect(thrashAtAge(67, OPPONENT_GEOMETRY).fists[0]).toMatchObject({
      x: 85, y: 77, animation: 3,
    });
  });

  it("keeps the source task cadences separate through first inactive cleanup", () => {
    const player = (age: number) => thrashAtAge(age, PLAYER_GEOMETRY);
    const opponent = (age: number) => thrashAtAge(age, OPPONENT_GEOMETRY);
    expect(player(0)).toMatchObject({ impactLoaded: false, handsAndFeetLoaded: false });
    expect(player(1)).toMatchObject({ impactLoaded: true, handsAndFeetLoaded: false });
    expect(player(4)).toMatchObject({ impactLoaded: true, handsAndFeetLoaded: true });
    expect(player(8).attackerMatrix).toEqual({ a: 236, b: 0, c: 0, d: 274 });
    expect(player(9).attackerPosition).toEqual({ x: 12, y: 2 });
    expect(opponent(9).attackerPosition).toEqual({ x: -12, y: 2 });
    expect(player(34).attackerMatrix).toEqual({ a: 256, b: 0, c: 0, d: 256 });
    expect(player(34).horizontalTaskActive).toBe(true);
    expect(player(35).horizontalTaskActive).toBe(true);
    expect(player(36).attackerMatrix).toEqual({ a: 246, b: 0, c: 0, d: 265 });
    expect(player(94).horizontalTaskActive).toBe(false);
    expect(player(17).targetOffset).toEqual({ x2: 4, y2: 0 });
    expect(player(18).targetOffset).toEqual({ x2: 0, y2: 0 });
    expect(player(95).targetOffset).toEqual({ x2: -8, y2: 0 });
    expect(player(96).targetOffset).toEqual({ x2: 0, y2: 0 });
    // `createvisualtask`'s initializer is copied in its creation frame; the
    // remaining task writes are the independently witnessed RAM+2 path.
    expect(thrashDisplayedTargetOffsetAtAge(8, PLAYER_GEOMETRY)).toEqual({ x2: -4, y2: 0 });
    expect(thrashDisplayedTargetOffsetAtAge(9, PLAYER_GEOMETRY)).toEqual({ x2: -4, y2: 0 });
    expect(thrashDisplayedTargetOffsetAtAge(10, PLAYER_GEOMETRY)).toEqual({ x2: 4, y2: 0 });
    expect(player(101).active).toBe(true);
    expect(player(102)).toMatchObject({
      active: false,
      horizontalTaskActive: false,
      verticalTaskActive: false,
      shakeTask: null,
      fists: [],
      hitsplats: [],
    });
  });

  it("exposes immutable geometry and callback random inputs through a narrow typed seam", () => {
    const stage = createSceneOnMovePresentation<SceneOnThrashConfig>({
      move: "THRASH",
      attacker: {
        species: "TAUROS",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 61 },
          animationCenter: { x: 72, y: 93 },
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
        playerHp: 150, playerMaxHp: 150,
        opponentHp: 131, opponentMaxHp: 131,
      },
      fistRandom: PLAYER_RANDOM,
    });
    expect(sceneOnThrashView({ ...stage, age: 67 })).toMatchObject({
      attacker: { species: "TAUROS" },
      target: { species: "ONIX" },
      fists: [{ x: 176, y: 38, animation: 3 }],
      soundEvents: [{ song: "SE_M_MEGA_KICK2", panTarget: true }],
    });
  });
});
