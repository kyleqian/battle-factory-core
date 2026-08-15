import { describe, expect, it } from "vitest";
import {
  MEGA_DRAIN_HEALING_FIRST_AGE,
  MEGA_DRAIN_ORB_FIRST_AGE,
  MEGA_DRAIN_ORB_PAIR_SPAWN_PERIOD,
  MEGA_DRAIN_ORB_PAIRS,
  megaDrainAtAge,
  megaDrainSpritesBackToFrontAtAge,
} from "../../src/animation/megaDrain.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMegaDrainView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

const playerAttacker = { x: 72, y: 101 };
const opponentTarget = { x: 176, y: 42 };

const allocatorProfile = {
  hitsplat: 3,
  orbs: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 3, 15, 4, 5, 10, 16],
  stars: [3, 4, 5, 3],
  paletteController: 3,
  orderSeed: [4, 3, 5, 16, 15, 14, 13, 12, 11, 10, 9, 7],
} as const;

function playerStage() {
  return createSceneOnMovePresentation({
    move: "MEGA_DRAIN" as const,
    attacker: {
      species: "SKIPLOOM",
      geometry: {
        side: "player" as const, spriteCorner: { x: 40, y: 61 },
        animationCenter: playerAttacker, battlePositionCenter: { x: 72, y: 80 },
      },
    },
    target: {
      species: "ONIX",
      geometry: {
        side: "opponent" as const, spriteCorner: { x: 144, y: 10 },
        animationCenter: opponentTarget, battlePositionCenter: { x: 176, y: 40 },
      },
    },
    healingCenter: playerAttacker,
    absorptionCenter: playerAttacker,
    allocatorProfile,
    fieldProfile: {
      playerHp: 151, playerMaxHp: 151,
      opponentHp: 110, opponentMaxHp: 110,
      playerGender: "male", opponentGender: "male",
    },
  });
}

