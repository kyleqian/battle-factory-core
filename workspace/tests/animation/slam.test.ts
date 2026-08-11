import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { slamAtAge } from "../../src/animation/slam.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSlamView,
  type SceneOnSlamConfig,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_SLAM source-relative reducer", () => {
  const player = (age: number) =>
    slamAtAge(age, "player", { x: 176, y: 42 });
  const opponent = (age: number) =>
    slamAtAge(age, "opponent", { x: 72, y: 88 });

  it("reuses both source-relative slide helpers in both orientations", () => {
    expect([9, 10, 11, 12, 13, 14].map(
      (age) => player(age).attackerOffset,
    )).toEqual([
      { x2: 0, y2: 0 },
      { x2: 5, y2: 0 },
      { x2: 10, y2: 1 },
      { x2: 15, y2: 2 },
      { x2: 20, y2: 3 },
      { x2: 20, y2: 3 },
    ]);
    expect([10, 11, 12, 13].map(
      (age) => opponent(age).attackerOffset.x2,
    )).toEqual([-5, -10, -15, -20]);
    expect([18, 19, 20, 21, 22].map(
      (age) => player(age).attackerOffset,
    )).toEqual([
      { x2: 16, y2: 2 },
      { x2: 12, y2: 1 },
      { x2: 8, y2: 1 },
      { x2: 4, y2: 0 },
      { x2: 0, y2: 0 },
    ]);
    expect([18, 19, 20, 21].map(
      (age) => player(age).targetOffset,
    )).toEqual([
      { x2: 4, y2: 3 },
      { x2: 8, y2: 6 },
      { x2: 12, y2: 9 },
      { x2: 12, y2: 9 },
    ]);
    expect([18, 19, 20].map(
      (age) => opponent(age).targetOffset.x2,
    )).toEqual([-4, -8, -12]);
  });

  it("ports the SLAM_HIT, IMPACT, shake, return, and cleanup lifecycles", () => {
    expect([12, 13, 14, 15, 17, 18, 20, 21, 27, 28].map(
      (age) => player(age).slamHit?.sheetFrame ?? null,
    )).toEqual([null, 4, 4, 5, 5, 6, 6, 7, 7, null]);
    expect(player(13).slamHit).toMatchObject({
      x: 176, y: 42, hFlip: true,
    });
    expect(opponent(13).slamHit).toMatchObject({
      x: 72, y: 88, hFlip: false,
    });
    expect(player(18).hitsplat).toEqual({
      x: 176, y: 42, animation: 1,
    });
    expect([23, 24, 25, 26, 31, 32].map(
      (age) => player(age).targetOffset,
    )).toEqual([
      { x2: 12, y2: 6 },
      { x2: 12, y2: 12 },
      { x2: 12, y2: 12 },
      { x2: 12, y2: 6 },
      { x2: 12, y2: 6 },
      { x2: 12, y2: 9 },
    ]);
    expect([40, 41, 42, 43, 44, 45].map(
      (age) => opponent(age).targetOffset,
    )).toEqual([
      { x2: -10, y2: 7 },
      { x2: -8, y2: 6 },
      { x2: -6, y2: 4 },
      { x2: -4, y2: 3 },
      { x2: -2, y2: 1 },
      { x2: 0, y2: 0 },
    ]);
    expect(player(46)).toMatchObject({
      monbgActive: true, alpha: { eva: 12, evb: 8 }, active: true,
    });
    expect(player(47)).toMatchObject({
      monbgActive: false, alpha: null, active: true,
    });
    expect(player(52).active).toBe(true);
    expect(player(53).active).toBe(false);
  });

  it("exposes relative age and immutable geometry through the typed seam", () => {
    const config: SceneOnSlamConfig = {
      move: "SLAM",
      attacker: {
        species: "LICKITUNG",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 62 },
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
        playerHp: 185, playerMaxHp: 197,
        opponentHp: 131, opponentMaxHp: 131,
      },
    };
    const state = createSceneOnMovePresentation(config);
    expect(sceneOnSlamView({ ...state, age: 23 })).toMatchObject({
      age: 23,
      attacker: { species: "LICKITUNG" },
      target: { species: "ONIX" },
      attackerOffset: { x2: 0, y2: 0 },
      targetOffset: { x2: 12, y2: 6 },
      shakeTaskActive: true,
      loadedTags: ["ANIM_TAG_SLAM_HIT", "ANIM_TAG_IMPACT"],
    });
  });

  it("pins the lowest carrier and rejects Factory Secret Power promotion", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/slamSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain('"setId":164');
    expect(output).toContain('"slamHitFrames":[64,80,96,112]');
    expect(output).toContain(
      "Factory BATTLE_ENVIRONMENT_BUILDING dispatches Move_STRENGTH",
    );
  });

  it("regenerates LICKITUNG and SLAM_HIT assets byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-slam-assets-"));
    const output = join(scratch, "slam.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractSlamAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/slam.json"),
    );
  });
});
