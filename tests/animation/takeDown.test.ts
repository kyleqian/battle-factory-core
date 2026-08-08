import { describe, expect, it } from "vitest";
import {
  CLEAR_AGE,
  CONTACT_AGE,
  SHAKE_FIRST_STEP_AGE,
  SLIDE_BACK_ATTACKER_AGE,
  SLIDE_BACK_TARGET_AGE,
  TARGET_PUSH_FIRST_STEP_AGE,
  WIND_UP_FIRST_STEP_AGE,
  takeDownAtAge,
} from "../../src/animation/takeDown.ts";

const PLAYER = { targetCenter: { x: 176, y: 42 } };
const OPPONENT = { targetCenter: { x: 72, y: 88 } };
const geo = (side: "player" | "opponent") => ({
  attackerSide: side,
  targetSide: (side === "player" ? "opponent" : "player") as "player" | "opponent",
  targetCenter: side === "player" ? PLAYER.targetCenter : OPPONENT.targetCenter,
});

describe("Move_TAKE_DOWN source-relative reducer", () => {
  it("is static before the wind-up first step", () => {
    const state = takeDownAtAge(0, geo("player"));
    expect(state).toMatchObject({
      attackerX2: 0, attackerY2: 0, targetX2: 0,
      windUpActive: false, hitsplat: null, blendDarken: false,
    });
    expect(takeDownAtAge(6, geo("player")).windUpActive).toBe(false);
  });

  it("marches the wind-up lunge out, holds at the peak, and lunges across", () => {
    const atk = (age: number, side: "player" | "opponent") =>
      takeDownAtAge(age, geo(side)).attackerX2;
    // windup -24/23: -2,-3,...,-24 over ages 7..29
    expect(atk(WIND_UP_FIRST_STEP_AGE, "player")).toBe(-2);
    expect(atk(10, "player")).toBe(-5);
    expect(atk(29, "player")).toBe(-24);
    // delay 10 holds -24 through ages 30..39
    expect(atk(39, "player")).toBe(-24);
    // lunge +40/10: -20,-16,...,+16 over ages 40..49
    expect(atk(40, "player")).toBe(-20);
    expect(atk(45, "player")).toBe(0);
    expect(atk(49, "player")).toBe(16);
    // task destroyed at 50 but the attacker holds the +16 offset
    expect(atk(50, "player")).toBe(16);
    expect(atk(60, "player")).toBe(16);
    // opponent-side attacker mirrors all three phases
    expect(atk(WIND_UP_FIRST_STEP_AGE, "opponent")).toBe(1);
    expect(atk(29, "opponent")).toBe(23);
    expect(atk(40, "opponent")).toBe(19);
    expect(atk(49, "opponent")).toBe(-17);
  });

  it("rides the wind-up sine wave (amplitude 8) and holds it through the lunge", () => {
    const y2 = (age: number) => takeDownAtAge(age, geo("player")).attackerY2;
    expect(y2(WIND_UP_FIRST_STEP_AGE)).toBe(0);
    expect(y2(8)).toBe(0);
    expect(y2(9)).toBe(2);
    expect(y2(10)).toBe(3);
    expect(y2(29)).toBe(1);
    expect(y2(39)).toBe(1);
    expect(y2(49)).toBe(1);
    // the sine tail 1 holds on the sprite after the task is destroyed, until
    // the SlideMonToOriginalPos dummy returns it to rest (y2 0 from age 80)
    expect(y2(50)).toBe(1);
    expect(y2(75)).toBe(1);
    expect(y2(SLIDE_BACK_ATTACKER_AGE - 1)).toBe(1);
    expect(y2(SLIDE_BACK_ATTACKER_AGE)).toBe(0);
    expect(y2(SLIDE_BACK_ATTACKER_AGE + 2)).toBe(0);
  });

  it("slides the target to +16 (SlideMonToOffset, -16 mirrored, 4 ticks)", () => {
    const tgt = (age: number) => takeDownAtAge(age, geo("player")).targetX2;
    expect(tgt(TARGET_PUSH_FIRST_STEP_AGE - 1)).toBe(0);
    expect(tgt(TARGET_PUSH_FIRST_STEP_AGE)).toBe(4);
    expect(tgt(49)).toBe(12);
    expect(tgt(50)).toBe(16);
    expect(tgt(51)).toBe(16);
    expect(tgt(53)).toBe(16);
    // player-side target mirrors to -16 (SlideMonToOffset's own mirror)
    const opp = (age: number) => takeDownAtAge(age, geo("opponent")).targetX2;
    expect(opp(TARGET_PUSH_FIRST_STEP_AGE - 1)).toBe(0);
    expect(opp(TARGET_PUSH_FIRST_STEP_AGE)).toBe(-4);
    expect(opp(50)).toBe(-16);
    expect(opp(53)).toBe(-16);
  });

  it("shakes the target 12/20 around the 16 hold (ShakeMonInPlace 4,0,12,1)", () => {
    const tgt = (age: number) => takeDownAtAge(age, geo("player")).targetX2;
    expect(tgt(SHAKE_FIRST_STEP_AGE - 1)).toBe(16);
    expect(tgt(SHAKE_FIRST_STEP_AGE)).toBe(12);
    expect(tgt(SHAKE_FIRST_STEP_AGE + 1)).toBe(20);
    expect(tgt(SHAKE_FIRST_STEP_AGE + 2)).toBe(20);
    expect(tgt(SHAKE_FIRST_STEP_AGE + 3)).toBe(12);
    expect(tgt(74)).toBe(12);
    expect(tgt(75)).toBe(16);
    // player-side target shakes around the -16 hold: -20/-12
    const opp = (age: number) => takeDownAtAge(age, geo("opponent")).targetX2;
    expect(opp(SHAKE_FIRST_STEP_AGE - 1)).toBe(-16);
    expect(opp(SHAKE_FIRST_STEP_AGE)).toBe(-20);
    expect(opp(SHAKE_FIRST_STEP_AGE + 1)).toBe(-12);
    expect(opp(75)).toBe(-16);
  });

  it("returns the attacker and target to rest with the two slide-back sprites", () => {
    const atk = (age: number) => takeDownAtAge(age, geo("player")).attackerX2;
    const tgt = (age: number) => takeDownAtAge(age, geo("player")).targetX2;
    // attacker: 5 ticks from 16 -> 12,9,6,3,0
    expect(atk(SLIDE_BACK_ATTACKER_AGE)).toBe(12);
    expect(atk(SLIDE_BACK_ATTACKER_AGE + 2)).toBe(6);
    expect(atk(SLIDE_BACK_ATTACKER_AGE + 4)).toBe(0);
    // target: 7 ticks from 16 -> 13,11,9,6,4,2,0
    expect(tgt(SLIDE_BACK_TARGET_AGE)).toBe(13);
    expect(tgt(SLIDE_BACK_TARGET_AGE + 3)).toBe(6);
    expect(tgt(SLIDE_BACK_TARGET_AGE + 6)).toBe(0);
    expect(tgt(SLIDE_BACK_TARGET_AGE + 7)).toBe(0);
    // opponent-side attacker slides back from -17; player target from -16
    const oppAtk = (age: number) => takeDownAtAge(age, geo("opponent")).attackerX2;
    expect(oppAtk(SLIDE_BACK_ATTACKER_AGE)).toBe(-14);
    expect(oppAtk(SLIDE_BACK_ATTACKER_AGE + 3)).toBe(-4);
    expect(oppAtk(SLIDE_BACK_ATTACKER_AGE + 5)).toBe(0);
    const oppTgt = (age: number) => takeDownAtAge(age, geo("opponent")).targetX2;
    expect(oppTgt(SLIDE_BACK_TARGET_AGE)).toBe(-14);
    expect(oppTgt(SLIDE_BACK_TARGET_AGE + 3)).toBe(-7);
    expect(oppTgt(SLIDE_BACK_TARGET_AGE + 6)).toBe(-1);
    expect(oppTgt(SLIDE_BACK_TARGET_AGE + 7)).toBe(0);
  });

  it("places the hitsplat at the target center with the mirrored -10 x offset", () => {
    expect(takeDownAtAge(CONTACT_AGE - 1, geo("player")).hitsplat).toBeNull();
    const playerHitsplat = takeDownAtAge(CONTACT_AGE, geo("player")).hitsplat;
    expect(playerHitsplat).toMatchObject({ x: 166, y: 42, animation: 0 });
    expect(takeDownAtAge(52, geo("player")).hitsplat).toMatchObject({ x: 166, y: 42 });
    expect(takeDownAtAge(53, geo("player")).hitsplat).toBeNull();
    const oppHitsplat = takeDownAtAge(CONTACT_AGE, geo("opponent")).hitsplat;
    expect(oppHitsplat).toMatchObject({ x: 82, y: 88 });
  });

  it("keeps the palette-blend darken on 44-46 and monbg on until the clear", () => {
    const at = (age: number) => takeDownAtAge(age, geo("player"));
    expect(at(CONTACT_AGE - 1)).toMatchObject({ blendDarken: false });
    expect(at(CONTACT_AGE)).toMatchObject({ blendDarken: true, monbg: true });
    expect(at(46)).toMatchObject({ blendDarken: true });
    expect(at(47)).toMatchObject({ blendDarken: false });
    expect(at(3)).toMatchObject({ monbg: false });
    expect(at(4)).toMatchObject({ monbg: true });
    expect(at(CLEAR_AGE - 1)).toMatchObject({ monbg: true });
    expect(at(CLEAR_AGE)).toMatchObject({ monbg: false });
  });

  it("reports the SE_M_MEGA_KICK2 sound at contact", () => {
    const at = (age: number) => takeDownAtAge(age, geo("player"));
    expect(at(CONTACT_AGE - 1).soundEvents).toEqual([]);
    expect(at(CONTACT_AGE).soundEvents).toEqual([
      { age: CONTACT_AGE, song: "SE_M_MEGA_KICK2", pan: 63 },
    ]);
    expect(at(CONTACT_AGE + 1).soundEvents).toEqual([]);
    // target-side player in the mirror orientation pans the other way
    expect(takeDownAtAge(CONTACT_AGE, geo("opponent")).soundEvents[0])
      .toMatchObject({ pan: -63 });
  });

  it("keeps slide counters scoped to their sprite lifetimes", () => {
    const at = (age: number) => takeDownAtAge(age, geo("player"));
    expect(at(TARGET_PUSH_FIRST_STEP_AGE - 1).slideToOffsetCount).toBe(0);
    expect(at(TARGET_PUSH_FIRST_STEP_AGE).slideToOffsetCount).toBe(1);
    expect(at(TARGET_PUSH_FIRST_STEP_AGE + 4).slideToOffsetCount).toBe(0);
    expect(at(SLIDE_BACK_ATTACKER_AGE - 1).slideToOriginalCount).toBe(0);
    expect(at(SLIDE_BACK_ATTACKER_AGE).slideToOriginalCount).toBe(1);
    expect(at(SLIDE_BACK_TARGET_AGE).slideToOriginalCount).toBe(1);
    expect(at(SLIDE_BACK_TARGET_AGE + 7).slideToOriginalCount).toBe(0);
  });
});
