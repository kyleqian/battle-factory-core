import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  RAIN_DANCE_SELECTED_PALETTES,
  RAIN_DANCE_WINDOW_ROWS,
  rainDanceBlendCoefficientAtAge,
} from "../../src/animation/rainDance.ts";

describe("MOVE_RAIN_DANCE pure reducer and typed Scene-ON seam", () => {
  it("pins the source palette ramps without owning weather or gameplay RNG", () => {
    expect(RAIN_DANCE_WINDOW_ROWS).toBe(187);
    expect(RAIN_DANCE_SELECTED_PALETTES).toBe(0x0003000e);
    expect([7, 8, 11, 14, 17, 175, 176, 179, 182, 185].map(rainDanceBlendCoefficientAtAge))
      .toEqual([0, 1, 2, 3, 4, 4, 3, 2, 1, 0]);
  });

  it("reproduces every retained bilateral component-state row through the typed seam", () => {
    const summary = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/verifyRainDanceReducer.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    for (const orientation of ["player-back", "opponent-front"]) {
      expect(summary[orientation]).toMatchObject({
        reducerRows: 187,
        seamRows: 187,
        lifecycle: { creates: 80, destroys: 80, peak: 14 },
        paletteEdges: [1, 8, 11, 14, 17, 176, 179, 182, 185],
        cleanup: { age: 186, active: false, visualTasks: 0, soundTasks: 0, drops: 0 },
      });
    }
  });
});
