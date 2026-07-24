import { describe, expect, it } from "vitest";
import {
  QUICK_ATTACK_FIRST_TRAVEL_AGE,
  QUICK_ATTACK_IMPACT_FIRST_AGE,
  QUICK_ATTACK_IMPACT_LAST_AGE,
  QUICK_ATTACK_LAST_BODY_AGE,
  quickAttackAfterimagesAtAge,
  quickAttackAnimationAtAge,
  quickAttackTravelAtAge,
} from "../src/engine/quickAttack.ts";
import {
  createSceneOnMovePresentation,
  PIDGEOTTO_TO_ONIX_QUICK_ATTACK_PRESENTATION,
  sceneOnQuickAttackView,
} from "../src/engine/sceneOnPresentation.ts";

describe("portable QUICK ATTACK presentation", () => {
  it("pins the source-relative side-respecting elliptical travel", () => {
    expect(QUICK_ATTACK_FIRST_TRAVEL_AGE).toBe(52);
    expect(QUICK_ATTACK_LAST_BODY_AGE).toBe(69);
    expect(quickAttackTravelAtAge(51, "opponent")).toEqual({ x2: 0, y2: 0 });
    expect(
      [52, 53, 54, 55, 56, 57].map(
        (age) => quickAttackTravelAtAge(age, "opponent"),
      ),
    ).toEqual([
      { x2: -17, y2: 2 },
      { x2: -24, y2: 6 },
      { x2: -17, y2: 11 },
      { x2: 0, y2: 12 },
      { x2: 16, y2: 11 },
      { x2: 24, y2: 6 },
    ]);
    expect(quickAttackTravelAtAge(52, "player")).toEqual({ x2: 17, y2: 2 });
    expect(quickAttackTravelAtAge(57, "player")).toEqual({ x2: -24, y2: 6 });
    expect(quickAttackTravelAtAge(58, "opponent")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins all source-created afterimage lives without a battle clock", () => {
    expect(quickAttackAfterimagesAtAge(52, "opponent")).toEqual([]);
    expect(quickAttackAfterimagesAtAge(53, "opponent")).toEqual([
      { slot: 3, x2: -17, y2: 2 },
    ]);
    expect(quickAttackAfterimagesAtAge(58, "opponent")).toEqual([
      { slot: 3, x2: -17, y2: 2 },
      { slot: 4, x2: 24, y2: 6 },
    ]);
    expect(quickAttackAfterimagesAtAge(62, "opponent")).toEqual([
      { slot: 4, x2: 24, y2: 6 },
    ]);
    expect(quickAttackAfterimagesAtAge(63, "opponent")).toEqual([
      { slot: 3, x2: 0, y2: 0 },
      { slot: 4, x2: 24, y2: 6 },
    ]);
    expect(quickAttackAfterimagesAtAge(69, "opponent")).toEqual([
      { slot: 3, x2: 0, y2: 0 },
    ]);
    expect(quickAttackAfterimagesAtAge(70, "opponent")).toEqual([]);
  });

  it("pins the shared impact lifetime and source shake display latch", () => {
    expect(QUICK_ATTACK_IMPACT_FIRST_AGE).toBe(58);
    expect(QUICK_ATTACK_IMPACT_LAST_AGE).toBe(67);
    expect(quickAttackAnimationAtAge(57, "opponent").impactVisible).toBe(false);
    expect(quickAttackAnimationAtAge(58, "opponent")).toMatchObject({
      targetShakeX2: 5,
      impactVisible: true,
    });
    expect(quickAttackAnimationAtAge(59, "opponent")).toMatchObject({
      targetShakeX2: 0,
      impactVisible: true,
    });
    expect(
      [58, 61, 62, 65, 66].map(
        (age) => quickAttackAnimationAtAge(age, "opponent").targetShakeX2,
      ),
    ).toEqual([5, 5, 5, 5, 5]);
    expect(quickAttackAnimationAtAge(68, "opponent")).toMatchObject({
      targetShakeX2: 0,
      impactVisible: false,
    });
  });

  it("pins explicit opponent-front Pidgeotto and player-back Onix geometry", () => {
    expect(PIDGEOTTO_TO_ONIX_QUICK_ATTACK_PRESENTATION).toEqual({
      attacker: {
        species: "PIDGEOTTO",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 19 },
          animationCenter: { x: 176, y: 51 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
    });
  });

  it("reads the controller-owned 117→110 outcome without mutating it", () => {
    const fieldProfile = Object.freeze({
      playerHp: 117,
      opponentHp: 156,
      playerStatus: "none" as const,
      playerGender: "female" as const,
    });
    const controllerProfile = Object.freeze({
      targetHpBefore: 117,
      targetHpAfter: 110,
    });
    const stage = createSceneOnMovePresentation({
      move: "QUICK_ATTACK",
      ...PIDGEOTTO_TO_ONIX_QUICK_ATTACK_PRESENTATION,
      fieldProfile,
      controllerProfile,
      moveTextStartAge: 5,
    });
    const before = structuredClone(stage.config);
    expect(sceneOnQuickAttackView({ ...stage, age: 58 })).toMatchObject({
      attackerOffset: { x2: 0, y2: 0 },
      targetShakeX2: 5,
      impactVisible: true,
      moveText: {
        line1: "Foe PIDGEOTTO used",
        line2: "QUICK ATTACK!",
      },
    });
    expect(stage.config).toEqual(before);
    expect(stage.config.fieldProfile).toBe(fieldProfile);
    expect(stage.config.controllerProfile).toBe(controllerProfile);
  });

  it("rejects an outcome profile that would calculate healing here", () => {
    expect(() => createSceneOnMovePresentation({
      move: "QUICK_ATTACK",
      ...PIDGEOTTO_TO_ONIX_QUICK_ATTACK_PRESENTATION,
      fieldProfile: {
        playerHp: 117,
        opponentHp: 156,
        playerStatus: "none",
      },
      controllerProfile: {
        targetHpBefore: 110,
        targetHpAfter: 117,
      },
      moveTextStartAge: 5,
    })).toThrow(/targetHpBefore >= targetHpAfter/);
  });
});
