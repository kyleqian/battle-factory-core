import { describe, expect, it } from "vitest";
import {
  SHAKE_END_AGE,
  SHAKE_START_AGE,
  SLICE_1_AGE,
  SLICE_1_DESTROY_AGE,
  SLICE_1_TEARDOWN_AGE,
  SLICE_2_AGE,
  SLICE_2_DESTROY_AGE,
  SLICE_2_TEARDOWN_AGE,
  slashAtAge,
} from "../../src/animation/slash.ts";

const GEOM_PLAYER = {
  targetSide: "opponent",
  targetCenter: { x: 176, y: 42 },
} as const;
const GEOM_OPPONENT = {
  targetSide: "player",
  targetCenter: { x: 72, y: 88 },
} as const;

describe("Move_SLASH source-relative reducer", () => {
  it("is static through the loadspritegfx prefix (no sprites, no shake, no sound)", () => {
    for (const age of [0, 1, 2, SLICE_1_AGE - 1]) {
      expect(slashAtAge(age, GEOM_PLAYER)).toEqual({
        slices: [], targetX2: 0, soundEvents: [],
      });
    }
  });

  it("creates slice 1 at the TARGET X_2 - 8 with SE_M_RAZOR_WIND", () => {
    const state = slashAtAge(SLICE_1_AGE, GEOM_PLAYER);
    expect(state.slices).toEqual([
      { x: 168, y: 42, tileOffset: 0, invisible: false },
    ]);
    expect(state.soundEvents).toEqual([{ age: 4, song: "SE_M_RAZOR_WIND", pan: 63 }]);
  });

  it("creates slice 2 at the TARGET X_2 + 8 and starts the shake the same age", () => {
    const state = slashAtAge(SLICE_2_AGE, GEOM_PLAYER);
    expect(state.slices).toEqual([
      { x: 168, y: 42, tileOffset: 16, invisible: false },
      { x: 184, y: 42, tileOffset: 0, invisible: false },
    ]);
    expect(state.targetX2).toBe(-4);
    expect(state.soundEvents).toEqual([{ age: 10, song: "SE_M_RAZOR_WIND", pan: 63 }]);
  });

  it("marches both slices through gSlashSliceAnimCmds1 (4 frames of 16 tiles, 4 ticks each)", () => {
    // slice1: cmd0 ages 4-6, cmd1 7-10, cmd2 11-14, cmd3 15-18
    const slice1 = (age: number) => slashAtAge(age, GEOM_PLAYER).slices[0]!;
    expect(slice1(4).tileOffset).toBe(0);
    expect(slice1(7).tileOffset).toBe(16);
    expect(slice1(11).tileOffset).toBe(32);
    expect(slice1(15).tileOffset).toBe(48);
    // slice2: cmd0 ages 10-12, cmd1 13-16, cmd2 17-20, cmd3 21-25
    const slice2 = (age: number) => slashAtAge(age, GEOM_PLAYER).slices[1]!;
    expect(slice2(10).tileOffset).toBe(0);
    expect(slice2(13).tileOffset).toBe(16);
    expect(slice2(17).tileOffset).toBe(32);
    expect(slice2(21).tileOffset).toBe(48);
  });

  it("runs AnimFalseSwipeSlice_Step3 blink teardown (invisible toggles every 2 ages from teardown+2)", () => {
    // slice1 teardown starts age 20, toggles visible->invisible at 22-23, 26-27...
    const inv = (age: number) => slashAtAge(age, GEOM_PLAYER).slices[0]!.invisible;
    expect(inv(SLICE_1_TEARDOWN_AGE)).toBe(false);
    expect(inv(SLICE_1_TEARDOWN_AGE + 1)).toBe(false);
    expect(inv(SLICE_1_TEARDOWN_AGE + 2)).toBe(true);
    expect(inv(SLICE_1_TEARDOWN_AGE + 3)).toBe(true);
    expect(inv(SLICE_1_TEARDOWN_AGE + 4)).toBe(false);
    // slice2 teardown starts age 26
    const inv2 = (age: number) => slashAtAge(age, GEOM_PLAYER).slices[1]!.invisible;
    expect(inv2(SLICE_2_TEARDOWN_AGE + 2)).toBe(true);
    expect(inv2(SLICE_2_TEARDOWN_AGE + 3)).toBe(true);
    expect(inv2(SLICE_2_TEARDOWN_AGE + 4)).toBe(false);
  });

  it("destroys slice 1 at age 38 and slice 2 at age 44", () => {
    expect(slashAtAge(SLICE_1_DESTROY_AGE, GEOM_PLAYER).slices.map((s) => s.x)).toEqual([184]);
    expect(slashAtAge(SLICE_2_DESTROY_AGE, GEOM_PLAYER).slices).toEqual([]);
  });

  it("shakes the target x2 by +-4 in 2-age blocks and restores to 0 at the end", () => {
    const x2 = (age: number) => slashAtAge(age, GEOM_PLAYER).targetX2;
    expect(x2(SHAKE_START_AGE - 1)).toBe(0);
    expect(x2(SHAKE_START_AGE)).toBe(-4);
    expect(x2(SHAKE_START_AGE + 1)).toBe(-4);
    expect(x2(SHAKE_START_AGE + 2)).toBe(4);
    expect(x2(SHAKE_START_AGE + 3)).toBe(4);
    expect(x2(SHAKE_START_AGE + 4)).toBe(-4);
    expect(x2(SHAKE_END_AGE - 1)).toBe(-4);
    expect(x2(SHAKE_END_AGE)).toBe(0);
  });

  it("is structurally identical for the opponent-front orientation at +0 ages (geometry only)", () => {
    const player = slashAtAge(SLICE_1_AGE, GEOM_PLAYER);
    const opponent = slashAtAge(SLICE_1_AGE, GEOM_OPPONENT);
    expect(opponent.slices).toEqual([{ x: 64, y: 88, tileOffset: 0, invisible: false }]);
    expect(opponent.soundEvents[0]!.pan).toBe(-63);
    expect(player.soundEvents[0]!.pan).toBe(63);
  });
});
