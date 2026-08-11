import { describe, expect, it } from "vitest";
import {
  sandAttackAccuracyBannerAtAge,
  sandAttackAnimationAtAge,
  sandAttackAttackerX2AtAge,
  sandAttackDirtAtAge,
  type SandAttackAnimationProfile,
} from "../../src/animation/sandAttack.ts";
import {
  createSceneOnMovePresentation,
  PIDGEOTTO_TO_ONIX_SAND_ATTACK_PRESENTATION,
  sceneOnSandAttackView,
} from "../../src/animation/sceneOnPresentation.ts";

const profile: SandAttackAnimationProfile = Object.freeze({
  spriteOrderSeed: Object.freeze(Array.from({ length: 64 }, (_, index) => index)),
  dirt: Object.freeze([
    Object.freeze({ slot: 4, xStep: 1217, yStep: 166 }),
    Object.freeze({ slot: 5, xStep: 1305, yStep: 268 }),
    Object.freeze({ slot: 7, xStep: 1267, yStep: 320 }),
    Object.freeze({ slot: 9, xStep: 1063, yStep: 294 }),
    Object.freeze({ slot: 10, xStep: 1165, yStep: 88 }),
  ]),
});

describe("portable SAND ATTACK presentation", () => {
  it("mirrors the source attacker slide by battle side", () => {
    expect(sandAttackAttackerX2AtAge(50, "opponent")).toBe(0);
    expect(sandAttackAttackerX2AtAge(51, "opponent")).toBe(3);
    expect(sandAttackAttackerX2AtAge(53, "opponent")).toBe(9);
    expect(sandAttackAttackerX2AtAge(51, "player")).toBe(-4);
    expect(sandAttackAttackerX2AtAge(57, "player")).toBe(0);
  });

  it("translates source Q8.8 dirt velocities from attacker-relative geometry", () => {
    expect(sandAttackDirtAtAge(
      55,
      { x: 176, y: 51 },
      "opponent",
      profile,
    )).toEqual([]);
    const opponent = sandAttackDirtAtAge(
      56,
      { x: 176, y: 51 },
      "opponent",
      profile,
    );
    expect(opponent).toHaveLength(5);
    expect(opponent.find(({ slot }) => slot === 4))
      .toEqual({ slot: 4, x: 157, y: 66 });
    const playerProfile = {
      spriteOrderSeed: profile.spriteOrderSeed,
      dirt: profile.dirt.map(({ slot, xStep, yStep }) => ({
        slot,
        xStep: xStep - 1,
        yStep: yStep + 1,
      })),
    };
    const player = sandAttackDirtAtAge(
      56,
      { x: 72, y: 100 },
      "player",
      playerProfile,
    );
    expect(player.find(({ slot }) => slot === 4))
      .toEqual({ slot: 4, x: 91, y: 115 });
    expect(sandAttackDirtAtAge(
      77,
      { x: 176, y: 51 },
      "opponent",
      profile,
    )).toEqual([]);
  });

  it("pins the non-sharp accuracy banner envelope", () => {
    expect(sandAttackAccuracyBannerAtAge(111)).toBeNull();
    expect(sandAttackAccuracyBannerAtAge(112)).toEqual({ eva: 1, bg1Y: -6 });
    expect(sandAttackAccuracyBannerAtAge(130)?.eva).toBe(10);
    expect(sandAttackAccuracyBannerAtAge(151)?.eva).toBe(10);
    expect(sandAttackAccuracyBannerAtAge(152)?.eva).toBe(9);
    expect(sandAttackAccuracyBannerAtAge(170)?.eva).toBe(0);
    expect(sandAttackAccuracyBannerAtAge(172)).toBeNull();
  });

  it("keeps resolved accuracy stages immutable through controller cleanup", () => {
    const controllerProfile = Object.freeze({
      accuracyStageBefore: 6,
      accuracyStageAfter: 5,
      resultTextFirstAge: 183,
      currentMoveResetAge: 275,
    });
    const stage = createSceneOnMovePresentation({
      move: "SAND_ATTACK",
      ...PIDGEOTTO_TO_ONIX_SAND_ATTACK_PRESENTATION,
      fieldProfile: Object.freeze({
        playerHp: 117,
        opponentHp: 156,
        playerStatus: "none" as const,
      }),
      animationProfile: profile,
      controllerProfile,
      moveTextStartAge: 7,
    });
    const before = structuredClone(stage.config);
    expect(sceneOnSandAttackView({ ...stage, age: 51 }))
      .toMatchObject({ attackerX2: 3, currentMove: "SAND_ATTACK" });
    expect(sceneOnSandAttackView({ ...stage, age: 183 }).resultText)
      .toMatchObject({ line1: "ONIX’s accuracy", line2: "fell!", visibleChars: 1 });
    expect(sceneOnSandAttackView({ ...stage, age: 275 }).currentMove).toBeNull();
    expect(stage.config).toEqual(before);
    expect(stage.config.controllerProfile).toBe(controllerProfile);
  });

  it("groups a complete six-wave profile without owning RNG", () => {
    const fullProfile = {
      spriteOrderSeed: Array.from({ length: 64 }, (_, index) => index),
      dirt: Array.from({ length: 30 }, (_, slot) => ({
        slot,
        xStep: 1024,
        yStep: 256,
      })),
    };
    expect(sandAttackAnimationAtAge(
      76,
      { x: 176, y: 51 },
      "opponent",
      fullProfile,
    ).dirt).toHaveLength(30);
  });
});
