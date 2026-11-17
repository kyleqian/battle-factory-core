// wsh2 (ISSUES #219, docs/wsh1-general-anim-commands.md "wsh2"): General_FocusBand's pure slide / tint rows.
import { describe, expect, it } from "vitest";
import {
  FOCUS_BAND_RESTORE_DURATION,
  FOCUS_BAND_RESTORE_FRAME,
  FOCUS_BAND_SLIDE_RUNS,
  focusBandRowAtAge,
  normalPaletteFadeY,
} from "../src/animation/focusBand.ts";

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
