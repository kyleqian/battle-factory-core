import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import receipt from "../../tools/compare/fixtures/sunny-day-evidence.json" with { type: "json" };
import { verifySunnyDayEvidence } from "../../tools/compare/sunnyDayEvidence.ts";

type Json = Record<string, any>;

describe("MOVE_SUNNY_DAY complete unsupported dense evidence", () => {
  it("replays the strict bilateral receipt and keeps the source-relative cleanup boundary", () => {
    const first = verifySunnyDayEvidence();
    const second = verifySunnyDayEvidence();
    expect(second).toEqual(first);
    expect(receipt).toMatchObject({
      schema: "sunny-day-bilateral-evidence/v1",
      move: "MOVE_SUNNY_DAY",
      moveId: 241,
      oracleProfile: "battle-scene-on",
      status: "unsupported-evidence",
      coverageCredit: false,
      acceptance: { freshRunsPerOrientation: 2, sourceRows: 316, rawRgbRows: 316, firstInactiveCleanupAge: 157 },
      evidenceScope: {
        sourceAudit: true,
        completePointerBody: true,
        fullDenseRowsRetained: true,
        twiceFreshByteIdentical: true,
        normalizedMaps: true,
        legalBilateralParties: true,
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
        sourceWindow: { startFrame: 211, endFrame: 368, frameCount: 158, sourceFrameCount: 158 },
        denseRows: 158,
        rawRgbRows: 158,
        state: {
          partiesStable: true,
          battlersStable: true,
          engineStable: true,
          immutableStable: true,
          rawBattleStateStable: true,
          gameplayRngTransitions: [],
          animationRngDistinct: 156,
        },
        cleanup: { age: 157, frame: 368, active: false, visualTasks: 0, soundTasks: 0, rays: 0, sunlightPaletteTag: false, sunlightTileTag: false },
      });
      expect(first[side].taskRanges.oam.hardwareEqualsPrecedingSoftware).toBe("157/157");
      expect(first[side].taskRanges.matrix.hardwareEqualsPrecedingSoftware).toBe("157/157");
      expect(first[side].taskRanges.displayTransfer.hardwarePaletteEqualsPrecedingFaded).toBe("157/157");
    }
  });

  it("retains normalized source rows and chronological RGB archive paths for both legal orientations", () => {
    for (const side of ["player", "opponent"] as const) {
      const map = JSON.parse(readFileSync(`tools/compare/evidence/sunny-day-changemap-${side}.json`, "utf8")) as Json;
      expect(map).toMatchObject({ schema: "sunny-day-normalized-change-map/v1", sourceWindow: { frameCount: 158 } });
      expect(map.sourceRows).toHaveLength(158);
      expect(map.sourceRows[0]).toMatchObject({ age: 0, frame: 211, owner: "Move_SUNNY_DAY", pointer: 137176839, parity: 1, offset: 0, active: true });
      expect(map.sourceRows.at(-1)).toMatchObject({ age: 157, frame: 368, owner: "Move_SUNNY_DAY", pointer: 137176914, parity: 0, offset: 75, active: false });
      expect(map.lifetimes.sunlightRays.map((ray: Json) => [ray.slot, ray.start, ray.end])).toEqual([[3, 20, 80], [4, 28, 88], [5, 36, 96], [7, 44, 104]]);
      expect(map.lifetimes.resources).toMatchObject({ tag: "ANIM_TAG_SUNLIGHT", tagValue: 10157, paletteAndTileLiveAges: [1, 156], paletteAndTileCleanupAge: 157 });
      expect(map.lifetimes.monbg).toMatchObject({ updateTaskRanges: [[4, 121]], clearTaskRanges: [[119, 121]], bgVramChanges: [5, 121, 123] });
      expect(map.cleanup).toMatchObject({ age: 157, active: false, visualTasks: 0, soundTasks: 0, rays: 0 });
    }
  });
});
