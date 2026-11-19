import { describe, expect, it } from "vitest";
import { itemKnockoffAtAge, ITEM_KNOCKOFF_PATH_ROWS } from "../../src/animation/itemKnockoff.ts";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";

// ROM rows of General_ItemKnockoff's sprite (tools/battle-lab/out2-knockoff{,rev}-on.json, mGBA): [age, x, y, y2] with age 0 = the create row.
const FOE_ROWS = [[0, 176, 56, 0], [1, 176, 56, -5], [2, 178, 56, -9], [3, 180, 56, -13], [9, 195, 55, -30], [10, 197, 55, -30], [20, 221, 54, -6], [29, 243, 52, -19], [30, 245, 52, -21], [38, 264, 51, -16], [39, 267, 51, -14]] as const;
const PLAYER_ROWS = [[0, 72, 101, 0], [1, 72, 101, -5], [2, 70, 101, -9], [3, 67, 101, -13], [9, 52, 99, -30], [10, 49, 99, -30], [20, 23, 96, -6], [29, 0, 94, -19], [30, -3, 94, -21], [38, -24, 91, -16], [39, -26, 91, -14]] as const;

describe("itemKnockoffAtAge (AnimKnockOffItem / AnimKnockOffOpponentsItem / AnimItemSteal_Step1)", () => {
  it.each([
    ["opponent target", "opponent", { x: 176, y: 56 }, FOE_ROWS],
    ["player target", "player", { x: 72, y: 101 }, PLAYER_ROWS],
  ] as const)("%s: x / y / y2 match the ROM sprite rows", (_name, side, start, rows) => {
    for (const [age, x, y, y2] of rows) {
      const bag = itemKnockoffAtAge(age, side, start);
      expect([age, bag?.x, bag?.y, bag?.y2]).toEqual([age, x, y, y2]);
    }
  });

  it("is on screen for 40 rows, then gone (the opponent's sprite is destroyed, the player's sits off-screen)", () => {
    expect(ITEM_KNOCKOFF_PATH_ROWS).toBe(40);
    expect(itemKnockoffAtAge(-1, "opponent", { x: 176, y: 56 })).toBeNull();
    expect(itemKnockoffAtAge(39, "opponent", { x: 176, y: 56 })).not.toBeNull();
    expect(itemKnockoffAtAge(40, "opponent", { x: 176, y: 56 })).toBeNull();
    expect(itemKnockoffAtAge(40, "player", { x: 72, y: 101 })).toBeNull();
  });

  it("wobbles by gFallingBagAffineAnimCmds1 (-4 x 10, +4 x 20, -4 x 10): angle 8 on the first callback row, 0 on the create row and past the anim", () => {
    const sine = (angle: number) => ({ a: GBA_SINE_TABLE_256[(angle + 64) & 0xff], b: GBA_SINE_TABLE_256[angle & 0xff] });
    const matrixAt = (age: number) => itemKnockoffAtAge(age, "opponent", { x: 176, y: 56 })!.matrix;
    expect(matrixAt(0)).toMatchObject({ a: sine(0).a, b: sine(0).b });
    expect(matrixAt(1)).toMatchObject(sine(8));
    expect(matrixAt(9)).toMatchObject(sine(40));
    expect(matrixAt(10)).toMatchObject(sine(36));
    expect(matrixAt(29)).toMatchObject(sine(-40));
    expect(matrixAt(30)).toMatchObject(sine(-36));
    expect(matrixAt(39)).toMatchObject(sine(0));
  });
});
