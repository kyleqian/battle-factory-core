import { describe, expect, it } from "vitest";
import {
  RECYCLE_FIRST_INACTIVE_AGE,
  RECYCLE_TAG,
  RECYCLE_WINDOW_ROWS,
  recycleAtAge,
  type RecycleProfile,
} from "../../src/animation/recycle.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRecycleView,
  type SceneOnRecycleConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const profile: RecycleProfile = {
  attackerTop: 81,
  attackerSubpriority: 30,
  spriteSlot: 3,
  matrixNum: 0,
  attackerPaletteIdPlusOne: 257,
};

function config(): SceneOnRecycleConfig {
  return {
    move: "RECYCLE",
    attacker: {
      // The reducer is species-agnostic. Keep this seam-only unit harness on
      // already-renderable species until the separate art/compositor round.
      species: "ONIX",
      geometry: {
        side: "player",
        spriteCorner: { x: 40, y: 58 },
        animationCenter: { x: 72, y: 90 },
        battlePositionCenter: { x: 72, y: 80 },
      },
    },
    target: {
      species: "MAGBY",
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

describe("MOVE_RECYCLE pure reducer and typed Scene-ON seam", () => {
  it("ports the source script, rotating ObjBlend arrow, and BlendMonInAndOut", () => {
    expect(RECYCLE_WINDOW_ROWS).toBe(203);
    expect(recycleAtAge(0, "player", { x: 72, y: 90 }, profile)).toMatchObject({
      active: true,
      source: { offset: 0, wait: 0 },
      resources: { recycleLoaded: false },
      sprite: null,
    });
    expect(recycleAtAge(7, "player", { x: 72, y: 90 }, profile)).toMatchObject({
      source: { offset: 10, wait: 1 },
      registers: { bldcnt: 16192, bldalpha: [0, 16] },
    });
    expect(recycleAtAge(10, "player", { x: 72, y: 90 }, profile).sprite).toMatchObject({
      template: "gRecycleSpriteTemplate",
      callback: "AnimRecycle_Step",
      x: 72,
      y: 81,
      subpriority: 28,
      matrix: [251, 49, -49, 251],
      data: [1, 0, 0, 0, 0, 0, 0, 16],
      attr: [1329, 49192, 31025],
    });
    expect(recycleAtAge(73, "player", { x: 72, y: 90 }, profile).registers.bldalpha).toEqual([16, 0]);
    expect(recycleAtAge(83, "player", { x: 72, y: 90 }, profile).sprite?.data).toEqual([0, 0, 2, 0, 0, 0, 16, 0]);
    expect(recycleAtAge(147, "player", { x: 72, y: 90 }, profile).sprite?.data).toEqual([0, 32, 3, 0, 0, 0, 0, 16]);
    expect(recycleAtAge(148, "player", { x: 72, y: 90 }, profile).sprite).toBeNull();
    expect(recycleAtAge(149, "player", { x: 72, y: 90 }, profile).blendTask?.data).toEqual([257, 32767, 0, 12, 1, 2, 0, 1]);
    expect(recycleAtAge(172, "player", { x: 72, y: 90 }, profile).blendTask?.data).toEqual([257, 32767, 12, 12, 0, 2, 1, 1]);
    expect(recycleAtAge(195, "player", { x: 72, y: 90 }, profile).blendTask?.data).toEqual([257, 32767, 1, 12, 1, 2, 1, 1]);
    expect(recycleAtAge(197, "player", { x: 72, y: 90 }, profile)).toMatchObject({
      source: { offset: 51, wait: 1 },
      monBg: "clearing",
      registers: { bldcnt: 0, bldalpha: [0, 0] },
    });
    expect(recycleAtAge(RECYCLE_FIRST_INACTIVE_AGE, "player", { x: 72, y: 90 }, profile)).toMatchObject({
      active: false,
      resources: { recycleLoaded: false, tileTags: [], paletteTags: [] },
      monBg: "inactive",
      visualTaskCount: 0,
      soundTaskCount: 0,
    });
    expect(RECYCLE_TAG).toBe(10278);
  });

  it("uses attacker-side panning and clamps the source top coordinate", () => {
    const opponent = recycleAtAge(10, "opponent", { x: 176, y: 42 }, {
      ...profile,
      attackerTop: 8,
      attackerSubpriority: 40,
      attackerPaletteIdPlusOne: 273,
    });
    expect(opponent.sprite).toMatchObject({ x: 176, y: 16, subpriority: 38, attr: [1520, 49296, 31025] });
    expect(opponent.audio).toMatchObject({ pan: 63, starts: [10] });
  });

  it("reproduces source state through the narrow typed Scene-ON seam", () => {
    const presentation = createSceneOnMovePresentation(config());
    const reduced = recycleAtAge(149, "player", { x: 72, y: 90 }, profile);
    const view = sceneOnRecycleView({ ...presentation, age: 149 });
    const { attacker: _attacker, target: _target, ...seam } = view;
    expect(seam).toEqual(reduced);
  });

  it("does not activate for Recover, Agility, or item gameplay state", () => {
    const presentation = createSceneOnMovePresentation(config());
    for (const move of ["RECOVER", "AGILITY"] as const) {
      const wrong = { ...presentation, config: { ...presentation.config, move } } as unknown as Parameters<typeof sceneOnRecycleView>[0];
      expect(() => sceneOnRecycleView(wrong)).toThrow(`expected RECYCLE presentation, got ${move}`);
    }
  });
});
