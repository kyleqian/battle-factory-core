import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyIcyWindEvidence } from "../../tools/compare/verifyIcyWindEvidence.ts";

describe("MOVE_ICY_WIND dense Scene-ON evidence checkpoint", () => {
  it("verifies the complete bilateral source, callback, latch, audio, RGB, and cleanup receipts", () => {
    expect(verifyIcyWindEvidence(resolve("."))).toEqual([
      { orientation: "player-back", frames: 287, snowballs: 10, step2Rows: 320, spikes: 13, oamRows: 286, matrixRows: 286, paletteRows: 285, rgbRows: 287 },
      { orientation: "opponent-front", frames: 287, snowballs: 10, step2Rows: 320, spikes: 13, oamRows: 286, matrixRows: 286, paletteRows: 285, rgbRows: 287 },
    ]);
  });
});