describe("MOVE_MEGA_DRAIN source-relative reducer", () => {
  it("ports all eight paired source commands and their six-pass cadence", () => {
    expect(MEGA_DRAIN_ORB_PAIRS).toEqual([
      [{ x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 }, { x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 }],
      [{ x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 }, { x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 }],
      [{ x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 }, { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 }],
      [{ x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 }, { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 }],
      [{ x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 }, { x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 }],
      [{ x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 }, { x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 }],
      [{ x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 }, { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 }],
      [{ x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 }, { x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 }],
    ]);
    for (let pair = 0; pair < MEGA_DRAIN_ORB_PAIRS.length; pair++) {
      const state = megaDrainAtAge(
        MEGA_DRAIN_ORB_FIRST_AGE + pair * MEGA_DRAIN_ORB_PAIR_SPAWN_PERIOD,
        opponentTarget, playerAttacker, "player",
      );
      expect(state.sprites.filter((sprite) => sprite.kind === "orb")
        .map((sprite) => sprite.spawnIndex)).toContain(pair * 2);
      expect(state.sprites.filter((sprite) => sprite.kind === "orb")
        .map((sprite) => sprite.spawnIndex)).toContain(pair * 2 + 1);
      expect(state.soundRestart).toBe("SE_M_BUBBLE3");
    }
  });

  it("uses the paired target-to-attacker source arc without Absorb's age", () => {
    expect(megaDrainAtAge(
      MEGA_DRAIN_ORB_FIRST_AGE, opponentTarget, playerAttacker, "player",
    ).sprites.filter((sprite) => sprite.kind === "orb")).toEqual([
      expect.objectContaining({ spawnIndex: 0, x: 176, y: 47, x2: -4, y2: 2 }),
      expect.objectContaining({ spawnIndex: 1, x: 181, y: 24, x2: -3, y2: 0 }),
    ]);
  });

  it("owns impact animation 1, its later ShakeMon, palette body, and HealingEffect", () => {
    expect(megaDrainAtAge(32, opponentTarget, playerAttacker, "player"))
      .toMatchObject({
        sprites: [{ kind: "hitsplat", frame: 1, xScale: 303 }],
        soundRestart: "SE_M_ABSORB",
      });
    expect([36, 37, 38, 39, 40, 41, 42, 43, 44].map((age) =>
      megaDrainAtAge(age, opponentTarget, playerAttacker, "player").targetY2,
    )).toEqual([0, 0, 5, 5, 0, 0, 5, 5, 0]);
    expect([14, 15, 18, 21, 24, 195, 196, 199, 202, 205].map((age) =>
      megaDrainAtAge(age, opponentTarget, playerAttacker, "player").bgPaletteBlendY,
    )).toEqual([0, 2, 4, 6, 8, 8, 6, 4, 2, 0]);
    expect(megaDrainAtAge(
      MEGA_DRAIN_HEALING_FIRST_AGE, opponentTarget, playerAttacker, "player",
    ).sprites).toContainEqual(expect.objectContaining({
      kind: "star", spawnIndex: 0, x: 72, y: 96,
    }));
    expect(megaDrainAtAge(217, opponentTarget, playerAttacker, "player"))
      .toMatchObject({
        sprites: [], targetX2: 0, targetY2: 0, targetOnMonBg: false,
        splitBgPriorityFoes: false, alpha: null, bgPaletteBlendY: 0,
        active: false,
      });
  });

  it("threads immutable geometry and allocator topology through the narrow Scene-ON seam", () => {
    const stage = playerStage();
    expect(sceneOnMegaDrainView({ ...stage, age: MEGA_DRAIN_ORB_FIRST_AGE })
      .sprites.filter((sprite) => sprite.kind === "orb")).toEqual([
        expect.objectContaining({ spawnIndex: 0, x: 176, y: 47, x2: -4, y2: 2 }),
        expect.objectContaining({ spawnIndex: 1, x: 181, y: 24, x2: -3, y2: 0 }),
      ]);
    expect(sceneOnMegaDrainView({ ...stage, age: MEGA_DRAIN_HEALING_FIRST_AGE })
      .sprites[0]).toMatchObject({ kind: "star", x: 72, y: 96 });

    const opponentStage = createSceneOnMovePresentation({
      ...stage.config,
      attacker: {
        species: "SKIPLOOM",
        geometry: {
          side: "opponent" as const, spriteCorner: { x: 144, y: 11 },
          animationCenter: { x: 176, y: 43 }, battlePositionCenter: { x: 176, y: 40 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "player" as const, spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 },
        },
      },
      healingCenter: { x: 176, y: 43 },
      absorptionCenter: { x: 176, y: 43 },
      fieldProfile: {
        playerHp: 110, playerMaxHp: 110,
        opponentHp: 151, opponentMaxHp: 151,
        playerGender: "male" as const, opponentGender: "male" as const,
      },
    });
    expect(sceneOnMegaDrainView({
      ...opponentStage, age: MEGA_DRAIN_HEALING_FIRST_AGE,
    }).sprites[0]).toMatchObject({ kind: "star", x: 176, y: 38 });
  });

  it("replays the persistent SortSprites order rather than creation or slot order", () => {
    expect(megaDrainSpritesBackToFrontAtAge(
      89, opponentTarget, playerAttacker, "player", playerAttacker, allocatorProfile,
    ).map((sprite) => sprite.spawnIndex)).toEqual([13, 9, 10, 6, 12, 11, 8, 7, 4, 3]);
  });

  it("draws the Scene-ON seams without changing battle ownership", () => {
    const stage = playerStage();
    const frame = (age: number) => render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    });
    expect(frame(15)).not.toEqual(frame(16));
    expect(frame(32)).not.toEqual(frame(33));
    expect(frame(50)).not.toEqual(frame(51));
    expect(frame(145)).not.toEqual(frame(146));
    expect(frame(216)).toEqual(frame(217));
  });
});
