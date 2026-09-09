import { describe, expect, it } from "vitest";

import { foresightActualCoreVerdict } from "../../tools/compare/foresightActualCore.ts";

describe("MOVE_FORESIGHT actual-core dense acceptance", () => {
  it("matches every retained row and changes under live species/geometry/allocation control", () => {
    const first = foresightActualCoreVerdict();
    const second = foresightActualCoreVerdict();

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "foresight-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_FORESIGHT",
      rows: 334,
      componentMatched: 334,
      framebufferMatched: 334,
      residualPixels: 0,
      orientations: [
        {
          orientation: "player-back",
          rows: 167,
          componentMatched: 167,
          framebufferMatched: 167,
          residualPixels: 0,
          failures: [],
        },
        {
          orientation: "opponent-front",
          rows: 167,
          componentMatched: 167,
          framebufferMatched: 167,
          residualPixels: 0,
          failures: [],
        },
      ],
      alteredLiveControl: {
        species: ["TORKOAL", "RELICANTH"],
        geometryChanged: true,
        allocationChanged: true,
      },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(
      first.alteredLiveControl.changed,
    );
  });
});
