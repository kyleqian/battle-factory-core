import { describe, expect, it } from "vitest";
import {
  BOUNCE_CHARGE_BALL,
  bouncePresentationAtAge,
  bounceStrikeBallAtAge,
} from "../src/engine/bounce.ts";
import {
  createSceneOnMovePresentation,
  PLAYER_SPOINK_TO_OPPONENT_ONIX_BOUNCE_PRESENTATION,
  sceneOnBounceView,
  SPOINK_TO_ONIX_BOUNCE_PRESENTATION,
} from "../src/engine/sceneOnPresentation.ts";

describe("source-relative BOUNCE presentation", () => {
  it("pins the complete BounceSetUp affine program from legal Scene-ON OAM", () => {
    expect(BOUNCE_CHARGE_BALL).toHaveLength(24);
    expect(BOUNCE_CHARGE_BALL[0]).toEqual({ a: 1170, d: 256, y2: 0 });
    expect(BOUNCE_CHARGE_BALL[10]).toEqual({ a: 256, d: 682, y2: 0 });
    expect(BOUNCE_CHARGE_BALL[18]).toEqual({ a: 682, d: 862, y2: 0 });
    expect(BOUNCE_CHARGE_BALL[23]).toEqual({
      a: 4096,
      d: -16384,
      y2: 0,
    });
    expect(bouncePresentationAtAge("charge", 24).ball).toBeNull();
    expect(bouncePresentationAtAge("charge", 24).attackerInvisible).toBe(true);
  });

  it("pins the complete vertical land and rebound geometry", () => {
    expect(bounceStrikeBallAtAge(-1)).toBeNull();
    expect(bounceStrikeBallAtAge(0)).toEqual({ a: 409, d: 256, y2: -102 });
    expect(bounceStrikeBallAtAge(10)).toEqual({ a: 409, d: 256, y2: -2 });
    expect(bounceStrikeBallAtAge(11)).toEqual({ a: 409, d: 256, y2: 8 });
    expect(bounceStrikeBallAtAge(12)).toEqual({ a: 409, d: 256, y2: -2 });
    expect(bounceStrikeBallAtAge(23)).toEqual({ a: 409, d: 256, y2: -112 });
    expect(bounceStrikeBallAtAge(24)).toBeNull();
  });

  it("reuses only BOUNCE's script-exact hit-splat and vertical shake clocks", () => {
    expect(bouncePresentationAtAge("strike", 8)).toMatchObject({
      impactVisible: false,
      targetTaskOwnsY2: false,
      targetBaseOffsetReset: false,
      targetShakeY2: 0,
    });
    expect(bouncePresentationAtAge("strike", 9)).toMatchObject({
      impactVisible: true,
      targetTaskOwnsY2: true,
      targetShakeY2: 0,
    });
    expect(bouncePresentationAtAge("strike", 11).targetShakeY2).toBe(5);
    expect(bouncePresentationAtAge("strike", 13).targetShakeY2).toBe(0);
    expect(bouncePresentationAtAge("strike", 17).impactVisible).toBe(true);
    expect(bouncePresentationAtAge("strike", 18).impactVisible).toBe(false);
    expect(bouncePresentationAtAge("strike", 24)).toMatchObject({
      attackerInvisible: false,
      ball: null,
      targetTaskOwnsY2: true,
      targetShakeY2: 5,
    });
  });

  it("keeps the ball clock fixed while applying the observed opposite-side hit-task lag", () => {
    expect(bouncePresentationAtAge("strike", 12, 4)).toMatchObject({
      ball: { y2: -2 },
      impactVisible: false,
      targetTaskOwnsY2: false,
      targetShakeY2: 0,
    });
    expect(bouncePresentationAtAge("strike", 13, 4)).toMatchObject({
      ball: { y2: -12 },
      impactVisible: true,
      targetTaskOwnsY2: true,
      targetShakeY2: 0,
    });
    expect(bouncePresentationAtAge("strike", 15, 4).targetShakeY2).toBe(5);
    expect(bouncePresentationAtAge("strike", 19, 4, 20).attackerInvisible)
      .toBe(true);
    expect(bouncePresentationAtAge("strike", 20, 4, 20).attackerInvisible)
      .toBe(false);
  });

  it("is driven through the shared Scene-ON seam by relative phase age", () => {
    const state = createSceneOnMovePresentation({
      move: "BOUNCE",
      turn: "strike",
      ...SPOINK_TO_ONIX_BOUNCE_PRESENTATION,
      fieldProfile: {
        playerHp: 117,
        opponentHp: 96,
        playerStatus: "none",
        playerGender: "female",
        opponentGender: "female",
      },
      controllerProfile: {
        moveTextFirstAge: -22,
        moveTextClearAge: 192,
        targetHpBefore: 117,
        targetHpAfter: 114,
        hitReactionFirstAge: 49,
        hpDrainFirstAge: 84,
        resultTextFirstAge: 92,
        currentMoveResetAge: 189,
        actionMenuRevealAge: 199,
      },
      animationAgeOffset: -9,
    });
    expect(sceneOnBounceView({ ...state, age: 18 })).toMatchObject({
      age: 18,
      animationAge: 9,
      currentMove: "BOUNCE",
      attacker: { species: "SPOINK" },
      target: { species: "ONIX" },
      attackerInvisible: true,
      impactVisible: true,
      targetTaskOwnsY2: true,
      message: {
        line1: "Foe SPOINK used",
        line2: "BOUNCE!",
        visibleChars: 22,
      },
    });
  });

  it("consumes immutable resolution outcomes through cleanup and menu reveal", () => {
    const state = createSceneOnMovePresentation({
      move: "BOUNCE",
      turn: "strike",
      ...SPOINK_TO_ONIX_BOUNCE_PRESENTATION,
      fieldProfile: {
        playerHp: 117,
        opponentHp: 96,
        playerStatus: "none",
        playerGender: "female",
        opponentGender: "female",
      },
      controllerProfile: {
        moveTextFirstAge: -22,
        moveTextClearAge: 192,
        targetHpBefore: 117,
        targetHpAfter: 114,
        hitReactionFirstAge: 49,
        hpDrainFirstAge: 84,
        resultTextFirstAge: 92,
        currentMoveResetAge: 189,
        actionMenuRevealAge: 199,
      },
      animationAgeOffset: -1,
    });
    expect(sceneOnBounceView({ ...state, age: 49 })).toMatchObject({
      healthboxY2: 1,
      targetInvisible: false,
      displayedTargetHp: 117,
      currentMove: "BOUNCE",
    });
    expect(sceneOnBounceView({ ...state, age: 50 }).targetInvisible).toBe(true);
    expect(sceneOnBounceView({ ...state, age: 84 }).displayedTargetHp).toBe(116);
    expect(sceneOnBounceView({ ...state, age: 86 }).displayedTargetHp).toBe(114);
    expect(sceneOnBounceView({ ...state, age: 189 }).currentMove).toBeNull();
    expect(sceneOnBounceView({ ...state, age: 92 }).message).toMatchObject({
      line1: "It’s not very effective…",
      visibleChars: 1,
    });
    expect(sceneOnBounceView({ ...state, age: 192 }).message).toBeNull();
    expect(sceneOnBounceView({ ...state, age: 198 }).actionMenu.visible).toBe(false);
    expect(sceneOnBounceView({ ...state, age: 199 }).actionMenu.visible).toBe(true);
  });

  it("pins the source-derived opposite-side battler geometry", () => {
    expect(PLAYER_SPOINK_TO_OPPONENT_ONIX_BOUNCE_PRESENTATION).toEqual({
      attacker: {
        species: "SPOINK",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 59 },
          animationCenter: { x: 72, y: 99 },
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
    });
  });
});
