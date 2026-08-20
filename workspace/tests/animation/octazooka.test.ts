import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  OCTAZOOKA_FIRST_INACTIVE_AGE,
  OCTAZOOKA_WINDOW_ROWS,
  octazookaAtAge,
  type OctazookaProfile,
} from "../../src/animation/octazooka.ts";
import {
  createSceneOnMovePresentation,
  sceneOnOctazookaView,
  type SceneOnOctazookaConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const palette = Array.from({ length: 512 }, (_, index) => index);
const profile: OctazookaProfile = {
  animationRngAtAge0: 1685842731,
  ballSpriteSlot: 3,
  smokeSpriteSlots: [3, 4, 5, 7],
  targetSubpriority: 38,
  oam: { ballAttr2: 35121, smokeAttr2: 31257 },
  palette: {
    unfadedAtAge0: palette,
    fadedAtAge0: palette,
    hardwareAtAge0: palette,
    unfadedAfterGraySmokeLoad: palette,
    fadedAfterGraySmokeLoad: palette,
    unfadedAfterBlackBallLoad: palette,
    fadedAfterBlackBallLoad: palette,
  },
};

function config(): SceneOnOctazookaConfig {
  return {
    move: "OCTAZOOKA",
    attacker: {
      species: "OCTILLERY",
      geometry: {
        side: "player",
        spriteCorner: { x: 40, y: 66 },
        animationCenter: { x: 72, y: 98 },
        battlePositionCenter: { x: 72, y: 80 },
      },
    },
    target: {
      species: "ONIX",
      geometry: {
        side: "opponent",
        spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 176, y: 42 },
        battlePositionCenter: { x: 176, y: 40 },
      },
    },
    fieldProfile: {
      playerHp: 100,
      playerMaxHp: 100,
      opponentHp: 100,
      opponentMaxHp: 100,
    },
    animationProfile: profile,
  };
}

describe("MOVE_OCTAZOOKA pure reducer and typed Scene-ON seam", () => {
  it("ports the source cursor, 20-callback BLACK_BALL, and delayed smoke lifecycles", () => {
    const player = (age: number) => octazookaAtAge(
      age,
      "player",
      { x: 72, y: 98 },
      "opponent",
      { x: 176, y: 42 },
      profile,
    );
    expect(OCTAZOOKA_WINDOW_ROWS).toBe(80);
    expect(player(1)).toMatchObject({
      source: { offset: 3, wait: 1 },
      resources: { graySmokeLoaded: true, blackBallLoaded: false },
    });
    expect(player(7).sprites).toEqual([expect.objectContaining({
      template: "gOctazookaBallSpriteTemplate",
      callback: "AnimTranslateLinear_WithFollowup",
      x: 92,
      y: 98,
      x2: 4,
      y2: -2,
      data: [19, 1074, 717, 1074, 717, 0, 15357, 2058],
      attr: [92, 92, 35121],
    })]);
    expect(player(27).sprites[0]).toMatchObject({ callback: "DestroyAnimSprite", data: [0, 1074, 717, 21480, 14340, 0, 15357, 2058] });
    expect(player(28).sprites).toEqual([]);
    expect(player(29)).toMatchObject({
      source: { offset: 51, wait: 2, args: [8, 8, 1, 0, 20, 0, 0, 0] },
      sprites: [expect.objectContaining({
        template: "gOctazookaSmokeSpriteTemplate",
        x: 184,
        y: 50,
        attr: [34, 32936, 31257],
      })],
    });
    expect(player(41).sprites).toHaveLength(4);
    expect(player(43).sprites.map((sprite) => sprite.attr[2])).toEqual([31321, 31305, 31289, 31273]);
    expect(player(56).sprites).toEqual([]);
    expect(player(OCTAZOOKA_FIRST_INACTIVE_AGE)).toMatchObject({
      active: false,
      sprites: [],
      resources: { graySmokeLoaded: false, blackBallLoaded: false },
      audio: { active: false, status: 0x80000000 },
    });
  });

  it("reproduces every retained bilateral component row through the typed seam", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/octazookaReducerAudit.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(audit).toMatchObject({
      schema: "octazooka-reducer-audit/v1",
      framebufferCompared: false,
      "player-back": {
        reducerRows: 80,
        typedSeamRows: 80,
        lifecycle: { creates: 5, destroys: 5, ball: 1, graySmoke: 4 },
        cleanup: { age: 79, active: false, sprites: 0, resources: 0 },
      },
      "opponent-front": {
        reducerRows: 80,
        typedSeamRows: 80,
        lifecycle: { creates: 5, destroys: 5, ball: 1, graySmoke: 4 },
        cleanup: { age: 79, active: false, sprites: 0, resources: 0 },
      },
    });
  });

  it("does not activate for Mist or Smokescreen", () => {
    const state = createSceneOnMovePresentation(config());
    for (const move of ["MIST", "SMOKESCREEN"] as const) {
      const wrong = { ...state, config: { ...state.config, move } } as unknown as Parameters<typeof sceneOnOctazookaView>[0];
      expect(() => sceneOnOctazookaView(wrong)).toThrow(`expected OCTAZOOKA presentation, got ${move}`);
    }
  });

  it("activates from typed side and geometry rather than the Octillery/Onix evidence pair", () => {
    const generic: SceneOnOctazookaConfig = {
      ...config(),
      attacker: {
        species: "ARON",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 145, y: 14 },
          animationCenter: { x: 177, y: 46 },
          battlePositionCenter: { x: 177, y: 42 },
        },
      },
      target: {
        species: "GROVYLE",
        geometry: {
          side: "player",
          spriteCorner: { x: 38, y: 58 },
          animationCenter: { x: 70, y: 90 },
          battlePositionCenter: { x: 70, y: 80 },
        },
      },
    };
    const view = sceneOnOctazookaView({
      ...createSceneOnMovePresentation(generic),
      age: 7,
    });
    expect(view).toMatchObject({
      attacker: { species: "ARON", geometry: { side: "opponent" } },
      target: { species: "GROVYLE", geometry: { side: "player" } },
      sprites: [expect.objectContaining({ x: 157, y: 46, x2: -4, y2: 2 })],
    });
  });
});
