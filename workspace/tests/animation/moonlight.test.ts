import { describe, expect, it } from "vitest";
import {
  MOONLIGHT_FRAME_COUNT,
  MOONLIGHT_HEALING_START_AGE,
  moonlightAlphaAtAge,
  moonlightAtAge,
  moonlightBackgroundAtAge,
  moonlightEndPaletteCoefficient,
} from "../../src/animation/moonlight.ts";

describe("MOVE_MOONLIGHT complete source-relative body", () => {
  it("pins the opening alpha and black-background cadence", () => {
    expect([41, 42, 43, 44, 103, 104].map(moonlightAlphaAtAge)).toEqual([
      { eva: 0, evb: 16 }, { eva: 1, evb: 16 },
      { eva: 1, evb: 16 }, { eva: 1, evb: 15 },
      { eva: 16, evb: 1 }, { eva: 16, evb: 0 },
    ]);
    expect([11, 12, 14, 15, 33].map(moonlightBackgroundAtAge)).toEqual([
      { mode: "blend", target: "black", coefficient: 0 },
      { mode: "blend", target: "black", coefficient: 2 },
      { mode: "blend", target: "black", coefficient: 2 },
      { mode: "blend", target: "black", coefficient: 4 },
      { mode: "blend", target: "black", coefficient: 16 },
    ]);
  });

  it("pins the special BG fill and alternating BG/OBJ palette restoration", () => {
    expect(moonlightBackgroundAtAge(222)).toEqual({
      mode: "solid", color: { r: 0, g: 0, b: 0 },
    });
    expect(moonlightBackgroundAtAge(237)).toEqual({
      mode: "solid", color: { r: 222, g: 239, b: 255 },
    });
    expect([276, 277, 278, 291, 292].map(moonlightBackgroundAtAge)).toEqual([
      { mode: "blend", target: "moonWhite", coefficient: 16 },
      { mode: "blend", target: "moonWhite", coefficient: 14 },
      { mode: "blend", target: "moonWhite", coefficient: 14 },
      { mode: "blend", target: "moonWhite", coefficient: 0 },
      { mode: "blend", target: "moonWhite", coefficient: 0 },
    ]);
    expect([224, 225, 226, 238, 239, 277, 278, 279, 292].map(
      moonlightEndPaletteCoefficient,
    )).toEqual([0, 2, 2, 14, 16, 16, 14, 14, 0]);
  });

  it("owns one moon, five staggered sparkles, four shared stars, and cleanup", () => {
    const center = { x: 72, y: 98 };
    expect(moonlightAtAge(40, "player", 72, center).moonVisible).toBe(false);
    expect(moonlightAtAge(41, "player", 72, center).moonVisible).toBe(true);
    expect(moonlightAtAge(201, "player", 72, center).sparkles).toHaveLength(5);
    expect(moonlightAtAge(245, "player", 72, center).sparkles).toHaveLength(0);
    expect(moonlightAtAge(
      MOONLIGHT_HEALING_START_AGE, "player", 72, center,
    ).stars).toHaveLength(1);
    expect(moonlightAtAge(325, "player", 72, center).stars.map(
      (star) => star.oamSlot,
    )).toEqual([4, 5, 3]);
    expect(moonlightAtAge(
      MOONLIGHT_FRAME_COUNT - 1, "player", 72, center,
    )).toMatchObject({ active: true, moonLoaded: false });
    expect(moonlightAtAge(
      MOONLIGHT_FRAME_COUNT, "player", 72, center,
    ).active).toBe(false);
  });
});
