import { describe, expect, it } from "vitest";
import opponentScenario from "../tools/battle-lab/mechanic-aerial-ace-pidgeotto-onix.json";
import playerScenario from "../tools/battle-lab/mechanic-aerial-ace-player-pidgeotto-onix.json";
import opponentFixture from "../tools/compare/fixtures/aerial-ace-pidgeotto-onix.json";
import playerFixture from "../tools/compare/fixtures/aerial-ace-player-pidgeotto-onix.json";
import {
  createSceneOnMovePresentation,
  PIDGEOTTO_TO_ONIX_AERIAL_ACE_PRESENTATION,
  PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_AERIAL_ACE_PRESENTATION,
  sceneOnAerialAceView,
} from "../src/engine/sceneOnPresentation.ts";
import {
  AERIAL_ACE_LAST_BODY_AGE,
  AERIAL_ACE_PALETTE_FIRST_AGE,
  AERIAL_ACE_SHAKE_FIRST_AGE,
  AERIAL_ACE_SLICE_FIRST_AGE,
  AERIAL_ACE_TRAVEL_FIRST_AGE,
  aerialAceAnimationAtAge,
  aerialAceSliceAtAge,
  aerialAceTracesAtAge,
  aerialAceTravelAtAge,
} from "../src/engine/aerialAce.ts";

