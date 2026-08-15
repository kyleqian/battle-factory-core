import { describe, expect, it } from "vitest";
import {
  GIGA_DRAIN_BODY_LAST_AGE,
  GIGA_DRAIN_HEALING_FIRST_AGE,
  GIGA_DRAIN_ORB_FIRST_AGE,
  GIGA_DRAIN_ORB_GROUPS,
  GIGA_DRAIN_ORB_GROUP_SPAWN_PERIOD,
  gigaDrainAtAge,
  gigaDrainSpritesBackToFrontAtAge,
} from "../../src/animation/gigaDrain.ts";
import {
  createSceneOnMovePresentation,
  sceneOnGigaDrainView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

const playerAttacker = { x: 72, y: 96 };
const opponentTarget = { x: 176, y: 42 };
const allocatorProfile = {
  hitsplat: 3,
  orbs: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 3, 20, 21, 4, 7, 9, 5, 11, 13],
  stars: [3, 4, 5, 3],
  paletteController: 3,
  orderSeed: [3, 4, 21, 20, 5, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 7],
} as const;

function playerStage() {
  return createSceneOnMovePresentation({
    move: "GIGA_DRAIN" as const,
    attacker: {
      species: "ROSELIA",
      geometry: {
        side: "player" as const,
        spriteCorner: { x: 40, y: 56 },
        animationCenter: playerAttacker,
        battlePositionCenter: { x: 72, y: 80 },
      },
    },
    target: {
      species: "ONIX",
      geometry: {
        side: "opponent" as const,
        spriteCorner: { x: 144, y: 10 },
        animationCenter: opponentTarget,
        battlePositionCenter: { x: 176, y: 40 },
      },
    },
    healingCenter: playerAttacker,
    absorptionCenter: playerAttacker,
    allocatorProfile,
    fieldProfile: {
      playerHp: 135, playerMaxHp: 146,
      opponentHp: 110, opponentMaxHp: 110,
      playerGender: "male", opponentGender: "male",
    },
  });
}

describe("MOVE_GIGA_DRAIN source-relative reducer", () => {
  it("ports all eight source groups and the literal six-pass cadence", () => {
    expect(GIGA_DRAIN_ORB_GROUPS).toHaveLength(8);
    for (let group = 0; group < GIGA_DRAIN_ORB_GROUPS.length; group += 1) {
      const age = GIGA_DRAIN_ORB_FIRST_AGE + group * GIGA_DRAIN_ORB_GROUP_SPAWN_PERIOD;
      const state = gigaDrainAtAge(age, opponentTarget, playerAttacker, "player");
      expect(state.sprites.filter((sprite) => sprite.kind === "orb")
        .map((sprite) => sprite.spawnIndex)).toEqual(expect.arrayContaining([
          group * 3, group * 3 + 1, group * 3 + 2,
        ]));
      expect(state.soundRestart).toBe("SE_M_GIGA_DRAIN");
    }
    expect(GIGA_DRAIN_ORB_GROUPS.flat()).toHaveLength(24);
  });

  it("keeps the source impact, ShakeMon, palette, cleanup, and HealingEffect clocks", () => {
    expect(gigaDrainAtAge(38, opponentTarget, playerAttacker, "player"))
      .toMatchObject({ sprites: [{ kind: "hitsplat", frame: 0, xScale: 256 }], soundRestart: "SE_M_ABSORB" });
    expect([42, 43, 44, 45, 46, 47, 48, 49, 50].map((age) =>
      gigaDrainAtAge(age, opponentTarget, playerAttacker, "player").targetY2,
    )).toEqual([0, 0, 5, 5, 0, 0, 5, 5, 0]);
    expect([14, 15, 18, 21, 24, 27, 30, 201, 202, 205, 208, 211, 214, 217].map((age) =>
      gigaDrainAtAge(age, opponentTarget, playerAttacker, "player").bgPaletteBlendY,
    )).toEqual([0, 2, 4, 6, 8, 10, 12, 12, 10, 8, 6, 4, 2, 0]);
    expect(gigaDrainAtAge(GIGA_DRAIN_HEALING_FIRST_AGE, opponentTarget, playerAttacker, "player")
      .sprites[0]).toMatchObject({ kind: "star", x: 72, y: 91 });
    expect(gigaDrainAtAge(GIGA_DRAIN_BODY_LAST_AGE + 1, opponentTarget, playerAttacker, "player"))
      .toMatchObject({ sprites: [], targetOnMonBg: false, splitBgPriorityFoes: false, alpha: null, active: false });
  });

  it("threads bilateral immutable geometry and persistent source order through Scene-ON", () => {
    const stage = playerStage();
    expect(sceneOnGigaDrainView({ ...stage, age: GIGA_DRAIN_ORB_FIRST_AGE }).sprites
      .filter((sprite) => sprite.kind === "orb")).toEqual(expect.arrayContaining([
        expect.objectContaining({ spawnIndex: 0, x: 176, y: 47, x2: -4, y2: 1 }),
        expect.objectContaining({ spawnIndex: 1, x: 181, y: 24, x2: -3, y2: -1 }),
      ]));
    const opponentStage = createSceneOnMovePresentation({
      ...stage.config,
      attacker: {
        species: "ROSELIA",
        geometry: {
          side: "opponent" as const,
          spriteCorner: { x: 144, y: 16 },
          animationCenter: { x: 176, y: 48 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "player" as const,
          spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      healingCenter: { x: 176, y: 48 },
      absorptionCenter: { x: 176, y: 48 },
      fieldProfile: {
        playerHp: 110, playerMaxHp: 110,
        opponentHp: 135, opponentMaxHp: 146,
        playerGender: "male" as const, opponentGender: "male" as const,
      },
    });
    expect(sceneOnGigaDrainView({ ...opponentStage, age: GIGA_DRAIN_HEALING_FIRST_AGE }).sprites[0])
      .toMatchObject({ kind: "star", x: 176, y: 43 });
    expect(gigaDrainSpritesBackToFrontAtAge(
      95, opponentTarget, playerAttacker, "player", playerAttacker, allocatorProfile,
    ).every((sprite) => sprite.kind === "orb" || sprite.kind === "hitsplat")).toBe(true);
  });

  it("draws only through the presentation seam and leaves battle state untouched", () => {
    const stage = playerStage();
    const frame = (age: number) => render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    });
    expect(frame(15)).not.toEqual(frame(16));
    expect(frame(38)).not.toEqual(frame(39));
    expect(frame(56)).not.toEqual(frame(57));
    expect(frame(151)).not.toEqual(frame(152));
    expect(frame(228)).toEqual(frame(229));
  });
});
