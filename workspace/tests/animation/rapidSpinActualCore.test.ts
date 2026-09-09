import { describe, expect, it } from "vitest";
import { rapidSpinActualCoreVerdict } from "../../tools/compare/rapidSpinActualCore.ts";

describe("MOVE_RAPID_SPIN live Scene-ON compositor", () => {
  it("matches every bilateral component/seam and actual-core framebuffer row twice", () => {
    const first = rapidSpinActualCoreVerdict();
    const second = rapidSpinActualCoreVerdict();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "rapid-spin-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_RAPID_SPIN",
      rows: 262,
      componentMatched: 262,
      framebufferMatched: 262,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 131, componentMatched: 131,
          framebufferMatched: 131, residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 131, componentMatched: 131,
          framebufferMatched: 131, residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: {
        species: ["TORKOAL", "RELICANTH"], geometryChanged: true,
        allocationOrderChanged: true, powerDamageRngChanged: true,
      },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
  });
});
