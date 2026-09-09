import { describe, expect, it } from "vitest";
import { spiderWebActualCoreVerdict } from "../../tools/compare/spiderWebActualCore.ts";

describe("MOVE_SPIDER_WEB live Scene-ON compositor", () => {
  it("matches every bilateral row in two fresh actual-core processes and changes under the live control", () => {
    const first = spiderWebActualCoreVerdict();
    const second = spiderWebActualCoreVerdict();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "spider-web-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_SPIDER_WEB",
      passes: 1,
      rows: 414,
      componentMatched: 414,
      framebufferMatched: 414,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 207, componentMatched: 207,
          framebufferMatched: 207, residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 207, componentMatched: 207,
          framebufferMatched: 207, residualPixels: 0, failures: [] },
      ],
      alteredControl: {
        species: ["SURSKIT", "RELICANTH"],
        geometryChanged: true,
        allocationMatrixOrderChanged: true,
      },
    });
    expect(first.alteredControl.canonical).not.toBe(first.alteredControl.changed);
  });
});
