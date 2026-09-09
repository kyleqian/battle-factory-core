import { describe, expect, it } from "vitest";
import receipt from "../../tools/compare/fixtures/petal-dance-evidence.json" with { type: "json" };
import { verifyPetalDanceEvidence } from "../../tools/compare/petalDanceEvidence.ts";

describe("MOVE_PETAL_DANCE complete bilateral dense evidence", () => {
  it("replays the strict twice-fresh unsupported evidence receipt", () => {
    const first = verifyPetalDanceEvidence();
    const second = verifyPetalDanceEvidence();
    expect(second).toEqual(first);
    expect(receipt).toMatchObject({
      schema: "petal-dance-bilateral-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_PETAL_DANCE",
      moveId: 80,
      status: "unsupported-evidence",
      coverageCredit: false,
      acceptance: { freshRunsPerOrientation: 2, sourceRowsPerOrientation: 244, rawRgbRowsPerOrientation: 244, firstInactiveCleanupAge: 243 },
      evidenceScope: {
        sourceAudit: true,
        completePointerBody: true,
        fullDenseRowsRetained: true,
        twiceFreshByteIdentical: true,
        chronologicalRawRgb: true,
        normalizedBankedChangeMaps: true,
        flowerCallbacksAndLifetimes: true,
        ellipseTask: true,
        slideHitSplatShake: true,
        monbgAlphaBgRegisters: true,
        displayTransferFacts: true,
        audio: true,
        allocatorOrder: true,
        resources: true,
        animationRngVersusGameplayRng: true,
        partiesBattlersControllerEngineStable: true,
        firstInactiveCleanup: true,
        productionAnimationChanged: false,
        reducerAdded: false,
        typedSeamAdded: false,
        compositorAdded: false,
        framebufferAcceptance: false,
        coveragePromotion: false,
        componentTrackCredit: false,
        siblingCredit: false,
        latchPromotion: false,
        gameplayStateOwned: false,
        queueOnlyPetalDance: true,
      },
    });
  });

  it("retains all 13 generated components and both complete cleanup windows", () => {
    expect(receipt.components).toHaveLength(13);
    expect(receipt.measured).toMatchObject({
      rowsPerOrientation: 244,
      totalDenseRows: 488,
      flower: { bigLives: 3, smallLives: 10, bigRows: 417, smallRows: 950, peakFlowers: 13 },
      tasks: { ellipse: [10, 199], shake: [206, 219], monbgUpdate: [7, 241], monbgClear: [239, 241] },
      slides: { offset: [201, 206], original: [231, 237], hitsplat: [206, 214] },
      displayTransfer: { oam: "243/243 predecessor", matrices: "243/243 predecessor", palette: "242/243 predecessor; age 7 same-row monbg" },
      resources: { flowerTag: 10159, impactTag: 10135, tagTransitions: [1, 4, 243], matrixBitmapTransitions: [206, 215] },
      cleanupAge: 243,
    });
    expect(receipt.orientations["player-back"].sourceWindow).toEqual({ startFrame: 215, endFrame: 458, frameCount: 244, sourceFrameCount: 244 });
    expect(receipt.orientations["opponent-front"].sourceWindow).toEqual({ startFrame: 217, endFrame: 460, frameCount: 244, sourceFrameCount: 244 });
  });
});
