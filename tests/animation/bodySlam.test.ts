import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { bodySlamAtAge } from "../../src/animation/bodySlam.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBodySlamView,
  type SceneOnBodySlamConfig,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_BODY_SLAM source-relative reducer", () => {
  const player = (age: number) =>
    bodySlamAtAge(age, "player", { x: 176, y: 42 });
  const opponent = (age: number) =>
    bodySlamAtAge(age, "opponent", { x: 72, y: 88 });

  it("ports VerticalDip and both side-relative offset slides", () => {
    expect([6, 7, 12, 13, 14, 15, 19, 20, 21, 22].map(
      (age) => player(age).attackerOffset.y2,
    )).toEqual([0, 1, 6, 6, 6, 5, 1, 0, 0, 0]);
    expect([36, 37, 38, 39, 40, 41].map(
      (age) => player(age).attackerOffset.x2,
    )).toEqual([5, 10, 15, 20, 25, 25]);
    expect([36, 37, 38, 39, 40, 41].map(
      (age) => opponent(age).attackerOffset.x2,
    )).toEqual([-6, -11, -16, -21, -26, -26]);
    expect([47, 48, 49, 50].map(
      (age) => player(age).targetOffset.x2,
    )).toEqual([9, 18, 27, 27]);
    expect([47, 48, 49, 50].map(
      (age) => opponent(age).targetOffset.x2,
    )).toEqual([-10, -19, -28, -28]);
  });

  it("ports IMPACT, ShakeMonInPlace, both returns, and first clear", () => {
    expect([53, 54, 55, 56, 57, 58, 59, 74, 75].map(
      (age) => player(age).targetOffset.x2,
    )).toEqual([27, 23, 31, 31, 23, 23, 31, 23, 27]);
    expect(player(44).hitsplat).toEqual({
      x: 166, y: 42, animation: 0,
    });
    expect(opponent(44).hitsplat).toEqual({
      x: 82, y: 88, animation: 0,
    });
    expect([88, 89, 90, 91, 92, 93, 94].map(
      (age) => player(age).attackerOffset.x2,
    )).toEqual([20, 16, 12, 8, 4, 0, 0]);
    expect([95, 96, 97, 98, 99, 100].map(
      (age) => opponent(age).targetOffset.x2,
    )).toEqual([-24, -19, -15, -10, -5, -1]);
    expect(player(105).active).toBe(true);
    expect(player(106).active).toBe(false);
  });

  it("exposes only relative age and battler geometry through the seam", () => {
    const config: SceneOnBodySlamConfig = {
      move: "BODY_SLAM",
      attacker: {
        species: "LICKITUNG",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 155, playerMaxHp: 155,
        opponentHp: 110, opponentMaxHp: 110,
      },
    };
    const state = createSceneOnMovePresentation(config);
    expect(sceneOnBodySlamView({ ...state, age: 54 })).toMatchObject({
      age: 54,
      attacker: { species: "LICKITUNG" },
      target: { species: "ONIX" },
      attackerOffset: { x2: 25, y2: 0 },
      targetOffset: { x2: 23, y2: 0 },
      shakeTaskActive: true,
    });
  });

  it("source-audits BODY SLAM and independently rejects its siblings", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/bodySlamSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain('"move":"MOVE_BODY_SLAM"');
    expect(output).toContain('"MOVE_RETURN":"unsupported:');
    expect(output).toContain('"MOVE_FLATTER":"unsupported:');
    expect(output).toContain('"MOVE_WEATHER_BALL":"outside Factory and unsupported:');
  });
});
