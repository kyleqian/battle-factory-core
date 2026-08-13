import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyIcyWindEvidence } from "../../tools/compare/verifyIcyWindEvidence.ts";

describe("MOVE_ICY_WIND dense Scene-ON evidence checkpoint", () => {
  it("verifies the complete bilateral source, callback, latch, audio, RGB, and cleanup receipts", () => {
    const results = verifyIcyWindEvidence(resolve("."));
    expect(results.map(({ residuals, ...result }) => ({ ...result, residualCount: residuals.length }))).toEqual([
      { orientation: "player-back", frames: 287, snowballs: 10, step2Rows: 320, spikes: 13, oamRows: 286, matrixRows: 286, paletteRows: 285, rgbRows: 287, seamRows: 287, framebufferRows: 209, residualCount: 78 },
      { orientation: "opponent-front", frames: 287, snowballs: 10, step2Rows: 320, spikes: 13, oamRows: 286, matrixRows: 286, paletteRows: 285, rgbRows: 287, seamRows: 287, framebufferRows: 281, residualCount: 6 },
    ]);
    expect(results[0]!.residuals[0]).toContain("age 93: 8px");
    expect(results[0]!.residuals.at(-1)).toContain("age 176: 11px");
    expect(results[1]!.residuals[0]).toContain("age 129: 18px");
    expect(results[1]!.residuals.at(-1)).toContain("age 158: 2px");
  });
});
