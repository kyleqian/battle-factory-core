import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { verifyWaterSpoutEvidence } from "../../tools/compare/waterSpoutEvidence.ts";

describe("MOVE_WATER_SPOUT complete bilateral full-HP evidence", () => {
  it("retains two byte-identical fresh runs and every dense raw-RGB row per orientation", () => {
    const result = verifyWaterSpoutEvidence();
    expect(result["player-back"]).toMatchObject({ rows: 278, dense: "cc00322d80bd2197f6e530555f25485adccbab7fec5af29bde2097ecdd8a96f8", rawRgb: "46d771da3a25d55448682111bac724b87437cbef692490ab320c5198128b19ea" });
    expect(result["opponent-front"]).toMatchObject({ rows: 278, dense: "8fd88e1f38c42acae3429474e3fee8125f599931cee5b8daf7caf7e375705d33", rawRgb: "d22ffad4d4037c4da618d60438e84646f9f10d945e11f9e09b5f46f815bac0e6" });
  });

  it.each([
    ["player-back", "tools/compare/evidence/water-spout-changemap-player.json", [10, 87], [107, 195]],
    ["opponent-front", "tools/compare/evidence/water-spout-changemap-opponent.json", [10, 82], [102, 195]],
  ])("pins %s source-relative allocation, latches, live tier, RNG, audio, and cleanup", (_side, path, launch, rain) => {
    const map = JSON.parse(readFileSync(path, "utf8"));
    expect(map).toMatchObject({
      schema: "water-spout-normalized-change-map/v1",
      selectors: { liveHpPowerTier: 3 },
      latches: { oam: 277, matrices: 229, palette: 276, denominator: 277 },
      resources: { glowyBlueOrb: { tag: 10268, first: 1, last: 276, count: 276 }, waterImpact: { tag: 10148, first: 4, last: 276, count: 273 } },
      cleanup: { age: 277, inactive: true, resourcesFreed: true, tasks: 0, sprites: 0 },
    });
    expect(map.taskLives.map((life: any) => [life.symbol, life.start, life.end])).toEqual([
      ["AnimTask_WaterSpoutLaunch_Step", ...launch], ["AnimTask_WaterSpoutRain_Step", ...rain], ["AnimTask_ShakeBattlers", 116, 275],
    ]);
    expect(map.allocations.launchOrbs).toHaveLength(20);
    expect(map.rng.gameplayTransitions).toEqual([]);
    expect(map.rng.animationTransitions).toHaveLength(275);
    expect(map.sourceRows).toHaveLength(278);
  });

  it("keeps the move and component track explicitly unsupported", () => {
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/water-spout-evidence.json", "utf8"));
    expect(receipt).toMatchObject({ status: "unsupported", coverageCredit: false, fullHpPowerTier: 3,
      scope: { completePointerBody: true, fullDenseRowsRetained: true, rawRgbRetained: true, twiceFreshByteIdentical: true,
        reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false } });
  });
});
