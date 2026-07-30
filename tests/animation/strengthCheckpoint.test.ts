import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { strengthAtAge } from "../../src/animation/strength.ts";

describe("Secret Power Factory Strength reducer checkpoint", () => {
  it("ports ShakeAndSink, return-slide, ellipse, and ShakeMon2 schedules", () => {
    expect([6, 7, 8, 9, 10, 11, 34, 35].map(
      (age) => strengthAtAge(age, "player", { x: 176, y: 42 })
        .attackerOffset,
    )).toEqual([
      { x2: 0, y2: 0 }, { x2: -2, y2: 0 },
      { x2: 0, y2: 1 }, { x2: 2, y2: 1 },
      { x2: 0, y2: 1 }, { x2: -2, y2: 2 },
      { x2: 0, y2: 10 }, { x2: -2, y2: 11 },
    ]);
    expect([48, 49, 50, 51, 52].map(
      (age) => strengthAtAge(age, "player", { x: 176, y: 42 })
        .attackerOffset,
    )).toEqual([
      { x2: -2, y2: 8 }, { x2: -1, y2: 5 },
      { x2: -1, y2: 2 }, { x2: 0, y2: 0 }, { x2: 0, y2: 0 },
    ]);
    expect([47, 48, 49, 51, 63, 64, 77, 78].map(
      (age) => strengthAtAge(age, "player", { x: 176, y: 42 }).targetOffset,
    )).toEqual([
      { x2: 0, y2: 0 }, { x2: 6, y2: 1 },
      { x2: 12, y2: 2 }, { x2: 18, y2: 6 },
      { x2: 0, y2: 0 }, { x2: 6, y2: 1 },
      { x2: -13, y2: 2 }, { x2: 0, y2: 0 },
    ]);
    expect([78, 79, 80, 81, 82, 91, 92, 93].map(
      (age) => strengthAtAge(age, "player", { x: 176, y: 42 })
        .targetOffset.x2,
    )).toEqual([0, -2, -2, 2, 2, -2, -2, 0]);
  });

  it("ports three mirrored animation-1 hitsplats and four audio triggers", () => {
    expect(strengthAtAge(54, "player", { x: 176, y: 42 }).hitSplats)
      .toEqual([{ x: 192, y: 54, animation: 1, sourceIndex: 0 }]);
    expect(strengthAtAge(60, "player", { x: 176, y: 42 }).hitSplats)
      .toEqual([
        { x: 192, y: 54, animation: 1, sourceIndex: 0 },
        { x: 160, y: 30, animation: 1, sourceIndex: 1 },
      ]);
    expect(strengthAtAge(66, "opponent", { x: 72, y: 88 }).hitSplats)
      .toEqual([
        { x: 88, y: 76, animation: 1, sourceIndex: 1 },
        { x: 69, y: 92, animation: 1, sourceIndex: 2 },
      ]);
    expect([6, 53, 59, 65].flatMap(
      (age) => strengthAtAge(age, "player", { x: 176, y: 42 }).audioTriggers,
    )).toEqual([
      { sound: "SE_M_TAKE_DOWN", pan: "attacker" },
      { sound: "SE_M_MEGA_KICK2", pan: "target" },
      { sound: "SE_M_MEGA_KICK2", pan: "target" },
      { sound: "SE_M_MEGA_KICK2", pan: "target" },
    ]);
  });

  it("pins complete legal challenge-0 Teddiursa parties in both orientations", () => {
    for (const path of [
      "tools/battle-lab/mechanic-secret-power-player-teddiursa-opponent-onix.json",
      "tools/battle-lab/mechanic-secret-power-opponent-teddiursa-player-onix.json",
    ]) {
      const scenario = JSON.parse(readFileSync(path, "utf8"));
      expect(scenario).toMatchObject({
        mode: "mechanicLab", profile: "battle-scene-on",
        level: 50, challengeNum: 0,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const teddiursa = [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ].find((mon) => mon.species === 216);
      expect(teddiursa).toMatchObject({
        nature: 7, moves: [290, 290, 290, 290], item: 134,
        friendship: 70, abilitySlot: 0,
      });
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toEqual([0, 0, 0, 0]);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
      }
    }
  });

  it("keeps exact promotion blocked at the first inactive cleanup display", () => {
    expect(strengthAtAge(100, "player", { x: 176, y: 42 })).toMatchObject({
      impactLoaded: true, active: true,
    });
    expect(strengthAtAge(101, "player", { x: 176, y: 42 })).toMatchObject({
      impactLoaded: false, monbgActive: false, alpha: null, active: false,
    });
    for (const path of [
      "tools/compare/fixtures/secret-power-strength-player-teddiursa-opponent-onix.json",
      "tools/compare/fixtures/secret-power-strength-opponent-teddiursa-player-onix.json",
    ]) {
      expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({
        schema: "secret-power-strength-portable-evidence/v1",
        sourceWindow: { startFrame: 222, endFrame: 323, frameCount: 102 },
        status: "evidence-checkpoint",
        acceptance: {
          reducerPinned: true,
          typedSeam: false,
          productionFramebuffer: false,
          exact: false,
        },
      });
    }
  });
});
