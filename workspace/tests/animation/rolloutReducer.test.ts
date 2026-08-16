import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  ROLLOUT_DEFENSE_CURL_POWERS,
  ROLLOUT_DYNAMIC_POWERS,
  ROLLOUT_PARTICLE_CREATION_COUNTS,
  ROLLOUT_SHAKE_AMPLITUDES,
  rolloutAtAge,
} from "../../src/animation/rollout.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRolloutView,
  type SceneOnRolloutConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const geometry = {
  side: "player" as const,
  attackerStart: { x: 72, y: 104 },
  targetEnd: { x: 176, y: 64 },
  attackerSpriteSlot: 6,
  targetSpriteSlot: 8,
  targetBaseX2: 1,
  targetBaseY2: 0,
};

const battler = (side: "player" | "opponent") => ({
  species: "VOLTORB" as const,
  geometry: {
    side,
    spriteCorner: { x: 0, y: 0 },
    animationCenter: { x: 0, y: 0 },
    battlePositionCenter: { x: 0, y: 0 },
  },
});

describe("MOVE_ROLLOUT source-relative reducer and typed Scene-ON seam", () => {
  it("pins all five counter inputs, source phases, and cleanup", () => {
    expect(Object.values(ROLLOUT_DYNAMIC_POWERS)).toEqual([30, 60, 120, 240, 480]);
    expect(Object.values(ROLLOUT_DEFENSE_CURL_POWERS)).toEqual([60, 120, 240, 480, 960]);
    expect(Object.values(ROLLOUT_SHAKE_AMPLITUDES)).toEqual([2, 5, 10, 16, 16]);
    expect(Object.values(ROLLOUT_PARTICLE_CREATION_COUNTS)).toEqual([10, 10, 12, 16, 8]);
    expect(rolloutAtAge(13, 1, geometry).rolloutTask?.data).toEqual([
      0, 1, 576, 832, 26, -10, -26, 10, 32, 1, 3, 0, 1, -64, 3, 6,
    ]);
    expect(rolloutAtAge(102, 1, geometry).shakeTask?.data).toEqual([
      1, 1, 30, 0, 0, 0, 0, 8, 1, 0, 1, 0, 0, 1, 1, 2,
    ]);
    expect(rolloutAtAge(166, 1, geometry)).toMatchObject({
      active: false,
      particles: [],
      rolloutTask: null,
      shakeTask: null,
      monbgTask: null,
      clearMonBgTask: null,
      registers: { bldcnt: 0, bldalpha: 0, monbgLayer: null },
      visualTaskCount: 0,
      soundTaskCount: 0,
    });
  });

  it("keeps counter and orientation in the typed seam without gameplay state", () => {
    const config: SceneOnRolloutConfig = {
      move: "ROLLOUT",
      attacker: battler("player"),
      target: battler("opponent"),
      fieldProfile: {
        playerHp: 100,
        playerMaxHp: 100,
        opponentHp: 100,
        opponentMaxHp: 100,
        playerGender: "male",
        opponentGender: "male",
      },
      counter: 3,
      animationProfile: geometry,
    };
    const view = sceneOnRolloutView({
      ...createSceneOnMovePresentation(config),
      age: 54,
    });
    expect(view.rolloutTask?.data.slice(0, 10)).toEqual([
      3, 3, 644, 806, 34, -13, 0, 0, 22, 0,
    ]);
    expect(view.particles).toHaveLength(1);
    expect(view.particles[0]).toMatchObject({
      template: "gRolloutRockSpriteTemplate",
      tileOffset: 80,
    });
    expect("damage" in view).toBe(false);
    expect("rng" in view).toBe(false);
  });

  it("replays the complete retained bilateral corpus through reducer and seam", () => {
    const summary = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/verifyRolloutReducer.ts",
    ], { encoding: "utf8" }));
    for (const orientation of ["player-back", "opponent-front"]) {
      expect(summary[orientation]).toMatchObject({
        reducerRows: 793,
        seamRows: 793,
        lifecycle: {
          gRolloutMudSpriteTemplate: 10,
          gRolloutRockSpriteTemplate: 46,
        },
        cleanup: { age: 166, active: false, visualTasks: 0, soundTasks: 0 },
      });
    }
  });
});
