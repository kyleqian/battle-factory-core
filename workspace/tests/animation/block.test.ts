import { describe, expect, it } from "vitest";
import { blockAtAge } from "../../src/animation/block.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBlockView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_BLOCK source reducer", () => {
  const opponent = (age: number) =>
    blockAtAge(age, "opponent", { x: 176, y: 42 });
  const player = (age: number) =>
    blockAtAge(age, "player", { x: 72, y: 88 });

  it("ports both side-relative falls and bounce phases", () => {
    expect(opponent(4).xSign).toMatchObject({
      x: 176, y: 42, y2: -86, data0: 0,
    });
    expect(opponent(13).xSign).toMatchObject({
      y2: 0, data0: 1, data1: 0,
    });
    expect(player(4).xSign).toMatchObject({ y: 88, y2: -134, data0: 0 });
    expect(player(18).xSign).toMatchObject({ y2: 0, data0: 1, data1: 0 });
    expect(opponent(45).xSign).toMatchObject({ data0: 2, data1: 0 });
    expect(opponent(67).xSign).toMatchObject({ data0: 3, data1: 0 });
  });

  it("ports flicker, audio, destruction, and first inactive cleanup", () => {
    expect(opponent(76).sound).toBe("SE_M_LEER");
    expect(opponent(88).xSign?.invisible).toBe(true);
    expect(opponent(139).xSign).toBeNull();
    expect(opponent(139).active).toBe(true);
    expect(opponent(140)).toMatchObject({
      active: false, xSignLoaded: false, xSign: null,
    });
    expect(player(144).xSign).toBeNull();
    expect(player(145).active).toBe(false);
  });

  it("exposes relative age and explicit geometry without trap state", () => {
    const stage = createSceneOnMovePresentation({
      move: "BLOCK",
      attacker: {
        species: "SUDOWOODO",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 56 },
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
        playerHp: 169, playerMaxHp: 177,
        opponentHp: 110, opponentMaxHp: 110,
      },
    });
    expect(sceneOnBlockView({ ...stage, age: 13 })).toMatchObject({
      age: 13,
      attacker: { species: "SUDOWOODO" },
      target: { species: "ONIX" },
      xSign: { data0: 1 },
    });
    expect(stage.config).not.toHaveProperty("trapped");
  });
});
