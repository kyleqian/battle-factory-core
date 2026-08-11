import { describe, expect, it } from "vitest";
import { submissionAtAge } from "../../src/animation/submission.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSubmissionView,
  type SceneOnSubmissionConfig,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_SUBMISSION source reducer", () => {
  const target = { x: 176, y: 48 };

  it("ports both literal-width TranslateMonElliptical tasks through reset", () => {
    expect([7, 8, 100, 101].map((age) => ({
      age,
      attacker: submissionAtAge(age, target).attackerOffset,
      target: submissionAtAge(age, target).targetOffset,
      active: submissionAtAge(age, target).translationTasksActive,
    }))).toEqual([
      {
        age: 7,
        attacker: { x2: -7, y2: 1 },
        target: { x2: 6, y2: 1 },
        active: true,
      },
      {
        age: 8,
        attacker: { x2: -13, y2: 2 },
        target: { x2: 12, y2: 2 },
        active: true,
      },
      {
        age: 100,
        attacker: { x2: 12, y2: 2 },
        target: { x2: -13, y2: 2 },
        active: true,
      },
      {
        age: 101,
        attacker: { x2: 0, y2: 0 },
        target: { x2: 0, y2: 0 },
        active: false,
      },
    ]);
  });

  it("ports all nine affine IMPACT calls and monbg/alpha cleanup", () => {
    expect([7, 16, 17, 27, 87, 96, 97].map((age) => ({
      age,
      impacts: submissionAtAge(age, target).impacts,
    }))).toEqual([
      {
        age: 7,
        impacts: [{
          index: 0,
          slot: 3,
          x: 176,
          y: 36,
          animation: 1,
          matrix: { a: 303, b: 0, c: 0, d: 303 },
        }],
      },
      {
        age: 16,
        impacts: [{
          index: 0,
          slot: 3,
          x: 176,
          y: 36,
          animation: 1,
          matrix: { a: 303, b: 0, c: 0, d: 303 },
        }],
      },
      {
        age: 17,
        impacts: [{
          index: 1,
          slot: 4,
          x: 164,
          y: 56,
          animation: 1,
          matrix: { a: 303, b: 0, c: 0, d: 303 },
        }],
      },
      {
        age: 27,
        impacts: [{
          index: 2,
          slot: 3,
          x: 188,
          y: 48,
          animation: 1,
          matrix: { a: 303, b: 0, c: 0, d: 303 },
        }],
      },
      {
        age: 87,
        impacts: [{
          index: 8,
          slot: 3,
          x: 188,
          y: 48,
          animation: 1,
          matrix: { a: 303, b: 0, c: 0, d: 303 },
        }],
      },
      {
        age: 96,
        impacts: [{
          index: 8,
          slot: 3,
          x: 188,
          y: 48,
          animation: 1,
          matrix: { a: 303, b: 0, c: 0, d: 303 },
        }],
      },
      { age: 97, impacts: [] },
    ]);
    expect(submissionAtAge(101, target)).toMatchObject({
      alpha: { eva: 12, evb: 8 },
      monbgTaskActive: true,
      clearMonbgTaskActive: false,
    });
    expect(submissionAtAge(102, target)).toMatchObject({
      alpha: null,
      monbgTaskActive: true,
      clearMonbgTaskActive: true,
    });
    expect(submissionAtAge(122, target).active).toBe(true);
    expect(submissionAtAge(123, target)).toMatchObject({
      active: false,
      impactGfxLoaded: false,
      clearMonbgTaskActive: false,
    });
  });

  it("keeps literal task widths bilateral through the narrow relative seam", () => {
    const playerToOpponent = createSceneOnMovePresentation<SceneOnSubmissionConfig>({
      move: "SUBMISSION",
      attacker: {
        species: "POLIWRATH",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 59 },
          animationCenter: { x: 72, y: 91 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "LICKITUNG",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 16 },
          animationCenter: target,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 197,
        playerMaxHp: 197,
        opponentHp: 177,
        opponentMaxHp: 177,
      },
    });
    const opponentToPlayer = createSceneOnMovePresentation({
      ...playerToOpponent.config,
      attacker: {
        ...playerToOpponent.config.attacker,
        geometry: {
          ...playerToOpponent.config.attacker.geometry,
          side: "opponent",
          spriteCorner: { x: 144, y: 16 },
          animationCenter: { x: 176, y: 48 },
        },
      },
      target: {
        ...playerToOpponent.config.target,
        geometry: {
          ...playerToOpponent.config.target.geometry,
          side: "player",
          spriteCorner: { x: 40, y: 62 },
          // `GetBattlerSpriteCoord` for Lickitung's back art is (72,102),
          // while its rendered 64px sheet remains cornered at y=62.
          animationCenter: { x: 72, y: 102 },
        },
      },
    });
    expect(sceneOnSubmissionView({ ...playerToOpponent, age: 7 }))
      .toMatchObject({ attackerOffset: { x2: -7, y2: 1 }, targetOffset: { x2: 6, y2: 1 } });
    expect(sceneOnSubmissionView({ ...opponentToPlayer, age: 7 }))
      .toMatchObject({
        attackerOffset: { x2: -7, y2: 1 },
        targetOffset: { x2: 6, y2: 1 },
        impacts: [{ x: 72, y: 90, animation: 1 }],
      });
    expect(sceneOnSubmissionView({ ...opponentToPlayer, age: 17 }))
      .toMatchObject({
        // The hit-splat X argument mirrors with attacker side, while the
        // literal ellipse widths above intentionally do not.
        impacts: [{ x: 84, y: 110, animation: 1, slot: 4 }],
      });
  });
});
