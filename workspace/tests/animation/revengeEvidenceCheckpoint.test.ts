import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/revenge-evidence.json" with { type: "json" };
import { verifyRevengeEvidence } from "../../tools/compare/revengeEvidence.ts";

describe("MOVE_REVENGE complete bilateral Scene-ON evidence checkpoint", () => {
  it("replays every retained dense state, chronological RGB, latch, and normalized-map row", () => {
    const first = verifyRevengeEvidence(); expect(verifyRevengeEvidence()).toEqual(first);
    expect(first).toMatchObject({ schema: "revenge-bilateral-evidence/v1", move: "MOVE_REVENGE", status: "unsupported-evidence", coverageCredit: false, orientations: {
      "player-back": { rows: 145, startFrame: 238, endFrame: 382, cleanupAge: 144, probeJsonSha256: "5b432fa8db00fcf7f38fedd46b92909a1725c803ec72abed78beea1827048a52", rawRgbSequenceSha256: "1fcf5f5601a2c0ddf800dda02306188add5daed373a6dd797eae2aaa9ab8633e", changeMapSha256: "3202d7fa26264e89fc45ad5949a252b11adbfe043a8332ce02ba132eb7769183" },
      "opponent-front": { rows: 145, startFrame: 235, endFrame: 379, cleanupAge: 144, probeJsonSha256: "b41abed8b8f49f238a87c1e678522fe0314f9bc9ef2a7b22957d86eb7d871638", rawRgbSequenceSha256: "47e7b19f93c49574783388d9e0c71827d7412c3eede51b61d0fb5172029674f8", changeMapSha256: "749c863d6af41520b1dc3e8865fd8cfd570b1684f982a61a15b2bbe48913d1f4" },
    }, scope: { sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedBankedMaps: true, twiceFreshByteIdentical: true, legalBilateralParties: true, smallAndBigScratchVariants: true, attackerBlendCycle: true, horizontalLunge: true, targetShakeMon2: true, persistentHits: true, audioAndResources: true, firstInactiveCleanup: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false } });
    expect(fixture.acceptance).toEqual({ freshRunsPerOrientation: 2, rows: { "player-back": 145, "opponent-front": 145 }, totalRows: 290, firstInactiveCleanupRetained: true, productionFramebufferCompared: false });
  });

  it("keeps the move unsupported and the isolated component track unfulfilled", () => {
    expect(coverage.entries.find((entry) => entry.move === "MOVE_REVENGE")).toBeUndefined();
    expect(coverage.queue).not.toContain("MOVE_REVENGE");
    expect(coverage.componentTracks.find((track) => track.id === "revenge-purple-scratch-persist-hit")).toMatchObject({ representatives: ["MOVE_REVENGE"], fulfilled: false });
    expect(fixture.status).toBe("unsupported-evidence"); expect(fixture.coverageCredit).toBe(false);
  });
});
