import { describe, expect, it } from "vitest";
import {
  FURY_SWIPES_FIRST_SWIPE_AGE,
  FURY_SWIPES_LAST_BODY_AGE,
  FURY_SWIPES_SECOND_SWIPE_AGE,
  furySwipesAtAge,
} from "../../src/animation/furySwipes.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFurySwipesView,
} from "../../src/animation/sceneOnPresentation.ts";

const PLAYER = { targetCenter: { x: 176, y: 42 } };
const OPPONENT = { targetCenter: { x: 72, y: 88 } };

describe("Move_FURY_SWIPES source-relative reducer", () => {
  it("ports both attacker lunges with the source callback timing", () => {
    const at = (age: number) => furySwipesAtAge(age, {
      ...PLAYER, attackerSide: "player", targetSide: "opponent",
    });
    expect(at(0).attackerX2).toBe(0);
    expect([4, 8, 9, 10, 11, 14, 15, 22, 26, 30].map((age) => at(age).attackerX2))
      .toEqual([5, 25, 25, 25, 20, 5, 0, 5, 25, 15]);
    expect(furySwipesAtAge(26, {
      ...OPPONENT, attackerSide: "opponent", targetSide: "player",
    }).attackerX2).toBe(-25);
  });

  it("owns both four-cell swipe programs and relative target geometry", () => {
    const at = (age: number) => furySwipesAtAge(age, {
      ...PLAYER, attackerSide: "player", targetSide: "opponent",
    });
    expect(at(FURY_SWIPES_FIRST_SWIPE_AGE - 1).swipes).toEqual([]);
    expect(at(FURY_SWIPES_FIRST_SWIPE_AGE)).toMatchObject({
      swipes: [{ spawnAge: 10, x: 192, y: 42, animation: 1, animationFrame: 0 }],
      targetX2: -3,
      sound: "SE_M_SCRATCH",
    });
    expect(at(13).swipes[0]?.animationFrame).toBe(1);
    expect(at(25).swipes[0]?.animationFrame).toBe(3);
    expect(at(25).swipes).toEqual([
      { spawnAge: 10, x: 192, y: 42, animation: 1, animationFrame: 3 },
    ]);
    expect(at(FURY_SWIPES_SECOND_SWIPE_AGE)).toMatchObject({
      swipes: [{ spawnAge: 28, x: 160, y: 42, animation: 0, animationFrame: 0 }],
      targetX2: -4,
      sound: "SE_M_SCRATCH",
    });
    expect(at(44).swipes).toEqual([]);
    expect(at(FURY_SWIPES_LAST_BODY_AGE).active).toBe(true);
    expect(at(FURY_SWIPES_LAST_BODY_AGE + 1).active).toBe(false);
  });

  it("exposes only immutable geometry and field data through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "FURY_SWIPES",
      attacker: {
        species: "AIPOM",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 57 },
          animationCenter: { x: 72, y: 97 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: PLAYER.targetCenter,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 162,
        playerMaxHp: 162,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    expect(sceneOnFurySwipesView({ ...stage, age: 28 })).toMatchObject({
      age: 28,
      attacker: { species: "AIPOM" },
      target: { species: "ONIX" },
      swipes: expect.arrayContaining([
        expect.objectContaining({ animation: 0, x: 160 }),
      ]),
      sound: "SE_M_SCRATCH",
    });
  });
});
