import { describe, expect, it } from "vitest";
import { magnitudeFirstInactiveAge } from "../src/animation/magnitude.ts";

// mxp1: Move_MAGNITUDE's gAnimScriptActive length is 118 + 8 * floor(power / 10) rows (ROM labs mxp1-mag-p5 power 30: 142; mxp1-mag-p9 power 70: 174).
describe("Magnitude body length (mxp1)", () => {
  it.each([[30, 142], [50, 158], [70, 174], [90, 190], [110, 206], [150, 238]])("power %i: first inactive age %i", (power, length) => {
    expect(magnitudeFirstInactiveAge(power)).toBe(length);
  });
});
