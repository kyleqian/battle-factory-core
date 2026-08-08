import { describe, expect, it } from "vitest";
import { doubleTeamClonePalette } from "../src/engine/battleScene.ts";
import type { RgbColor } from "../src/engine/bg.ts";

function blendComponentToward(component8: number, target8: number, coeff: number): number {
  const c5 = component8 >> 3;
  const t5 = target8 >> 3;
  const b5 = c5 + (((t5 - c5) * coeff) >> 4);
  return (b5 << 3) | (b5 >> 2);
}

function directDoubleTeamBlend(palette: readonly RgbColor[]): RgbColor[] {
  return palette.map(({ r, g, b }) => ({
    r: blendComponentToward(r, 0, 11),
    g: blendComponentToward(g, 0, 11),
    b: blendComponentToward(b, 0, 11),
  }));
}

describe("doubleTeamClonePalette", () => {
  it("memoizes by source-palette identity without making either input order-dependent", () => {
    const first = [{ r: 248, g: 120, b: 40 }, { r: 80, g: 160, b: 240 }];
    const second = [{ r: 16, g: 72, b: 136 }, { r: 224, g: 32, b: 96 }];

    for (const [a, b] of [[first, second], [second, first]] as const) {
      expect(doubleTeamClonePalette(a)).toEqual(directDoubleTeamBlend(a));
      expect(doubleTeamClonePalette(b)).toEqual(directDoubleTeamBlend(b));
    }
  });
});
