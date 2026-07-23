import { describe, expect, it } from "vitest";
import { magbySendOutAnimation } from "../src/engine/magbySendOut.ts";

describe("MAGBY forced-switch back animation", () => {
  it("reduces overlapping ball-fade and red-glow palette ownership from the release clock", () => {
    expect(magbySendOutAnimation(16).tint).toEqual({ kind: "ball", coeff: 16 });
    expect(magbySendOutAnimation(17).tint).toEqual({ kind: "red", coeff: 0 });
    expect(magbySendOutAnimation(20).tint).toEqual({ kind: "red", coeff: 1 });
    expect(magbySendOutAnimation(22).tint).toEqual({ kind: "ball", coeff: 16 });
    expect(magbySendOutAnimation(37).tint).toEqual({ kind: "ball", coeff: 1 });
    expect(magbySendOutAnimation(38).tint).toEqual({ kind: "red", coeff: 0 });
    expect(magbySendOutAnimation(39).tint).toEqual({ kind: "red", coeff: 6 });
    expect(magbySendOutAnimation(42).tint).toEqual({ kind: "red", coeff: 6 });
    expect(magbySendOutAnimation(143).tint).toEqual({ kind: "red", coeff: 0 });
  });

  it("reproduces ShakeGlow_Move's single source-sine horizontal excursion", () => {
    expect(Array.from({ length: 20 }, (_, i) => magbySendOutAnimation(72 + i).x2)).toEqual([
      -2, -4, -5, -5, -4, -1, 1, 4, 6, 6,
      6, 4, 2, -1, -4, -5, -5, -4, -2, 0,
    ]);
    expect(magbySendOutAnimation(71).x2).toBe(0);
    expect(magbySendOutAnimation(92).x2).toBe(0);
  });
});
