import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import dizzyPunchAsset from "../../src/animation/assets/dizzyPunch.json" with { type: "json" };
import {
  DIZZY_PUNCH_LAST_BODY_AGE,
  dizzyPunchAtAge,
} from "../../src/animation/dizzyPunch.ts";
import {
  createSceneOnMovePresentation,
  sceneOnDizzyPunchView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_DIZZY_PUNCH source-relative checkpoint", () => {
  const player = (age: number) =>
    dizzyPunchAtAge(age, "player", { x: 176, y: 42 });
  const opponent = (age: number) =>
    dizzyPunchAtAge(age, "opponent", { x: 72, y: 88 });

  it("ports both lunges, target shakes, fists, and animation-1 impacts", () => {
    expect([0, 5, 6, 7, 8, 13, 14].map((age) => player(age).attackerX2))
      .toEqual([4, 24, 24, 24, 20, 0, 0]);
    expect([20, 25, 26, 27, 28, 33, 34].map((age) => player(age).attackerX2))
      .toEqual([4, 24, 24, 24, 20, 0, 0]);
    expect(opponent(5).attackerX2).toBe(-24);
    expect(player(8)).toMatchObject({
      targetX2: -3,
      fists: [{ x: 192, y: 50 }],
      hitsplats: [{ x: 192, y: 42, animation: 1 }],
      sound: "SE_M_COMET_PUNCH",
    });
    expect(player(28)).toMatchObject({
      targetX2: -3,
      fists: expect.arrayContaining([{ x: 160, y: 34 }]),
      hitsplats: [{ x: 160, y: 26, animation: 1 }],
      sound: "SE_M_VITAL_THROW2",
    });
    expect(opponent(8).fists).toEqual([{ x: 56, y: 96 }]);
    expect(opponent(28).fists).toContainEqual({ x: 88, y: 80 });
  });

  it("ports the two literal six-duck waves and their callback teardown", () => {
    expect(player(7).ducks).toHaveLength(0);
    expect(player(8).ducks).toHaveLength(6);
    expect(player(28).ducks).toHaveLength(12);
    expect(player(47).ducks).toHaveLength(12);
    expect(player(48).ducks).toHaveLength(6);
    expect(player(67).ducks).toHaveLength(6);
    expect(player(68).ducks).toHaveLength(0);
    expect(player(8).ducks[0]).toMatchObject({
      wave: 0, x: 192, y: 50, x2: 0, y2: 0, phase: 3, priority: 2,
    });
    expect(player(9).ducks[0]).toMatchObject({ y2: -3, phase: 6 });
    expect(player(45).ducks[0]).toMatchObject({
      phase: 114, invisible: false,
    });
    expect(player(46).ducks[0]).toMatchObject({
      phase: 117, invisible: true,
    });
    expect(opponent(8).ducks[0]).toMatchObject({ x: 56, y: 96 });
    expect(opponent(28).ducks[6]).toMatchObject({ x: 88, y: 80 });
  });

  it("owns the alpha/monbg cleanup without battle outcome state", () => {
    expect(player(68)).toMatchObject({
      targetOnMonBg: true,
      alpha: { eva: 12, evb: 8 },
      active: true,
    });
    expect(player(69)).toMatchObject({
      targetOnMonBg: false,
      alpha: null,
      active: true,
    });
    expect(DIZZY_PUNCH_LAST_BODY_AGE).toBe(69);
    expect(player(70).active).toBe(false);
  });

  it("exposes only relative age and geometry through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "DIZZY_PUNCH",
      attacker: {
        species: "SPINDA",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 52 },
          animationCenter: { x: 72, y: 88 },
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
        playerHp: 167,
        playerMaxHp: 167,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
      attackerPersonality: 0x8c033015,
    });
    expect(sceneOnDizzyPunchView({ ...stage, age: 28 })).toMatchObject({
      age: 28,
      attacker: { species: "SPINDA" },
      target: { species: "ONIX" },
      ducks: expect.arrayContaining([
        expect.objectContaining({ wave: 1, x: 160, y: 34 }),
      ]),
      sound: "SE_M_VITAL_THROW2",
    });
  });

  it("pins the legal set-145 carrier and source sprite art", () => {
    expect(dizzyPunchAsset.source).toMatchObject({
      spindaBack: expect.stringContaining("set 145"),
      duck: expect.stringContaining("gDizzyPunchDuckSpriteTemplate"),
      hitsplat: expect.stringContaining("anim 1"),
    });
    expect(dizzyPunchAsset.duck.tileset).toMatchObject({
      columns: 2,
      rows: 6,
    });
    expect(dizzyPunchAsset.spindaSpots).toHaveLength(4);
    expect(dizzyPunchAsset.spindaSpots.map(({ x, y }) => ({ x, y })))
      .toEqual([
        { x: 16, y: 7 },
        { x: 40, y: 8 },
        { x: 22, y: 25 },
        { x: 34, y: 26 },
      ]);
  });

  it("regenerates every owned asset byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "dizzy-punch-assets-"));
    const output = join(directory, "dizzyPunch.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractDizzyPunchAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/dizzyPunch.json"),
    );
  });
});
