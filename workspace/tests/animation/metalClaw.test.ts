import { describe, expect, it } from "vitest";
import {
  METAL_CLAW_SLASH_1_AGE,
  METAL_CLAW_SLASH_2_AGE,
  metalClawAtAge,
  metalClawSlashesAtAge,
  metalClawTargetGlobalY,
} from "../../src/animation/metalClaw.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMetalClawView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

const playerGeometry = {
  attackerSide: "player" as const,
  attackerCenter: { x: 72, y: 94 },
  targetCenter: { x: 176, y: 42 },
};

describe("MOVE_METAL_CLAW source reducer", () => {
  it("reuses the accepted non-permanent MetallicShine unchanged", () => {
    expect(metalClawAtAge(0, playerGeometry).metallic).toMatchObject({
      active: true,
      data10: 0,
      data11: 0,
      bg1X: 24,
      metalBgLoaded: true,
      attackerGrayscale: true,
    });
    expect(metalClawAtAge(1, playerGeometry).metallic).toMatchObject({
      data10: 4,
      bg1X: 20,
    });
    expect(metalClawAtAge(64, playerGeometry).metallic).toMatchObject({
      data10: 0,
      data11: 2,
      metalBgLoaded: false,
      attackerGrayscale: false,
    });
    expect(metalClawAtAge(96, playerGeometry).metallic).toMatchObject({
      active: false,
      data11: 3,
    });
  });

  it("strikes with two 6x4 horizontal lunges after the shine body", () => {
    // The shine sweep runs ages 0..95; the two strikes then each perform a
    // 6-step 4px/frame lunge with a two-frame peak hold before the return.
    expect(metalClawAtAge(97, playerGeometry).attackerOffset).toEqual({
      x2: 0,
      y2: 0,
    });
    expect(metalClawAtAge(99, playerGeometry).attackerOffset.x2).toBe(4);
    expect(metalClawAtAge(103, playerGeometry).attackerOffset.x2).toBe(20);
    expect(metalClawAtAge(104, playerGeometry).attackerOffset.x2).toBe(24);
    expect(metalClawAtAge(106, playerGeometry).attackerOffset.x2).toBe(24);
    expect(metalClawAtAge(109, playerGeometry).attackerOffset.x2).toBe(12);
    expect(metalClawAtAge(112, playerGeometry).attackerOffset.x2).toBe(0);
    // Second strike begins as the first helper is destroyed.
    expect(metalClawAtAge(113, playerGeometry).attackerOffset.x2).toBe(4);
    expect(metalClawAtAge(119, playerGeometry).attackerOffset.x2).toBe(24);
    expect(metalClawAtAge(126, playerGeometry).attackerOffset.x2).toBe(0);
    expect(metalClawAtAge(127, playerGeometry).attackerOffset.x2).toBe(0);
  });

  it("negates the lunge for an opponent-side attacker", () => {
    const opponent = metalClawAtAge(103, {
      ...playerGeometry,
      attackerSide: "opponent",
    });
    expect(opponent.attackerOffset.x2).toBe(-20);
  });

  it("spawns the paired claw slashes at the target with the 5-frame slash anim", () => {
    expect(metalClawSlashesAtAge(METAL_CLAW_SLASH_1_AGE - 1, playerGeometry.targetCenter))
      .toEqual([]);
    const first = metalClawSlashesAtAge(METAL_CLAW_SLASH_1_AGE, playerGeometry.targetCenter);
    expect(first).toHaveLength(2);
    expect(first[0]).toMatchObject({
      x: 166,
      y: 32,
      animation: 0,
      animationFrame: 0,
    });
    expect(first[1]).toMatchObject({
      x: 166,
      y: 52,
      animation: 0,
      animationFrame: 0,
    });
    expect(metalClawSlashesAtAge(
      METAL_CLAW_SLASH_1_AGE + 3,
      playerGeometry.targetCenter,
    )[0]!.animationFrame).toBe(1);
    expect(metalClawSlashesAtAge(
      METAL_CLAW_SLASH_1_AGE + 15,
      playerGeometry.targetCenter,
    )[0]!.animationFrame).toBe(4);
    // The first group's slash art lives 21 frames (local 0..20); at local 20
    // the second strike has already spawned, so both groups overlap there.
    expect(metalClawSlashesAtAge(
      METAL_CLAW_SLASH_1_AGE + 20,
      playerGeometry.targetCenter,
    )).toHaveLength(4);
    expect(metalClawSlashesAtAge(
      METAL_CLAW_SLASH_1_AGE + 21,
      playerGeometry.targetCenter,
    )).toHaveLength(2);
    // Second strike mirrors horizontally (animation=1, x=+10); it spawns
    // while the first group is still animating, so the last two entries are
    // the second group.
    const second = metalClawSlashesAtAge(METAL_CLAW_SLASH_2_AGE, playerGeometry.targetCenter);
    expect(second).toHaveLength(4);
    expect(second[2]!.animation).toBe(1);
    expect(second[2]!.x).toBe(186);
    expect(second[3]!.y).toBe(52);
  });

  it("drives gSpriteCoordOffsetY through the 10-step pairwise shake", () => {
    const local = (l: number) => metalClawTargetGlobalY(METAL_CLAW_SLASH_1_AGE + l);
    expect(local(-1)).toBe(0);
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(local)).toEqual([
      0, 4, 4, 0, 0, 4, 4, 0, 0, 4, 0,
    ]);
    expect(local(11)).toBe(0);
    // The second strike repeats the same shake body.
    expect(metalClawTargetGlobalY(METAL_CLAW_SLASH_2_AGE + 1)).toBe(4);
    expect(metalClawTargetGlobalY(METAL_CLAW_SLASH_2_AGE + 10)).toBe(0);
  });

  it("crosses the typed seam without owning damage or stat stages", () => {
    const attacker: SceneOnPresentationBattler = {
      species: "CHARMANDER",
      geometry: {
        side: "player" as const,
        spriteCorner: { x: 40, y: 62 },
        animationCenter: { x: 72, y: 94 },
        battlePositionCenter: { x: 72, y: 80 },
      },
    };
    const target: SceneOnPresentationBattler = {
      species: "ONIX",
      geometry: {
        side: "opponent" as const,
        spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 176, y: 42 },
        battlePositionCenter: { x: 176, y: 40 },
      },
    };
    const stage = createSceneOnMovePresentation({
      move: "METAL_CLAW",
      attacker,
      target,
      fieldProfile: {
        playerHp: 121,
        playerMaxHp: 135,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
      attackerSpriteCenter: { x: 72, y: 94 },
    });
    const view = sceneOnMetalClawView({ ...stage, age: 105 });
    expect(view.attacker).toBe(attacker);
    expect(view.target).toBe(target);
    expect(view.attackerOffset.x2).toBe(24);
    expect(view.slashes).toHaveLength(2);
    expect(view.slashes[0]!.animationFrame).toBe(0);
    expect(view.soundEvents).toEqual([]);
    const strike = sceneOnMetalClawView({ ...stage, age: 103 });
    expect(strike.soundEvents).toEqual([{
      age: 103,
      song: "SE_M_RAZOR_WIND",
      pan: 63,
    }]);
    expect(view).not.toHaveProperty("damage");
    expect(view).not.toHaveProperty("statStage");
  });
});
