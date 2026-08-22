import { describe, expect, it } from "vitest";
import { verifyHailReducer } from "../../tools/compare/verifyHailReducer.ts";

describe("MOVE_HAIL source-relative reducer and Scene-ON seam", () => {
  it("retains both complete dense orientations through inactive cleanup", () => {
    expect(verifyHailReducer()).toEqual({
      "player-back": {
        reducerRows: 158,
        seamRows: 158,
        lifecycle: { particleCreates: 30, impactCreates: 4, peakHail: 6, peakSprites: 8 },
        cleanup: { age: 157, active: false, sprites: 0, tasks: 0, framebufferCompared: false },
      },
      "opponent-front": {
        reducerRows: 158,
        seamRows: 158,
        lifecycle: { particleCreates: 30, impactCreates: 4, peakHail: 6, peakSprites: 8 },
        cleanup: { age: 157, active: false, sprites: 0, tasks: 0, framebufferCompared: false },
      },
    });
  });
});
