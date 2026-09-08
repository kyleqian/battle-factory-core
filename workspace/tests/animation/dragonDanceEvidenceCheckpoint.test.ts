import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/dragon-dance-evidence.json" with { type: "json" };
import { verifyDragonDanceEvidence } from "../../tools/compare/dragonDanceEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_DRAGON_DANCE complete bilateral exact evidence", () => {
  it("replays every retained semantic, hardware, raw-RGB, and normalized-map row twice", () => {
    const first = verifyDragonDanceEvidence(), second = verifyDragonDanceEvidence();
    expect(second).toEqual(first);
    expect(first).toEqual({
      schema: "dragon-dance-bilateral-evidence/v1", status: "exact", coverageCredit: true,
      orientations: {
        "player-back": { rows: 142, probeJsonSha256: "41ed662dae54308b83b86a12f48ad7aebc5b274f9c18565122202a06523a5893", rawRgbSequenceSha256: "09d4ec587c8bf58f93c4392f7c02d7d4e085aefc6a1f02123e2c771d22b04079", changedRows: 91, partyTransitions: [] },
        "opponent-front": { rows: 142, probeJsonSha256: "b7d8da9d115467e3453059c755b3084d39f7465300a3956902ee7f6b0cdd2f98", rawRgbSequenceSha256: "a546c2c7f4d802487fcaa836f68f545165436a2f8dafc5de93082f73e0e19c54", changedRows: 91, partyTransitions: [20, 21] },
      },
    });
    for (const side of ["player-back", "opponent-front"] as const) {
      const map = JSON.parse(readFileSync(resolve(root, fixture.orientations[side].changeMap), "utf8")) as Json;
      expect(map).toMatchObject({ schema: "dragon-dance-normalized-change-map/v1", side });
      expect(map.rows).toHaveLength(142);
      expect(map.rows[0]).toMatchObject({ age: 0, active: true, scriptOffset: 0 });
      expect(map.rows[141]).toMatchObject({ age: 141, active: false, scriptOffset: 110 });
    }
  });

  it("pins move-owned orb, palette, waver, monbg, audio, cleanup, and promotion facts", () => {
    expect(fixture.measured).toEqual({
      rowsPerOrientation: 142, changedRowsPerOrientation: 91, firstInactiveCleanupAge: 141,
      orbLifetimes: [[3,20,101],[4,20,101],[5,20,101],[7,20,101],[9,20,101],[10,21,101]],
      waverTask: [10,84], paletteTask: [20,103], monbg: { update: [4,107], clear: [105,107], vramChanges: [5,107,109] },
      displayTransfers: { oam: "141/141 predecessor", matrices: "141/141 predecessor", palette: "140/141 predecessor; age 4 same-row monbg" },
      scanline: { stateChanges: [10,84,85], selectedHofsChanges: [5,11,85,109], waverTransfer: "source buffer age 10 reaches selected HOFS at age 11 (RAM+1)" },
      resources: { tag: 10249, loadAge: 1, lastLoadedAge: 140, unloadedAge: 141 },
      audio: { sound: "SE_M_TELEPORT", ages: [10,53,85], calls: 3 }, animationRngTransitions: 138,
      rawState: { battleMonsImmutable: true, outcomeWeatherGameplayRngImmutable: true, playerPartyImmutable: true, opponentPartyTransactionAges: [20,21], opponentPartyRestored: true },
    });
    expect(fixture.scope).toMatchObject({ fullDenseRowsRetained: true, twiceFreshByteIdentical: true, rawRgbRowsRetained: true, normalizedBilateralChangeMaps: true, productionAnimationChanged: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: true, framebufferAcceptance: true, componentTrackCredit: false, coveragePromotion: true, siblingAcceptance: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false, transientOverrides: [] });
    expect((coverage as Json).entries.find((entry: Json) => entry.move === "MOVE_DRAGON_DANCE")).toMatchObject({ status: "exact" });
  });

  it("keeps every named control independently exact without transferring facts", () => {
    const entries = (coverage as Json).entries as Json[];
    for (const move of ["MOVE_SWORDS_DANCE", "MOVE_CONFUSE_RAY", "MOVE_ACID_ARMOR", "MOVE_MEMENTO"]) {
      expect(entries.find((entry) => entry.move === move)).toMatchObject({ move, status: "exact" });
    }
    expect(fixture.move).toBe("MOVE_DRAGON_DANCE");
    expect(fixture.components).toHaveLength(7);
  });
});
