import { describe, expect, it } from "vitest";
import {
  earthquakeAnimationAtAge,
  earthquakePaletteAtAge,
  horizontalShakeAtAge,
} from "../../src/animation/earthquake.ts";

describe("MOVE_EARTHQUAKE source reducers", () => {
  it("runs both literal (10,50) horizontal shakes on the source task cadence", () => {
    expect(horizontalShakeAtAge(0, 10, 50)).toMatchObject({
      active: true, delay: 0, timer: 0, horizontalOffset: 13,
      platformX: 0, battlerX2: 0,
    });
    expect(horizontalShakeAtAge(1, 10, 50)).toMatchObject({
      delay: 1, timer: 0, platformX: 0, battlerX2: 0,
    });
    expect(horizontalShakeAtAge(2, 10, 50)).toMatchObject({
      delay: 0, timer: 1, platformX: 13, battlerX2: 7,
    });
    expect(horizontalShakeAtAge(4, 10, 50)).toMatchObject({
      timer: 2, platformX: -13, battlerX2: -6,
    });
    expect(horizontalShakeAtAge(100, 10, 50)).toMatchObject({
      taskState: 1, timer: 0, horizontalOffset: 12,
      platformX: -13, battlerX2: -6,
    });
    expect(horizontalShakeAtAge(196, 10, 50)).toMatchObject({
      taskState: 2, horizontalOffset: 0, platformX: -1, battlerX2: 0,
    });
    expect(horizontalShakeAtAge(197, 10, 50)).toMatchObject({
      active: false, platformX: 0, battlerX2: 0,
    });
  });

  it("replays both literal delay-3/count-1 black14-to-white14 BG pulses", () => {
    expect(earthquakePaletteAtAge(9).active).toBe(false);
    expect(earthquakePaletteAtAge(10)).toEqual({
      active: true, timer: 3, remainingBlends: 1,
      color: "black", coefficient: 14,
    });
    expect(earthquakePaletteAtAge(13)).toMatchObject({
      timer: 0, remainingBlends: 1, color: "black",
    });
    expect(earthquakePaletteAtAge(14)).toMatchObject({
      remainingBlends: 0, color: "white",
    });
    expect(earthquakePaletteAtAge(18)).toMatchObject({
      active: true, color: "white",
    });
    expect(earthquakePaletteAtAge(19).active).toBe(false);
    expect(earthquakePaletteAtAge(26).color).toBe("black");
    expect(earthquakePaletteAtAge(35).active).toBe(false);
  });

  it("composes the simultaneous task and palette state without mechanics", () => {
    expect(earthquakeAnimationAtAge(10)).toEqual({
      shake: horizontalShakeAtAge(10, 10, 50),
      palette: earthquakePaletteAtAge(10),
    });
  });
});
