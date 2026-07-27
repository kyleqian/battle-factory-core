import { describe, expect, it } from "vitest";
import {
  shakeMonInPlaceOffsetAtTick,
  shakeMonInPlaceSequence,
} from "../../src/animation/shakeMonInPlace.ts";

describe("AnimTask_ShakeMonInPlace source port", () => {
  it("reproduces Knock Off's target y shake (0,3,6,1)", () => {
    expect(shakeMonInPlaceSequence(0, 3, 6, 1)).toEqual([
      { x2: 0, y2: -3 },
      { x2: 0, y2: -3 },
      { x2: 0, y2: 3 },
      { x2: 0, y2: 3 },
      { x2: 0, y2: -3 },
      { x2: 0, y2: -3 },
      { x2: 0, y2: 3 },
      { x2: 0, y2: 3 },
      { x2: 0, y2: -3 },
      { x2: 0, y2: -3 },
      { x2: 0, y2: 0 },
    ]);
    expect(shakeMonInPlaceOffsetAtTick(0, 3, 6, 1, 11)).toEqual({
      x2: 0,
      y2: 0,
    });
  });

  it("covers Super Fang's horizontal source arguments without move logic", () => {
    expect(shakeMonInPlaceOffsetAtTick(1, 0, 20, 1, 0)).toEqual({
      x2: -1,
      y2: 0,
    });
    expect(shakeMonInPlaceOffsetAtTick(1, 0, 20, 1, 2)).toEqual({
      x2: 1,
      y2: 0,
    });
  });
});
