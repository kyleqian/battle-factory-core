import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import receipt from "../../tools/compare/fixtures/rapid-spin-evidence.json" with { type: "json" };
import { verifyRapidSpinEvidence } from "../../tools/compare/rapidSpinEvidence.ts";

type Json = Record<string, any>;

describe("MOVE_RAPID_SPIN complete bilateral dense evidence", () => {
  it("replays the strict twice-fresh pre-production receipt", () => {
    const first = verifyRapidSpinEvidence();
    const second = verifyRapidSpinEvidence();
    expect(second).toEqual(first);
    expect(receipt).toMatchObject({
      schema: "rapid-spin-bilateral-evidence/v1",
      move: "MOVE_RAPID_SPIN",
      moveId: 229,
      oracleProfile: "battle-scene-on",
      status: "unsupported-evidence",
      coverageCredit: false,
      acceptance: { freshRunsPerOrientation: 2, sourceRows: 262, rawRgbRows: 262, firstInactiveCleanupAge: 130 },
      evidenceScope: {
        sourceAudit: true,
        completePointerBody: true,
        fullDenseRowsRetained: true,
        twiceFreshByteIdentical: true,
        normalizedMaps: true,
        legalBilateralParties: true,
        sourcePointersAndParity: true,
        gAnimMovePower: true,
        rapidSpinSprite: true,
        impactAffineOam: true,
        rapinElevationScanline: true,
        targetPowerShake: true,
        monbgBgRegisters: true,
        displayTransferFacts: true,
        audio: true,
        allocatorOrder: true,
        animationRngVersusGameplayRng: true,
        partiesBattlersControllerEngineStable: true,
        firstInactiveCleanup: true,
        productionAnimationChanged: false,
        reducerAdded: false,
        typedSeamAdded: false,
        compositorAdded: false,
        coveragePromotion: false,
        componentTrackCredit: false,
        latchPromotion: false,
        gameplayStateOwned: false,
      },
    });
    for (const side of ["player-back", "opponent-front"] as const) {
      expect(first[side]).toMatchObject({
        sourceWindow: { frameCount: 131, sourceFrameCount: 131 },
        denseRows: 131,
        rawRgbRows: 131,
        displayTransfer: { oam: "130/130", matrices: "130/130", palette: "130/130" },
        cleanup: { age: 130, active: false, visualTasks: 0, soundTasks: 0, tasks: 0, rapidSprites: 0, impactSprites: 0, scanlineState: 0 },
        taskRanges: {
          elevation: [[10, 51], [83, 124]],
          shake: [[53, 71]],
          monbgUpdate: [[7, 128]],
          monbgClear: [[126, 128]],
          sound: [[10, 35], [83, 108]],
        },
      });
    }
  });

  it("retains normalized source/change rows and both orientation maps", () => {
    for (const side of ["player", "opponent"] as const) {
      const map = JSON.parse(readFileSync(`tools/compare/evidence/rapid-spin-changemap-${side}.json`, "utf8")) as Json;
      expect(map).toMatchObject({ schema: "rapid-spin-normalized-change-map/v1", sourceWindow: { frameCount: 131 } });
      expect(map.sourceRows).toHaveLength(131);
      expect(map.sourceRows[0]).toMatchObject({ age: 0, owner: "Move_RAPID_SPIN", offset: 0, active: true });
      expect(map.sourceRows.at(-1)).toMatchObject({ age: 130, owner: "Move_RAPID_SPIN", offset: 108, active: false });
      expect(map.lifecycles.rapidSpin).toEqual([{ slot: 3, start: 10, end: 41, first: expect.anything(), callbacks: [[10, "AnimRapidSpin_Step"]] }]);
      expect(map.lifecycles.impact).toEqual([{ slot: 3, start: 53, end: 62, first: expect.anything(), callbacks: [[53, "RunStoredCallbackWhenAffineAnimEnds"], [62, "DestroyAnimSprite"]] }]);
      expect(map.lifecycles.tasks).toEqual({
        elevation: [[10, 51], [83, 124]],
        shake: [[53, 71]],
        monbgUpdate: [[7, 128]],
        monbgClear: [[126, 128]],
        sound: [[10, 35], [83, 108]],
      });
      expect(map.displayTransfer).toEqual({ oam: "130/130", matrices: "130/130", palette: "130/130" });
      expect(map.cleanup).toMatchObject({ age: 130, active: false, visualTasks: 0, soundTasks: 0, tasks: 0, rapidSprites: 0, impactSprites: 0, impactTag: false, rapidTag: false, scanlineState: 0 });
    }
  });
});
