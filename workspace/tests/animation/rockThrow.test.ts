import { describe, expect, it } from "vitest";
import {
  ROCK_THROW_ANIMATION_PROFILE,
  ROCK_THROW_ROCK_COUNT,
  ROCK_THROW_ROCK_TABLE,
  ROCK_THROW_SPAWN_STRIDE,
  rockThrowAnimationAtAge,
  rockThrowBg3Y,
  rockThrowDrawOrder,
  rockThrowRockState,
  rockThrowTargetX2,
  rockThrowTargetY2,
  type RockThrowGeometry,
} from "../../src/animation/rockThrow.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRockThrowView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

/** opponent-front ONIX target at animationCenter {176,42}; the rock base is +14. */
const opponentTargetGeometry: RockThrowGeometry = {
  rockOrigin: { x: 176, y: 56 },
};

const attacker: SceneOnPresentationBattler = {
  species: "GRAVELER",
  geometry: {
    side: "player",
    spriteCorner: { x: 40, y: 60 },
    animationCenter: { x: 72, y: 92 },
    battlePositionCenter: { x: 72, y: 80 },
  },
};

const target: SceneOnPresentationBattler = {
  species: "ONIX",
  geometry: {
    side: "opponent",
    spriteCorner: { x: 144, y: 10 },
    animationCenter: { x: 176, y: 42 },
    battlePositionCenter: { x: 176, y: 40 },
  },
};

