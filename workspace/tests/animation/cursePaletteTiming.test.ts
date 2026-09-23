import { describe, expect, it } from "vitest";
import { verifyCursePaletteTiming } from "../../tools/compare/cursePaletteTiming.ts";

describe("MOVE_CURSE direct palette-transfer timing evidence", () => {
  it("pins twice-fresh VCOUNT/HBlank observations without pixel-derived input", () => {
    expect(verifyCursePaletteTiming()).toMatchObject({
      schema: "curse-palette-transfer-timing-verdict/v1",
      move: "MOVE_CURSE",
      sourceTimed: true,
      pixelIndependent: true,
      orientations: {
        "player-back": { vcount: 17, inHBlank: true, firstPostTransferScanline: 18 },
        "opponent-front": { vcount: 14, inHBlank: false, firstPostTransferScanline: 14 },
      },
    });
  });
});
