import { describe, expect, it } from "vitest";
import {
  AERIAL_ACE_LAST_BODY_AGE,
  AERIAL_ACE_PALETTE_FIRST_AGE,
  AERIAL_ACE_SHAKE_FIRST_AGE,
  AERIAL_ACE_SLICE_FIRST_AGE,
  AERIAL_ACE_TRAVEL_FIRST_AGE,
  aerialAceAnimationAtAge,
  aerialAceSliceAtAge,
  aerialAceTracesAtAge,
  aerialAceTravelAtAge,
} from "../src/engine/aerialAce.ts";

describe("portable AERIAL ACE source components", () => {
  it("pins the independent source-relative component clocks", () => {
    expect({
      slice: AERIAL_ACE_SLICE_FIRST_AGE,
      travel: AERIAL_ACE_TRAVEL_FIRST_AGE,
      palette: AERIAL_ACE_PALETTE_FIRST_AGE,
      shake: AERIAL_ACE_SHAKE_FIRST_AGE,
      last: AERIAL_ACE_LAST_BODY_AGE,
    }).toEqual({ slice: 50, travel: 51, palette: 57, shake: 59, last: 74 });
  });

  it("preserves signed fixed-point asymmetry instead of mirroring", () => {
    expect(
      [51, 52, 53, 54, 55, 56].map((age) =>
        aerialAceTravelAtAge(age, "opponent")),
    ).toEqual([
      { x2: -17, y2: 2 },
      { x2: -24, y2: 6 },
      { x2: -17, y2: 11 },
      { x2: 0, y2: 12 },
      { x2: 16, y2: 11 },
      { x2: 24, y2: 6 },
    ]);
    expect(
      [51, 52, 53, 54, 55, 56].map((age) =>
        aerialAceTravelAtAge(age, "player")),
    ).toEqual([
      { x2: 16, y2: 2 },
      { x2: 24, y2: 6 },
      { x2: 16, y2: 11 },
      { x2: 0, y2: 12 },
      { x2: -17, y2: 11 },
      { x2: -24, y2: 6 },
    ]);
  });

  it("pins AERIAL ACE's asymmetric TraceMon OAM order", () => {
    expect(aerialAceTracesAtAge(56, "opponent")).toEqual([
      { slot: 4, x2: -17, y2: 2, winsOamTie: false },
    ]);
    expect(aerialAceTracesAtAge(57, "opponent")).toEqual([
      { slot: 4, x2: -17, y2: 2, winsOamTie: true },
      { slot: 7, x2: 24, y2: 6, winsOamTie: true },
    ]);
    expect(aerialAceTracesAtAge(62, "player")).toEqual([
      { slot: 4, x2: 0, y2: 0, winsOamTie: false },
      { slot: 7, x2: -24, y2: 6, winsOamTie: true },
    ]);
  });

  it("pins the independent cutting slice and complex palette pulse", () => {
    expect(aerialAceSliceAtAge(49)).toBeNull();
    expect(aerialAceSliceAtAge(50)).toEqual({ x2: -4, y2: 4, frame: 0 });
    expect(aerialAceSliceAtAge(59)).toEqual({ x2: -36, y2: 35, frame: 2 });
    expect(aerialAceSliceAtAge(73)).toEqual({ x2: -63, y2: 62, frame: 3 });
    expect(aerialAceSliceAtAge(74)).toBeNull();
    expect([56, 57, 58, 59, 60].map(
      (age) => aerialAceAnimationAtAge(age, "opponent").paletteBlendCoeff,
    )).toEqual([0, 10, 10, 10, 0]);
  });

  it("pins the vertical target shake separately from QUICK ATTACK", () => {
    expect(
      [58, 59, 60, 61, 62, 63, 74, 75].map(
        (age) => aerialAceAnimationAtAge(age, "player").targetShakeY2,
      ),
    ).toEqual([0, 3, 3, 0, 0, 3, 0, 0]);
  });
});
