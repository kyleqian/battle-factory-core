// wsh2 (ISSUES #219, docs/wsh1-general-anim-commands.md "wsh2"): General_FocusBand's pure slide / tint rows.
import { describe, expect, it } from "vitest";
import {
  FOCUS_BAND_RESTORE_DURATION,
  FOCUS_BAND_RESTORE_FRAME,
  FOCUS_BAND_SLIDE_RUNS,
  focusBandRowAtAge,
} from "../src/animation/focusBand.ts";
import { normalPaletteFadeY } from "../src/animation/normalPaletteFade.ts";
import {
  WISH_HEAL_BG_DOWN_AGE,
  WISH_HEAL_BG_UP_AGE,
  WISH_HEAL_GRANTING_FIRST_VISIBLE_AGE,
  WISH_HEAL_HEALING_OFFSET,
  wishHealRowAtAge,
} from "../src/animation/wishHeal.ts";

describe("wsh2 Focus Band rows", () => {
  it("the normal palette fade steps by 2 every delay + 2 frames and clamps to the target", () => {
    expect(normalPaletteFadeY(8, 7, 0, 9, "bg")).toBe(0);
    expect(normalPaletteFadeY(9, 7, 0, 9, "bg")).toBe(2);
    expect(normalPaletteFadeY(18, 7, 0, 9, "bg")).toBe(4);
    expect(normalPaletteFadeY(9, 7, 0, 9, "obj")).toBe(0);
    expect(normalPaletteFadeY(10, 7, 0, 9, "obj")).toBe(2);
    expect(normalPaletteFadeY(500, 7, 0, 9, "obj")).toBe(9);
    expect(normalPaletteFadeY(500, 4, 9, 0, "obj")).toBe(0);
  });

  it("the player's slide subtracts and the opponent's adds (shake included) and both rest at 0", () => {
    expect(focusBandRowAtAge(29, "player").x2).toBe(-17);
    expect(focusBandRowAtAge(29, "opponent").x2).toBe(13);
    expect(focusBandRowAtAge(59, "player").x2).toBe(-13);
    expect(focusBandRowAtAge(59, "opponent").x2).toBe(17);
    const end = FOCUS_BAND_RESTORE_FRAME + FOCUS_BAND_RESTORE_DURATION;
    expect(focusBandRowAtAge(end, "player").x2).toBe(0);
    expect(focusBandRowAtAge(end, "opponent").x2).toBe(0);
    expect(focusBandRowAtAge(-1, "player")).toEqual({ x2: 0, paletteY: 0 });
  });

  it("the slide is held at 15 px between the slide and the restore, and the tint returns to 0", () => {
    const held = focusBandRowAtAge(FOCUS_BAND_SLIDE_RUNS + 1, "player").x2;
    expect(held).toBe(-13);
    expect(focusBandRowAtAge(FOCUS_BAND_RESTORE_FRAME - 1, "player").x2).toBe(focusBandRowAtAge(FOCUS_BAND_SLIDE_RUNS + 1, "player").x2);
    expect(focusBandRowAtAge(129, "player").paletteY).toBe(0);
    expect(Math.max(...Array.from({ length: 129 }, (_, a) => focusBandRowAtAge(a, "player").paletteY))).toBe(9);
  });
});

describe("wsh2 Wish heal rows", () => {
  const center = { x: 50, y: 90 };
  it("the BG blend ramps 0 -> 10 in 5-frame steps and back down", () => {
    const y = (age: number) => wishHealRowAtAge(age, "player", center).bgBlackCoeff;
    expect(y(0)).toBe(0);
    expect(Math.max(...Array.from({ length: 201 }, (_, a) => y(a)))).toBe(10);
    expect(y(WISH_HEAL_BG_UP_AGE + 3)).toBe(0);
    expect(y(WISH_HEAL_BG_UP_AGE + 4)).toBe(2);
    expect(y(WISH_HEAL_BG_DOWN_AGE + 4)).toBe(8);
    expect(y(200)).toBe(0);
  });
  it("two granting stars then four blue stars, each side mirrored", () => {
    const rows = Array.from({ length: 201 }, (_, a) => wishHealRowAtAge(a, "player", center));
    const granting = rows.map((r, a) => (r.grantingStarAge === null ? -1 : a)).filter((a) => a >= 0);
    expect(granting[0]).toBe(WISH_HEAL_GRANTING_FIRST_VISIBLE_AGE);
    expect(granting.length).toBe(70);
    expect(new Set(rows.flatMap((r) => r.blueStars.map((s) => s.spawnIndex))).size).toBe(4);
    const p = wishHealRowAtAge(WISH_HEAL_GRANTING_FIRST_VISIBLE_AGE + WISH_HEAL_HEALING_OFFSET + 30, "player", center).blueStars[1]!;
    const o = wishHealRowAtAge(WISH_HEAL_GRANTING_FIRST_VISIBLE_AGE + WISH_HEAL_HEALING_OFFSET + 30, "opponent", center).blueStars[1]!;
    expect(p.x - center.x).toBe(center.x - o.x);
  });
});
