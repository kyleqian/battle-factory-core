import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  LOVELY_KISS_FIRST_INACTIVE_AGE,
  LOVELY_KISS_WINDOW_ROWS,
  lovelyKissAtAge,
  type LovelyKissProfile,
} from "../../src/animation/lovelyKiss.ts";
import {
  createSceneOnMovePresentation,
  sceneOnLovelyKissView,
  type SceneOnLovelyKissConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const palette = Array.from({ length: 512 }, (_, index) => index);
const profile: LovelyKissProfile = {
  animationRngAtAge0: 254129500,
  devilSpriteSlot: 3,
  heartSpriteSlots: [3, 4, 5, 7],
  targetSubpriority: 40,
  palette: {
    unfadedAtAge0: palette,
    fadedAtAge0: palette,
    hardwareAtAge0: palette,
    unfadedAfterPinkHeartLoad: palette,
    fadedAfterPinkHeartLoad: palette,
    unfadedAfterDevilLoad: palette,
    fadedAfterDevilLoad: palette,
  },
};

function config(): SceneOnLovelyKissConfig {
  return {
    move: "LOVELY_KISS",
    attacker: {
      species: "JYNX",
      geometry: {
        side: "player",
        spriteCorner: { x: 40, y: 58 },
        animationCenter: { x: 72, y: 90 },
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

describe("MOVE_LOVELY_KISS pure reducer and typed Scene-ON seam", () => {
  it("ports the Devil and four Pink Heart callback lifecycles deterministically", () => {
    expect(LOVELY_KISS_WINDOW_ROWS).toBe(153);
    expect(lovelyKissAtAge(6, "opponent", { x: 176, y: 42 }, profile).sprites).toEqual([]);
    expect(lovelyKissAtAge(7, "opponent", { x: 176, y: 42 }, profile).sprites[0]).toMatchObject({
      template: "gDevilSpriteTemplate",
      callback: "AnimDevil",
      x: 176,
      y: 18,
      x2: 29,
      y2: 1,
      data: [2, 8, 1, 2, 0, 0, 0, 0],
    });
    expect(lovelyKissAtAge(96, "opponent", { x: 176, y: 42 }, profile).sprites).toEqual([]);
    expect(lovelyKissAtAge(97, "opponent", { x: 176, y: 42 }, profile).sprites).toHaveLength(4);
    expect(lovelyKissAtAge(120, "opponent", { x: 176, y: 42 }, profile).sprites.map((sprite) => sprite.data[3]))
      .toEqual([36, 86, 55, 9]);
    expect(lovelyKissAtAge(150, "opponent", { x: 176, y: 42 }, profile).sprites.every((sprite) => sprite.data[5] === 30)).toBe(true);
    expect(lovelyKissAtAge(151, "opponent", { x: 176, y: 42 }, profile).sprites).toEqual([]);
    expect(lovelyKissAtAge(LOVELY_KISS_FIRST_INACTIVE_AGE, "opponent", { x: 176, y: 42 }, profile)).toMatchObject({
      active: false,
      visualTaskCount: 0,
      resources: { pinkHeartLoaded: false, devilLoaded: false },
    });
  });

  it("reproduces every retained bilateral component row through the typed seam", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/lovelyKissReducerAudit.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(audit).toMatchObject({
      schema: "lovely-kiss-reducer-audit/v1",
      framebufferCompared: false,
      "player-back": {
        reducerRows: 153,
        typedSeamRows: 153,
        lifecycle: { creates: 5, destroys: 5, devil: 1, pinkHearts: 4 },
        cleanup: { age: 152, active: false, sprites: 0, resources: 0 },
      },
      "opponent-front": {
        reducerRows: 153,
        typedSeamRows: 153,
        lifecycle: { creates: 5, destroys: 5, devil: 1, pinkHearts: 4 },
        cleanup: { age: 152, active: false, sprites: 0, resources: 0 },
      },
    });
  });

  it("does not activate for Sweet Kiss, Attract, or sleep-family presentation", () => {
    const state = createSceneOnMovePresentation(config());
    for (const move of ["SWEET_KISS", "ATTRACT", "SLEEP_POWDER"] as const) {
      const wrong = { ...state, config: { ...state.config, move } } as unknown as Parameters<typeof sceneOnLovelyKissView>[0];
      expect(() => sceneOnLovelyKissView(wrong)).toThrow(`expected LOVELY_KISS presentation, got ${move}`);
    }
    expect(sceneOnLovelyKissView({ ...state, age: 97 }).sprites).toHaveLength(4);
  });
});
