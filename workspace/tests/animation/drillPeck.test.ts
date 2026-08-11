import { describe, expect, it } from "vitest";
import { drillPeckAtAge } from "../../src/animation/drillPeck.ts";
import {
  createSceneOnMovePresentation,
  sceneOnDrillPeckView,
} from "../../src/animation/sceneOnPresentation.ts";

const PLAYER_TARGET = { x: 176, y: 42 } as const;
const OPPONENT_TARGET = { x: 72, y: 88 } as const;
const SPLAT_SPAWNS = [28, 31, 35, 39, 43, 47, 51, 55] as const;
const SPLAT_OAM_SLOTS = [4, 3, 5, 7, 4, 3, 5, 7] as const;
// AnimTask_DrillPeckHitSplats uses Sin/Cos at 32-degree source steps with a
// -13 amplitude. These are the exact signed source receipts from the dense
// probe, kept here as a relative contract rather than screen coordinates.
const SPLAT_RELATIVE_POINTS = [
  { x: 0, y: -13 },
  { x: -10, y: -10 },
  { x: -13, y: 0 },
  { x: -10, y: 9 },
  { x: 0, y: 13 },
  { x: 9, y: 9 },
  { x: 13, y: 0 },
  { x: 9, y: -10 },
] as const;

function denseAges() {
  return Array.from({ length: 91 }, (_, age) => age);
}

function expectedX(age: number, side: -1 | 1): number {
  if (age >= 8 && age <= 13) return side * 2 * (age - 7);
  if (age >= 14 && age <= 24) return side * 12;
  if (age >= 25 && age <= 27) return side * 3 * (28 - age);
  return 0;
}

function expectedPhase(age: number): number[] {
  return [
    ...(age >= 7 && age <= 18 ? [0] : []),
    ...(age >= 24 && age <= 29 ? [1] : []),
    ...(age >= 70 && age <= 81 ? [2] : []),
  ];
}

function expectedImpactCount(age: number): number {
  return SPLAT_SPAWNS
    .filter((spawn) => age >= spawn && age <= spawn + 12).length;
}

function expectedImpacts(
  age: number,
  targetSide: "player" | "opponent",
  targetCenter: Readonly<{ x: number; y: number }>,
) {
  const horizontalSign = targetSide === "player" ? -1 : 1;
  return SPLAT_SPAWNS.flatMap((spawnAge, index) => {
    const localAge = age - spawnAge;
    if (localAge < 0 || localAge > 12) return [];
    const point = SPLAT_RELATIVE_POINTS[index]!;
    return [{
      spawnAge,
      oamSlot: SPLAT_OAM_SLOTS[index],
      x: targetCenter.x + horizontalSign * point.x,
      y: targetCenter.y + point.y,
      animation: 3 as const,
      invisible: index === 0
        ? (localAge + 1) % 2 === 1
        : localAge % 2 === 1,
      matrix: { a: 512, b: 0, c: 0, d: 512 },
    }];
  });
}

describe("MOVE_DRILL_PECK source-relative reducer", () => {
  it("pins every age of the player-back source contract", () => {
    const states = denseAges().map((age) =>
      drillPeckAtAge(age, "player", "opponent", PLAYER_TARGET));
    expect(states.map((state) => state.attackerOffset.x2)).toEqual(
      denseAges().map((age) => expectedX(age, -1)),
    );
    expect(states.map((state) => state.controllers.map(({ phase }) => phase))).toEqual(
      denseAges().map(expectedPhase),
    );
    expect(states.map((state) => state.impacts.length)).toEqual(
      denseAges().map(expectedImpactCount),
    );
    expect(states.map((state) => state.impacts)).toEqual(
      denseAges().map((age) => expectedImpacts(age, "opponent", PLAYER_TARGET)),
    );
    expect(states.map((state) => [
      state.active,
      state.hitSplatTaskActive,
      state.shakeTaskActive,
      state.loopAudioActive,
      state.slideActive,
      state.loadedTags.length,
      state.whirlwindLinesUsed,
    ])).toEqual(denseAges().map((age) => [
      age <= 89,
      age >= 28 && age <= 57,
      age >= 28 && age <= 61,
      age >= 28 && age <= 61,
      age >= 83 && age <= 88,
      age <= 89 ? 2 : 0,
      false,
    ]));
    expect(states[7]!.sound).toEqual({ id: "SE_M_HEADBUTT", pan: -64 });
    expect(states[28]!.sound).toEqual({ id: "SE_M_HORN_ATTACK", pan: 63 });
    expect(states[90]!.active).toBe(false);
    expect(states[90]!.loadedTags).toEqual([]);
  });

  it("keeps the complete opponent-front contract as the side-relative mirror", () => {
    const player = denseAges().map((age) =>
      drillPeckAtAge(age, "player", "opponent", PLAYER_TARGET));
    const opponent = denseAges().map((age) =>
      drillPeckAtAge(age, "opponent", "player", OPPONENT_TARGET));
    expect(opponent.map((state) => state.attackerOffset.x2)).toEqual(
      player.map((state) => state.attackerOffset.x2 === 0
        ? 0
        : -state.attackerOffset.x2),
    );
    expect(opponent.map((state) => state.attackerOffset.y2)).toEqual(
      player.map((state) => state.attackerOffset.y2),
    );
    expect(opponent.map((state) => state.targetOffset)).toEqual(
      player.map((state) => state.targetOffset),
    );
    expect(opponent.map((state) => state.impacts.map(({ x, y, invisible }) => ({
      x: x - OPPONENT_TARGET.x,
      y: y - OPPONENT_TARGET.y,
      invisible,
    })))).toEqual(player.map((state) => state.impacts.map(({ x, y, invisible }) => ({
      x: PLAYER_TARGET.x - x,
      y: y - PLAYER_TARGET.y,
      invisible,
    }))));
    expect(opponent.map((state) => state.attackerMatrix)).toEqual(
      player.map((state) => ({
        a: state.attackerMatrix.a,
        b: state.attackerMatrix.b === 0 ? 0 : -state.attackerMatrix.b,
        c: state.attackerMatrix.c === 0 ? 0 : -state.attackerMatrix.c,
        d: state.attackerMatrix.d,
      })),
    );
  });

  it("exposes only relative geometry through the typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "DRILL_PECK",
      attacker: {
        species: "FEAROW",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 53 },
          animationCenter: { x: 72, y: 85 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: PLAYER_TARGET,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 145,
        playerMaxHp: 145,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    expect(sceneOnDrillPeckView({ ...stage, age: 28 })).toMatchObject({
      age: 28,
      attacker: { species: "FEAROW" },
      target: { species: "ONIX" },
      attackerOffset: { x2: 0, y2: 9 },
      targetOffset: { x2: -4, y2: 0 },
      impacts: [{ x: 176, y: 29, animation: 3, invisible: true }],
      loadedTags: ["ANIM_TAG_IMPACT", "ANIM_TAG_WHIRLWIND_LINES"],
      whirlwindLinesUsed: false,
    });
    expect(sceneOnDrillPeckView({ ...stage, age: 83 }).slideActive).toBe(true);
  });
});
