import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import receipt from "../../tools/compare/fixtures/uproar-evidence.json" with { type: "json" };
import { verifyUproarEvidence } from "../../tools/compare/uproarEvidence.ts";

type Json = Record<string, any>;

describe("MOVE_UPROAR complete unsupported bilateral dense evidence", () => {
  it("replays the strict twice-fresh receipt and keeps Uproar unsupported", () => {
    const first = verifyUproarEvidence();
    const second = verifyUproarEvidence();
    expect(second).toEqual(first);
    expect(receipt).toMatchObject({
      schema: "uproar-bilateral-evidence/v1",
      move: "MOVE_UPROAR",
      moveId: 253,
      oracleProfile: "battle-scene-on",
      status: "unsupported-evidence",
      coverageCredit: false,
      acceptance: { freshRunsPerOrientation: 2, sourceRows: 146, rawRgbRows: 146, firstInactiveCleanupAge: 72 },
      evidenceScope: {
        sourceAudit: true,
        completePointerBody: true,
        fullDenseRowsRetained: true,
        twiceFreshByteIdentical: true,
        normalizedMaps: true,
        legalBilateralParties: true,
        sourcePointersAndParity: true,
        threeDistortionRingNotePulses: true,
        allocatorOrder: true,
        monbgBgRegisters: true,
        displayTransferFacts: true,
        audio: true,
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
        sourceWindow: { frameCount: 73, sourceFrameCount: 73 },
        denseRows: 73,
        rawRgbRows: 73,
        state: { partiesStable: true, battlersStable: true, controllerEngineStable: true, rawBattleStateStable: true },
        cleanup: { age: 72, active: false, visualTasks: 0, soundTasks: 0, ringSprites: 0, noteSprites: 0, ringTag: false, noteTag: false },
      });
      expect(first[side].taskRanges.distortion.taskRanges).toEqual([[10, 21], [28, 39], [46, 57]]);
      expect(first[side].taskRanges.displayTransfer).toEqual({
        hardwareOamEqualsPrecedingSoftware: "72/72",
        hardwareMatricesEqualsPrecedingSoftware: "36/72",
        hardwarePaletteEqualsPrecedingFaded: "71/72",
      });
    }
  });

  it("retains normalized source/change rows and both orientation maps", () => {
    for (const side of ["player", "opponent"] as const) {
      const map = JSON.parse(readFileSync(`tools/compare/evidence/uproar-changemap-${side}.json`, "utf8")) as Json;
      expect(map).toMatchObject({ schema: "uproar-normalized-change-map/v1", sourceWindow: { frameCount: 73 } });
      expect(map.sourceRows).toHaveLength(73);
      expect(map.sourceRows[0]).toMatchObject({ age: 0, owner: "Move_UPROAR", offset: 0, active: true });
      expect(map.sourceRows.at(-1)).toMatchObject({ age: 72, owner: "Move_UPROAR", offset: 201, active: false });
      expect(map.lifetimes.rings.map((ring: Json) => [ring.slot, ring.start, ring.end]))
        .toEqual([[3, 10, 25], [3, 28, 43], [3, 46, 61]]);
      expect(map.lifetimes.notes.map((note: Json) => [note.slot, note.start, note.end]))
        .toEqual([[4, 10, 25], [5, 10, 25], [4, 28, 43], [5, 28, 43], [4, 46, 61], [5, 46, 61]]);
      expect(map.lifetimes.monbg).toMatchObject({
        updateTaskRanges: [[7, 65]], clearTaskRanges: [[63, 65]], bgVramChanges: [8, 65, 67], registerChanges: [1, 8, 67],
      });
      expect(map.audio.pulseAges).toEqual([10, 28, 46]);
      expect(map.cleanup).toMatchObject({ age: 72, active: false, ringSprites: 0, noteSprites: 0, ringTag: false, noteTag: false });
    }
  });
});