describe("Move_ROCK_THROW source reducer", () => {
  it("transcribes the five gFallingRockSpriteTemplate argv triples and 8-frame spawn stride", () => {
    expect(ROCK_THROW_ROCK_TABLE).toEqual([
      { xOffset: 0, animNum: 1, velocity: 0 },
      { xOffset: 19, animNum: 1, velocity: 10 },
      { xOffset: -23, animNum: 2, velocity: -10 },
      { xOffset: -15, animNum: 1, velocity: -10 },
      { xOffset: 23, animNum: 2, velocity: 10 },
    ]);
    expect(ROCK_THROW_ROCK_COUNT).toBe(5);
    expect(ROCK_THROW_SPAWN_STRIDE).toBe(8);
  });

  it("runs the displayed BG3-Y shake through the velocity-6 sequence", () => {
    const profile = ROCK_THROW_ANIMATION_PROFILE;
    // The shake is created at the rock anchor (RAM age 3) and its displayed
    // value lags the RAM write one tick (same as ROCK_SLIDE), so the -6
    // blocks land at display ages 6-7, 10-11, 14-15, 18-19.
    expect(rockThrowBg3Y(2, profile)).toBe(0);
    expect(rockThrowBg3Y(5, profile)).toBe(0);
    expect(rockThrowBg3Y(6, profile)).toBe(-6);
    expect(rockThrowBg3Y(7, profile)).toBe(-6);
    expect(rockThrowBg3Y(8, profile)).toBe(0);
    expect(rockThrowBg3Y(9, profile)).toBe(0);
    expect(rockThrowBg3Y(10, profile)).toBe(-6);
    expect(rockThrowBg3Y(15, profile)).toBe(-6);
    expect(rockThrowBg3Y(16, profile)).toBe(0);
    expect(rockThrowBg3Y(19, profile)).toBe(-6);
    expect(rockThrowBg3Y(20, profile)).toBe(0);
  });

  it("spawns rocks on the 8-frame stride with the arc/settle phase geometry", () => {
    const profile = ROCK_THROW_ANIMATION_PROFILE;
    const first = rockThrowRockState(0, 11, profile, opponentTargetGeometry);
    expect(first).not.toBeNull();
    expect(first!.animNum).toBe(1);
    // Each rock's first rendered frame is two displays after its RAM spawn
    // (spawn RAM ages 3/11/19/27/35 -> first display ages 5/13/21/29/37).
    expect(rockThrowRockState(0, 5, profile, opponentTargetGeometry)).not.toBeNull();
    expect(rockThrowRockState(0, 4, profile, opponentTargetGeometry)).toBeNull();
    expect(rockThrowRockState(1, 13, profile, opponentTargetGeometry)?.animNum).toBe(1);
    expect(rockThrowRockState(2, 21, profile, opponentTargetGeometry)?.animNum).toBe(2);
    // Outside the rock's own window the state is null.
    expect(rockThrowRockState(0, 3, profile, opponentTargetGeometry)).toBeNull();
  });

  it("keeps rock geometry pinned to the oracle at sample ages", () => {
    const profile = ROCK_THROW_ANIMATION_PROFILE;
    const at = (age: number) => rockThrowDrawOrder(age, profile, opponentTargetGeometry)
      .map((i) => rockThrowRockState(i, age, profile, opponentTargetGeometry))
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map((r) => ({ x: r.centerX, y: r.centerY, animNum: r.animNum }))
      .sort((a, b) => a.x - b.x || a.y - b.y);
    expect(at(12)).toEqual([{ x: 176, y: 6, animNum: 1 }]);
    expect(at(20)).toEqual([
      { x: 176, y: 49, animNum: 1 },
      { x: 195, y: 6, animNum: 1 },
    ]);
    expect(at(28)).toEqual([
      { x: 153, y: 6, animNum: 2 },
      { x: 176, y: 40, animNum: 1 },
      { x: 195, y: 49, animNum: 1 },
    ]);
    expect(at(60)).toEqual([
      { x: 136, y: 37, animNum: 2 },
      { x: 151, y: 32, animNum: 1 },
      { x: 201, y: 40, animNum: 2 },
      { x: 214, y: 53, animNum: 1 },
    ]);
  });

  it("displays the measured target shake y2 boundary (lead frame at 21, pairs to 57)", () => {
    const profile = ROCK_THROW_ANIMATION_PROFILE;
    expect(rockThrowTargetY2(20, profile)).toBe(0);
    // The framebuffer shows +5 at display ages 21, 24-25, 28-29, ..., 56-57.
    expect(rockThrowTargetY2(21, profile)).toBe(5);
    expect(rockThrowTargetY2(22, profile)).toBe(0);
    expect(rockThrowTargetY2(23, profile)).toBe(0);
    expect(rockThrowTargetY2(24, profile)).toBe(5);
    expect(rockThrowTargetY2(25, profile)).toBe(5);
    expect(rockThrowTargetY2(26, profile)).toBe(0);
    expect(rockThrowTargetY2(56, profile)).toBe(5);
    expect(rockThrowTargetY2(57, profile)).toBe(5);
    expect(rockThrowTargetY2(58, profile)).toBe(0);
    expect(rockThrowTargetY2(86, profile)).toBe(0);
  });

  it("drops the opponent-front idle x2 residual at display age 21", () => {
    const profile = ROCK_THROW_ANIMATION_PROFILE;
    expect(rockThrowTargetX2(0, profile)).toBe(1);
    expect(rockThrowTargetX2(19, profile)).toBe(1);
    expect(rockThrowTargetX2(20, profile)).toBe(1);
    expect(rockThrowTargetX2(21, profile)).toBe(0);
    expect(rockThrowTargetX2(57, profile)).toBe(0);
  });

  it("exposes the move through the typed Scene-ON rock-throw seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "ROCK_THROW",
      attacker,
      target,
      animationProfile: ROCK_THROW_ANIMATION_PROFILE,
      fieldProfile: {
        playerHp: 148,
        playerMaxHp: 151,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    const view = sceneOnRockThrowView({ ...stage, age: 20 });
    expect(view.attacker).toBe(attacker);
    expect(view.target).toBe(target);
    expect(view.bg3Y).toBe(0);
    expect(view.targetY2).toBe(0);
    expect(view.targetX2).toBe(1);
    expect(view.rocks.length).toBeGreaterThan(0);
    expect(view).not.toHaveProperty("damage");
    expect(view).not.toHaveProperty("statStage");
  });

  it("composites the full animation state without owning gameplay state", () => {
    const state = rockThrowAnimationAtAge(30, ROCK_THROW_ANIMATION_PROFILE, opponentTargetGeometry);
    expect(state).toEqual({
      bg3Y: rockThrowBg3Y(30, ROCK_THROW_ANIMATION_PROFILE),
      targetY2: rockThrowTargetY2(30, ROCK_THROW_ANIMATION_PROFILE),
      targetX2: rockThrowTargetX2(30, ROCK_THROW_ANIMATION_PROFILE),
      rocks: expect.any(Array),
    });
    expect(state.rocks.length).toBeGreaterThanOrEqual(3);
  });
});
