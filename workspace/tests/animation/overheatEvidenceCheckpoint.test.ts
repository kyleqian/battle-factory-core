import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/overheat-evidence.json" with { type: "json" };
import { verifyOverheatEvidence } from "../../tools/compare/overheatEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname,"../..");

describe("MOVE_OVERHEAT complete bilateral Scene-ON evidence checkpoint", () => {
  it("regenerates every retained semantic/RGB digest and normalized map twice", () => {
    const first = verifyOverheatEvidence();
    expect(verifyOverheatEvidence()).toEqual(first);
    expect(first).toEqual({
      schema: "overheat-bilateral-evidence/v1", status: "unsupported-evidence-checkpoint", coverageCredit: false,
      orientations: {
        "player-back": { rows: 230, changedRows: 112, probeJsonSha256: "08426d2d459e8a7038a0bbe5d0f18cc1d7af98144a5a78540dd552c7d74dc188", rawRgbSequenceSha256: "6d445fc68c90f3c2b0243288822d9da0b649e241b489b8d1eca4e8db6bf7b81c", cleanupAge: 229, flameSprites: 24, hitSplats: 4, paletteBlendSprites: 5, shakeTasks: 3, oamRamPlusOneRows: 229, matrixRamPlusOneRows: 229, paletteRamPlusOneRows: 228 },
        "opponent-front": { rows: 230, changedRows: 112, probeJsonSha256: "97e2b4eed250e9b2cfcc19e5e071b9c8692a63d1a78455d4460ab3913fa4c780", rawRgbSequenceSha256: "aa26ea96621c1216ba227ef2085df200e921f145c3db29008b887467312ac33e", cleanupAge: 229, flameSprites: 24, hitSplats: 4, paletteBlendSprites: 5, shakeTasks: 3, oamRamPlusOneRows: 229, matrixRamPlusOneRows: 229, paletteRamPlusOneRows: 228 },
      },
    });
    for (const side of ["player-back","opponent-front"] as const) {
      const map = JSON.parse(readFileSync(resolve(root,fixture.orientations[side].changeMap),"utf8")) as Json;
      expect(map).toMatchObject({ schema: "overheat-normalized-banked-change-map/v1", side });
      expect(map.rows).toHaveLength(230);
      expect(map.rows[0]).toMatchObject({ age: 0, active: true, scriptOffset: 0 });
      expect(map.rows.at(-1)).toMatchObject({ age: 229, active: false, scriptOffset: 753, counts: { visual: 0, sound: 0 }, sprites: [] });
    }
  });

  it("retains the historical evidence boundary while the accepted move has no track, sibling, or gameplay credit", () => {
    expect(fixture.scope).toEqual({ legalBilateralPartyOnlySceneOn: true, twiceFreshSemanticAndRawRgb: true, chronologicalRawRgb888Retained: true, normalizedBankedChangeMapsRetained: true, gameplayStateOwned: false, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferAcceptanceAdded: false, coveragePromotion: false, coverageEntryAdded: false, queueChanged: false, componentTrackFulfilled: false, siblingCredit: false });
    const data = coverage as Json;
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_OVERHEAT")).toMatchObject({ status: "exact" });
    expect(data.queue).not.toContain("MOVE_OVERHEAT");
    expect(data.componentTracks.some((track: Json) => track.representatives?.includes("MOVE_OVERHEAT"))).toBe(false);
  });
});
