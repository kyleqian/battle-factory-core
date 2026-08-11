import { describe, expect, it } from "vitest";
import {
  LICK_ANIM_END_AGE,
  LICK_CASE_1_AGE,
  LICK_DESTROY_AGE,
  LICK_SPAWN_AGE,
  SHAKE_END_AGE,
  lickAtAge,
} from "../../src/animation/lick.ts";
import { shakeMon2OffsetAtTick } from "../../src/animation/shakeMon2.ts";

const GEOM_PLAYER = {
  targetSide: "opponent",
  targetCenter: { x: 176, y: 42 },
} as const;
const GEOM_OPPONENT = {
  targetSide: "player",
  targetCenter: { x: 72, y: 88 },
} as const;

describe("Move_LICK source-relative reducer", () => {
  it("is static through the loadspritegfx prefix (no lick sprite, no shake, no sound)", () => {
    for (const age of [0, 1, 2, LICK_SPAWN_AGE - 1]) {
      expect(lickAtAge(age, GEOM_PLAYER)).toEqual({
        lick: null, targetX2: 0, soundEvents: [],
      });
    }
  });

  it("creates the 16x32 lick sprite at the TARGET center with SE_M_LICK", () => {
    const state = lickAtAge(LICK_SPAWN_AGE, GEOM_PLAYER);
    expect(state.lick).toEqual({ x: 176, y: 42, tileOffset: 0, invisible: false });
    expect(state.soundEvents).toEqual([{ age: 21, song: "SE_M_LICK", pan: 63 }]);
  });

  it("marches the sprite through sAnim_Lick (5 frames of 8 tiles, 2 ticks each)", () => {
    const off = (age: number) => lickAtAge(age, GEOM_PLAYER).lick!.tileOffset;
    expect(off(LICK_SPAWN_AGE)).toBe(0);
    expect(off(22)).toBe(8);
    expect(off(23)).toBe(8);
    expect(off(24)).toBe(16);
    expect(off(26)).toBe(24);
    expect(off(28)).toBe(32);
    expect(off(30)).toBe(32);
  });

  it("runs AnimLick_Step's invisible flicker ladder (case 0 flips every 2 ticks, case 1 every 4)", () => {
    const inv = (age: number) => lickAtAge(age, GEOM_PLAYER).lick!.invisible;
    // pre-animEnd visible
    expect(inv(LICK_ANIM_END_AGE - 1)).toBe(false);
    // forced invisible on the first animEnded entry
    expect(inv(LICK_ANIM_END_AGE)).toBe(true);
    expect(inv(LICK_ANIM_END_AGE + 1)).toBe(true);
    // case 0 visible at ages 33, 36, 39, 42, 45
    expect(inv(33)).toBe(false);
    expect(inv(34)).toBe(true);
    expect(inv(35)).toBe(true);
    expect(inv(36)).toBe(false);
    expect(inv(39)).toBe(false);
    expect(inv(42)).toBe(false);
    expect(inv(45)).toBe(false);
    // case 1 visible at ages 50, 55, 60, 65, 70
    expect(inv(LICK_CASE_1_AGE)).toBe(true);
    expect(inv(50)).toBe(false);
    expect(inv(55)).toBe(false);
    expect(inv(60)).toBe(false);
    expect(inv(65)).toBe(false);
    expect(inv(70)).toBe(false);
  });

  it("destroys the sprite at age 71 (AnimLick_Step case 2 default -> DestroyAnimSprite)", () => {
    expect(lickAtAge(LICK_DESTROY_AGE - 1, GEOM_PLAYER).lick).not.toBeNull();
    expect(lickAtAge(LICK_DESTROY_AGE, GEOM_PLAYER).lick).toBeNull();
  });

  it("shakes the target x2 by +-1 in 2-age blocks and restores to 0 at the end", () => {
    const x2 = (age: number) => lickAtAge(age, GEOM_PLAYER).targetX2;
    expect(x2(LICK_SPAWN_AGE - 1)).toBe(0);
    expect(x2(LICK_SPAWN_AGE)).toBe(-1);
    expect(x2(LICK_SPAWN_AGE + 1)).toBe(-1);
    expect(x2(LICK_SPAWN_AGE + 2)).toBe(1);
    expect(x2(LICK_SPAWN_AGE + 3)).toBe(1);
    expect(x2(LICK_SPAWN_AGE + 4)).toBe(-1);
    expect(x2(SHAKE_END_AGE - 1)).toBe(-1);
    expect(x2(SHAKE_END_AGE)).toBe(0);
  });

  it("is structurally identical for the opponent-front orientation at +0 ages (geometry only)", () => {
    const player = lickAtAge(LICK_SPAWN_AGE, GEOM_PLAYER);
    const opponent = lickAtAge(LICK_SPAWN_AGE, GEOM_OPPONENT);
    expect(opponent.lick).toEqual({ x: 72, y: 88, tileOffset: 0, invisible: false });
    expect(opponent.soundEvents[0]!.pan).toBe(-63);
    expect(player.soundEvents[0]!.pan).toBe(63);  });

  it("keeps the duplicated shake closed form pinned to the shared ShakeMon2 port", () => {
    // The reducer's RAM-truth targetX2 is exactly the shared
    // `shakeMon2OffsetAtTick(1, 0, 16, 1, age - 20).x2` sequence on every age
    // the hardware reaches a frame (21..51). It differs at age 20 only: the
    // shared sequence's index 0 (+1, the AnimTask_ShakeMon2 creation write) is
    // a same-frame transient the task's immediate step overwrites to -1 before
    // any frame is displayed (and it equals the ONIX front-idle hold the draw
    // case supplies), so the reducer correctly leaves age 20 at 0. The pin
    // exists so the duplicated closed form cannot silently drift from the
    // shared port; `shakeMon2.ts` must not be edited and `lick.ts` must not
    // call it.
    for (let age = LICK_SPAWN_AGE; age <= SHAKE_END_AGE; age += 1) {
      const shared = shakeMon2OffsetAtTick(1, 0, 16, 1, age - 20).x2;
      expect(
        lickAtAge(age, GEOM_PLAYER).targetX2,
        `age ${age}: reducer ${lickAtAge(age, GEOM_PLAYER).targetX2} vs shared ${shared}`,
      ).toBe(shared);
    }
    expect(shakeMon2OffsetAtTick(1, 0, 16, 1, 0).x2).toBe(1);
    expect(lickAtAge(LICK_SPAWN_AGE - 1, GEOM_PLAYER).targetX2).toBe(0);
  });
});
