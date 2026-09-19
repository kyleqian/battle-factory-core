import { describe, expect, it } from "vitest";
import { skillSwapActualCoreVerdict } from "../../tools/compare/skillSwapActualCore.ts";

describe("MOVE_SKILL_SWAP complete actual-core acceptance", () => {
  it("matches every retained bilateral row and reacts to material live input", () => {
    const verdict = skillSwapActualCoreVerdict();
    expect(verdict).toMatchObject({
      schema: "skill-swap-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_SKILL_SWAP",
      rows: 391,
      componentMatched: 391,
      seamMatched: 391,
      rawRgbMatched: 391,
      framebufferMatched: 391,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 196, framebufferMatched: 196,
          residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 195, framebufferMatched: 195,
          residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: {
        species: ["CROBAT", "BLISSEY"], sidesAndGeometryChanged: true,
        allocationOrderOamMatricesChanged: true,
        resourcesPalettesRegistersAudioChanged: true, animationRngChanged: true,
        gameplayStateOpaqueAndUnchanged: true, gameplayRngOpaqueAndUnchanged: true,
      },
    });
    expect(verdict.alteredLiveControl.canonical)
      .not.toBe(verdict.alteredLiveControl.changed);
  });
});