describe("portable AERIAL ACE source components", () => {
  it("pins legal zero-PP-Up inputs and unthinned complete-window boundaries", () => {
    expect(opponentScenario.profile).toBe("battle-scene-on");
    expect(opponentScenario.overrides.battlers.opponent).toEqual({
      moves: [332, 332, 332, 332],
      ppUps: [0, 0, 0, 0],
    });
    expect(playerScenario.overrides.battlers.player).toEqual({
      moves: [332, 332, 332, 332],
      ppUps: [0, 0, 0, 0],
    });
    expect(opponentFixture.denseWindow).toEqual({
      startFrame: 46,
      endFrame: 281,
    });
    expect(playerFixture.denseWindow).toEqual({
      startFrame: 46,
      endFrame: 277,
    });
    expect(opponentFixture.acceptance.status).toBe("exact");
    expect(playerFixture.acceptance.status).toBe("staged-not-compared");
  });

  it("pins the independent source-relative component clocks", () => {
    expect({
      slice: AERIAL_ACE_SLICE_FIRST_AGE,
      travel: AERIAL_ACE_TRAVEL_FIRST_AGE,
      palette: AERIAL_ACE_PALETTE_FIRST_AGE,
      shake: AERIAL_ACE_SHAKE_FIRST_AGE,
      last: AERIAL_ACE_LAST_BODY_AGE,
    }).toEqual({ slice: 50, travel: 51, palette: 57, shake: 59, last: 74 });
  });

  it("preserves signed fixed-point asymmetry instead of mirroring", () => {
    expect(
      [51, 52, 53, 54, 55, 56].map((age) =>
        aerialAceTravelAtAge(age, "opponent")),
    ).toEqual([
      { x2: -17, y2: 2 },
      { x2: -24, y2: 6 },
      { x2: -17, y2: 11 },
      { x2: 0, y2: 12 },
      { x2: 16, y2: 11 },
      { x2: 24, y2: 6 },
    ]);
    expect(
      [51, 52, 53, 54, 55, 56].map((age) =>
        aerialAceTravelAtAge(age, "player")),
    ).toEqual([
      { x2: 16, y2: 2 },
      { x2: 24, y2: 6 },
      { x2: 16, y2: 11 },
      { x2: 0, y2: 12 },
      { x2: -17, y2: 11 },
      { x2: -24, y2: 6 },
    ]);
  });

  it("pins AERIAL ACE's asymmetric TraceMon OAM order", () => {
    expect(aerialAceTracesAtAge(56, "opponent")).toEqual([
      { slot: 4, x2: -17, y2: 2, winsOamTie: false },
    ]);
    expect(aerialAceTracesAtAge(57, "opponent")).toEqual([
      { slot: 4, x2: -17, y2: 2, winsOamTie: true },
      { slot: 7, x2: 24, y2: 6, winsOamTie: true },
    ]);
    expect(aerialAceTracesAtAge(62, "player")).toEqual([
      { slot: 4, x2: 0, y2: 0, winsOamTie: false },
      { slot: 7, x2: -24, y2: 6, winsOamTie: true },
    ]);
    expect(aerialAceTracesAtAge(63, "player")).toEqual([
      { slot: 4, x2: 0, y2: 0, winsOamTie: false },
    ]);
  });

  it("pins the independent cutting slice and complex palette pulse", () => {
    expect(aerialAceSliceAtAge(49)).toBeNull();
    expect(aerialAceSliceAtAge(50)).toEqual({ x2: -4, y2: 4, frame: 0 });
    expect(aerialAceSliceAtAge(59)).toEqual({ x2: -36, y2: 35, frame: 2 });
    expect(aerialAceSliceAtAge(73)).toEqual({ x2: -63, y2: 62, frame: 3 });
    expect(aerialAceSliceAtAge(74)).toBeNull();
    expect([56, 57, 58, 59, 60].map(
      (age) => aerialAceAnimationAtAge(age, "opponent").paletteBlendCoeff,
    )).toEqual([0, 10, 10, 10, 0]);
  });

  it("pins the vertical target shake separately from QUICK ATTACK", () => {
    expect(
      [58, 59, 60, 61, 62, 63, 74, 75].map(
        (age) => aerialAceAnimationAtAge(age, "player").targetShakeY2,
      ),
    ).toEqual([0, 3, 3, 0, 0, 3, 0, 0]);
  });

  it("consumes the opponent-front 117→108 result immutably through cleanup", () => {
    const controllerProfile = Object.freeze({
      targetHpBefore: 117,
      targetHpAfter: 108,
      hitReactionFirstAge: 96,
      hpDrainFirstAge: 131,
      moveTextClearAge: 145,
      resultTextFirstAge: 145,
      currentMoveResetAge: 242,
    });
    const stage = createSceneOnMovePresentation({
      move: "AERIAL_ACE",
      ...PIDGEOTTO_TO_ONIX_AERIAL_ACE_PRESENTATION,
      fieldProfile: Object.freeze({
        playerHp: 117,
        opponentHp: 156,
        playerStatus: "none" as const,
        playerGender: "female" as const,
      }),
      controllerProfile,
      moveTextStartAge: 5,
    });
    const before = structuredClone(stage.config);
    expect(sceneOnAerialAceView({ ...stage, age: 130 }).displayedTargetHp)
      .toBe(117);
    expect(sceneOnAerialAceView({ ...stage, age: 96 })).toMatchObject({
      healthboxY2: 1,
      targetInvisible: false,
    });
    expect(sceneOnAerialAceView({ ...stage, age: 97 })).toMatchObject({
      healthboxY2: -1,
      targetInvisible: true,
    });
    expect(sceneOnAerialAceView({ ...stage, age: 131 }).displayedTargetHp)
      .toBe(116);
    expect(sceneOnAerialAceView({ ...stage, age: 139 }).displayedTargetHp)
      .toBe(108);
    expect(sceneOnAerialAceView({ ...stage, age: 145 }).moveTextVisible)
      .toBe(false);
    expect(sceneOnAerialAceView({ ...stage, age: 145 }).resultText)
      .toEqual({ line: "It’s not very effective…", visibleChars: 1 });
    expect(sceneOnAerialAceView({ ...stage, age: 241 }).currentMove)
      .toBe("AERIAL_ACE");
    expect(sceneOnAerialAceView({ ...stage, age: 242 }).currentMove)
      .toBeNull();
    expect(stage.config).toEqual(before);
    expect(stage.config.controllerProfile).toBe(controllerProfile);
  });

  it("pins the four-frame player printer offset and independent cleanup", () => {
    const stage = createSceneOnMovePresentation({
      move: "AERIAL_ACE",
      ...PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_AERIAL_ACE_PRESENTATION,
      fieldProfile: Object.freeze({
        playerHp: 156,
        opponentHp: 117,
        playerStatus: "none" as const,
        playerGender: "female" as const,
        opponentGender: "male" as const,
      }),
      controllerProfile: Object.freeze({
        targetHpBefore: 117,
        targetHpAfter: 108,
        hitReactionFirstAge: 92,
        hpDrainFirstAge: 127,
        moveTextClearAge: 141,
        resultTextFirstAge: 141,
        currentMoveResetAge: 238,
      }),
      moveTextStartAge: 5,
    });
    expect(sceneOnAerialAceView({ ...stage, age: 47 })).toMatchObject({
      animationAge: 51,
      attackerOffset: { x2: 16, y2: 2 },
      displayedTargetHp: 117,
    });
    expect(sceneOnAerialAceView({ ...stage, age: 127 }).displayedTargetHp)
      .toBe(116);
    expect(sceneOnAerialAceView({ ...stage, age: 135 }).displayedTargetHp)
      .toBe(108);
    expect(sceneOnAerialAceView({ ...stage, age: 238 }).currentMove)
      .toBeNull();
  });
});
