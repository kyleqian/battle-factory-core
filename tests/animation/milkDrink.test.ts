import { describe, expect, it } from "vitest";
import {
  MILK_DRINK_HEALING_START_AGE,
  MILK_DRINK_RING_START_AGE,
  milkDrinkEffectAtAge,
} from "../../src/animation/milkDrink.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMilkDrinkView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_MILK_DRINK source-relative component reducer", () => {
  it("replays AnimMilkBottle's blend, fall, wobble, and affine loop", () => {
    expect([0, 31, 40, 50, 80, 101, 102].map((age) =>
      milkDrinkEffectAtAge(age, "player", { x: 72, y: 95 })[0]
    )).toEqual([
      { kind: "bottle", x: 72, y: 71, xScale: 256, rotB: 0, rotC: 0, yScale: 256, eva: 1, evb: 16, invisible: false },
      { kind: "bottle", x: 72, y: 71, xScale: 256, rotB: 0, rotC: 0, yScale: 256, eva: 16, evb: 0, invisible: false },
      { kind: "bottle", x: 72, y: 71, xScale: 255, rotB: -12, rotC: 12, yScale: 255, eva: 16, evb: 0, invisible: false },
      { kind: "bottle", x: 74, y: 75, xScale: 219, rotB: -131, rotC: 131, yScale: 219, eva: 16, evb: 0, invisible: false },
      { kind: "bottle", x: 70, y: 85, xScale: 219, rotB: 131, rotC: -131, yScale: 219, eva: 11, evb: 6, invisible: false },
      { kind: "bottle", x: 72, y: 91, xScale: 254, rotB: -25, rotC: 25, yScale: 254, eva: 0, evb: 16, invisible: false },
      { kind: "bottle", x: 72, y: 91, xScale: 253, rotB: -37, rotC: 37, yScale: 253, eva: 0, evb: 16, invisible: true },
    ]);
  });

  it("pins affine program 1's complete 31-frame expanding thin ring", () => {
    expect(milkDrinkEffectAtAge(
      MILK_DRINK_RING_START_AGE,
      "player",
      { x: 72, y: 95 },
    )[0]).toEqual({
      kind: "ring",
      x: 72,
      y: 95,
      xScale: 2048,
      yScale: 2048,
    });
    expect(milkDrinkEffectAtAge(
      MILK_DRINK_RING_START_AGE + 30,
      "player",
      { x: 72, y: 95 },
    )[0]).toMatchObject({ xScale: 132, yScale: 132 });
  });

  it("reuses HealingEffect2 only for the literal target-side star args", () => {
    const player = milkDrinkEffectAtAge(
      MILK_DRINK_HEALING_START_AGE + 11,
      "player",
      { x: 72, y: 95 },
    );
    const opponent = milkDrinkEffectAtAge(
      MILK_DRINK_HEALING_START_AGE + 11,
      "opponent",
      { x: 176, y: 44 },
    );
    expect(player.map(({ kind, x, y }) => ({ kind, x, y }))).toEqual([
      { kind: "star", x: 72, y: 90 },
      { kind: "star", x: 57, y: 105 },
    ]);
    expect(opponent.map(({ kind, x, y }) => ({ kind, x, y }))).toEqual([
      { kind: "star", x: 176, y: 39 },
      { kind: "star", x: 191, y: 54 },
    ]);
  });

  it("threads MILK_DRINK through the shared presentation seam", () => {
    const state = createSceneOnMovePresentation({
      move: "MILK_DRINK",
      attacker: {
        species: "MILTANK",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 16 },
          animationCenter: { x: 176, y: 44 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      fieldProfile: {
        playerHp: 110,
        playerMaxHp: 110,
        opponentHp: 162,
        opponentMaxHp: 170,
      },
    });
    expect(sceneOnMilkDrinkView({ ...state, age: 0 }).sprites[0])
      .toMatchObject({ kind: "bottle", x: 176, y: 20 });
  });
});
