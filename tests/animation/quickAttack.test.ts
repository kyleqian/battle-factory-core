import { describe, expect, it } from "vitest";
import {
  QUICK_ATTACK_FIRST_TRAVEL_AGE,
  QUICK_ATTACK_IMPACT_FIRST_AGE,
  QUICK_ATTACK_IMPACT_LAST_AGE,
  QUICK_ATTACK_LAST_BODY_AGE,
  quickAttackAfterimagesAtAge,
  quickAttackAnimationAtAge,
  quickAttackTravelAtAge,
} from "../../src/animation/quickAttack.ts";
import {
  createSceneOnMovePresentation,
  PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_QUICK_ATTACK_PRESENTATION,
  PIDGEOTTO_TO_ONIX_QUICK_ATTACK_PRESENTATION,
  sceneOnQuickAttackView,
} from "../../src/animation/sceneOnPresentation.ts";

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
    expect(quickAttackTravelAtAge(52, "player")).toEqual({ x2: 16, y2: 2 });
    expect(quickAttackTravelAtAge(54, "player")).toEqual({ x2: 16, y2: 11 });
    expect(quickAttackTravelAtAge(56, "player")).toEqual({ x2: -17, y2: 11 });
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
    expect(quickAttackAfterimagesAtAge(53, "player")).toEqual([
      { slot: 3, x2: 16, y2: 2 },
    ]);
  });

  it("pins the opposite monbg/TraceMon/target/impact ordering boundary", () => {
    expect(quickAttackAnimationAtAge(52, "player")).toEqual({
      attackerOffset: { x2: 16, y2: 2 },
      afterimages: [],
      targetShakeX2: 0,
      targetBaseX2: 0,
      impactVisible: false,
    });
    expect(quickAttackAnimationAtAge(58, "player")).toEqual({
      attackerOffset: { x2: 0, y2: 0 },
      afterimages: [
        { slot: 3, x2: 16, y2: 2 },
        { slot: 4, x2: -24, y2: 6 },
      ],
      targetShakeX2: 5,
      targetBaseX2: -1,
      impactVisible: true,
    });
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

  it("pins source-derived player-back Pidgeotto and opponent-front Onix geometry", () => {
    expect(PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_QUICK_ATTACK_PRESENTATION)
      .toEqual({
        attacker: {
          species: "PIDGEOTTO",
          geometry: {
            side: "player",
            spriteCorner: { x: 40, y: 60 },
            animationCenter: { x: 72, y: 100 },
            battlePositionCenter: { x: 72, y: 80 },
          },
        },
        target: {
          species: "ONIX",
          geometry: {
            side: "opponent",
            spriteCorner: { x: 145, y: 10 },
            animationCenter: { x: 176, y: 42 },
            battlePositionCenter: { x: 176, y: 40 },
          },
        },
        animationAgeOffset: 4,
      });
  });

  it("pins the opposite controller clocks without calculating its 117→111 outcome", () => {
    const controllerProfile = Object.freeze({
      targetHpBefore: 117,
      targetHpAfter: 111,
      hitReactionFirstAge: 77,
      hpDrainFirstAge: 112,
      resultTextFirstAge: 123,
      resultKind: "notVeryEffective" as const,
      currentMoveResetAge: 220,
    });
    const stage = createSceneOnMovePresentation({
      move: "QUICK_ATTACK",
      ...PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_QUICK_ATTACK_PRESENTATION,
      fieldProfile: Object.freeze({
        playerHp: 156,
        opponentHp: 117,
        playerStatus: "none" as const,
        playerGender: "female" as const,
        opponentGender: "male" as const,
      }),
      controllerProfile,
      moveTextStartAge: 5,
    });
    const before = structuredClone(stage.config);

    expect(sceneOnQuickAttackView({ ...stage, age: 76 })).toMatchObject({
      healthboxY2: 0,
      targetInvisible: false,
      displayedTargetHp: 117,
    });
    expect(sceneOnQuickAttackView({ ...stage, age: 77 })).toMatchObject({
      healthboxY2: 1,
      targetInvisible: false,
    });
    expect(sceneOnQuickAttackView({ ...stage, age: 112 }).displayedTargetHp)
      .toBe(116);
    expect(sceneOnQuickAttackView({ ...stage, age: 117 }).displayedTargetHp)
      .toBe(111);
    expect(sceneOnQuickAttackView({ ...stage, age: 123 }).resultText)
      .toEqual({ line: "It’s not very effective…", visibleChars: 1 });
    expect(sceneOnQuickAttackView({ ...stage, age: 219 }).currentMove)
      .toBe("QUICK_ATTACK");
    expect(sceneOnQuickAttackView({ ...stage, age: 220 }).currentMove)
      .toBeNull();
    expect(stage.config).toEqual(before);
    expect(stage.config.controllerProfile).toBe(controllerProfile);
  });

  it("reads the current controller-owned 117→111 outcome without mutating it", () => {
    const fieldProfile = Object.freeze({
      playerHp: 117,
      opponentHp: 156,
      playerStatus: "none" as const,
      playerGender: "female" as const,
    });
    const controllerProfile = Object.freeze({
      targetHpBefore: 117,
      targetHpAfter: 111,
      hitReactionFirstAge: 81,
      hpDrainFirstAge: 116,
      resultTextFirstAge: 128,
      resultKind: "notVeryEffective" as const,
      currentMoveResetAge: 225,
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

  it("presents generic hit, HP drain, result, and current-move cleanup from controller clocks", () => {
    const stage = createSceneOnMovePresentation({
      move: "QUICK_ATTACK",
      ...PIDGEOTTO_TO_ONIX_QUICK_ATTACK_PRESENTATION,
      fieldProfile: {
        playerHp: 117,
        opponentHp: 156,
        playerStatus: "none",
      },
      controllerProfile: {
        targetHpBefore: 117,
        targetHpAfter: 111,
        hitReactionFirstAge: 81,
        hpDrainFirstAge: 116,
        resultTextFirstAge: 127,
        resultKind: "notVeryEffective",
        currentMoveResetAge: 225,
      },
      moveTextStartAge: 5,
    });

    expect(sceneOnQuickAttackView({ ...stage, age: 80 })).toMatchObject({
      healthboxY2: 0,
      targetInvisible: false,
      displayedTargetHp: 117,
      resultText: null,
      currentMove: "QUICK_ATTACK",
    });
    expect(sceneOnQuickAttackView({ ...stage, age: 81 })).toMatchObject({
      healthboxY2: 1,
      targetInvisible: false,
    });
    expect(sceneOnQuickAttackView({ ...stage, age: 82 })).toMatchObject({
      healthboxY2: -1,
      targetInvisible: true,
    });
    expect(sceneOnQuickAttackView({ ...stage, age: 116 }).displayedTargetHp)
      .toBe(116);
    expect(sceneOnQuickAttackView({ ...stage, age: 122 }).displayedTargetHp)
      .toBe(111);
    expect(sceneOnQuickAttackView({ ...stage, age: 127 }).resultText)
      .toEqual({ line: "It’s not very effective…", visibleChars: 1 });
    expect(sceneOnQuickAttackView({ ...stage, age: 150 }).resultText)
      .toEqual({ line: "It’s not very effective…", visibleChars: 24 });
    expect(sceneOnQuickAttackView({ ...stage, age: 224 }).currentMove)
      .toBe("QUICK_ATTACK");
    expect(sceneOnQuickAttackView({ ...stage, age: 225 }).currentMove)
      .toBeNull();
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
        hitReactionFirstAge: 81,
        hpDrainFirstAge: 116,
        resultTextFirstAge: 128,
        resultKind: "notVeryEffective",
        currentMoveResetAge: 225,
      },
      moveTextStartAge: 5,
    })).toThrow(/targetHpBefore >= targetHpAfter/);
  });
});
