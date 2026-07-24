import { describe, expect, it } from "vitest";
import {
  extremeSpeedAttackerAffineAtAge,
  extremeSpeedBackgroundAtAge,
  extremeSpeedImpactAtAge,
} from "../src/engine/extremeSpeed.ts";

describe("Extreme Speed source reducers", () => {
  it("selects and scrolls the high-speed background by attacker side", () => {
    expect(extremeSpeedBackgroundAtAge(51, "opponent")).toEqual({
      background: "default", bldy: 0, scrollX: 0,
    });
    expect(extremeSpeedBackgroundAtAge(52, "opponent").bldy).toBe(1);
    expect(extremeSpeedBackgroundAtAge(67, "opponent").bldy).toBe(16);
    expect(extremeSpeedBackgroundAtAge(69, "opponent").scrollX).toBe(9);
    expect(extremeSpeedBackgroundAtAge(69, "player").scrollX).toBe(-9);
    expect(extremeSpeedBackgroundAtAge(86, "opponent")).toEqual({
      background: "highspeed", bldy: 0, scrollX: 162,
    });
    expect(extremeSpeedBackgroundAtAge(318, "opponent").bldy).toBe(1);
    expect(extremeSpeedBackgroundAtAge(335, "opponent")).toEqual({
      background: "default", bldy: 16, scrollX: 0,
    });
    expect(extremeSpeedBackgroundAtAge(354, "player")).toEqual({
      background: "default", bldy: 0, scrollX: 0,
    });
  });

  it("keeps the attacker affine program pure and immutable", () => {
    const before = extremeSpeedAttackerAffineAtAge(87);
    expect(before).toEqual({ xScale: 256, yScale: 256, invisible: false });
    expect(extremeSpeedAttackerAffineAtAge(88)).toEqual({
      xScale: 352, yScale: 243, invisible: false,
    });
    expect(extremeSpeedAttackerAffineAtAge(95)).toEqual({
      xScale: 1024, yScale: 152, invisible: false,
    });
    expect(extremeSpeedAttackerAffineAtAge(96).invisible).toBe(true);
    expect(extremeSpeedAttackerAffineAtAge(87)).toEqual(before);
  });

  it("signs the independently resolved impact displacement by target side", () => {
    expect(extremeSpeedImpactAtAge(122, "player")).toEqual({
      targetX2: 0, hitsplatIndex: null,
    });
    expect(extremeSpeedImpactAtAge(123, "player")).toEqual({
      targetX2: 8, hitsplatIndex: 0,
    });
    expect(extremeSpeedImpactAtAge(123, "opponent")).toEqual({
      targetX2: -8, hitsplatIndex: 0,
    });
    expect(extremeSpeedImpactAtAge(183, "player")).toEqual({
      targetX2: 0, hitsplatIndex: null,
    });
  });
});
