import { describe, expect, it } from "vitest";
import { headbuttAtAge } from "../../src/animation/headbutt.ts";
import {
  createSceneOnMovePresentation,
  sceneOnHeadbuttView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_HEADBUTT source reducer", () => {
  const player = (age: number) =>
    headbuttAtAge(age, "player", { x: 176, y: 42 });
  const opponent = (age: number) =>
    headbuttAtAge(age, "opponent", { x: 72, y: 88 });

  it("ports all three side-relative gBowMonSpriteTemplate phases", () => {
    expect([4, 5, 10, 12, 15, 21, 22, 25, 28, 37, 39].map((age) => ({
      age,
      offset: player(age).attackerOffset,
    }))).toEqual([
      { age: 4, offset: { x2: 0, y2: 0 } },
      { age: 5, offset: { x2: -2, y2: 0 } },
      { age: 10, offset: { x2: -12, y2: 0 } },
      { age: 12, offset: { x2: -12, y2: 2 } },
      { age: 15, offset: { x2: -12, y2: 9 } },
      { age: 21, offset: { x2: -12, y2: 9 } },
      { age: 22, offset: { x2: -9, y2: 9 } },
      { age: 25, offset: { x2: 0, y2: 9 } },
      { age: 28, offset: { x2: -2, y2: 9 } },
      { age: 37, offset: { x2: 0, y2: 6 } },
      { age: 39, offset: { x2: 0, y2: 0 } },
    ]);
    expect(opponent(15).attackerMatrix).toEqual({
      a: 244, b: -74, c: 74, d: 244,
    });
    expect(player(15).attackerMatrix).toEqual({
      a: 244, b: 74, c: -74, d: 244,
    });
  });

  it("ports both shakes, flashing impact, audio, and clear display", () => {
    expect([28, 29, 30, 31, 32, 33].map(
      (age) => player(age).attackerOffset.x2,
    )).toEqual([-2, 2, 2, -2, -2, 0]);
    expect([28, 29, 30, 31, 32, 33, 34, 35, 36].map(
      (age) => player(age).targetOffset.x2,
    )).toEqual([0, 0, 5, 5, 0, 0, 5, 5, 0]);
    expect([28, 29, 30, 40, 41].map((age) =>
      player(age).impacts.map((impact) => impact.invisible)
    )).toEqual([[true], [false], [true], [true], []]);
    expect(player(4).sound).toEqual({ id: "SE_M_HEADBUTT", pan: -64 });
    expect(opponent(28).sound).toEqual({
      id: "SE_M_VITAL_THROW2", pan: -63,
    });
    expect(player(46).active).toBe(true);
    expect(player(47).active).toBe(false);
  });

  it("exposes only relative age and battler geometry through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "HEADBUTT",
      attacker: {
        species: "ZIGZAGOON",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 56 },
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
        playerHp: 145,
        playerMaxHp: 145,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    expect(sceneOnHeadbuttView({ ...stage, age: 28 })).toMatchObject({
      age: 28,
      attacker: { species: "ZIGZAGOON" },
      target: { species: "ONIX" },
      attackerOffset: { x2: -2, y2: 9 },
      impacts: [{ x: 176, y: 42, animation: 1, invisible: true }],
    });
  });
});
