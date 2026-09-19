import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/psych-up-evidence.json" with { type: "json" };
import { verifyPsychUpEvidence } from "../../tools/compare/psychUpEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_PSYCH_UP complete legal bilateral Scene-ON evidence", () => {
  it("reproduces every retained state/RGB digest and normalized map twice", () => {
    const first = verifyPsychUpEvidence();
    expect(verifyPsychUpEvidence()).toEqual(first);
    expect(first).toEqual({
      schema: "psych-up-bilateral-evidence/v1", status: "unsupported-evidence-checkpoint", coverageCredit: false,
      orientations: {
        "player-back": { rows: 179, changedRows: 149, probeJsonSha256: "1dff102b53e70896db3e9ff94886b1383a8f28eb38f630ad3ffa542c2cf0bee5", rawRgbSequenceSha256: "59134eb7472f8af9768931ee3442d2f78707430a1d5d04989f90456e1f425a20", cleanupAge: 178, oamRamPlusOneRows: 178, scaleRamPlusTwoRows: 19 },
        "opponent-front": { rows: 179, changedRows: 149, probeJsonSha256: "6c1cc7651aec15fa6e622972a2e2d0f0398f26970c39cd86a1d6e07d9546ebf6", rawRgbSequenceSha256: "526ced01d9005b675e4191440b5bb73b2c39776e83d17244c5d3179abd321c41", cleanupAge: 178, oamRamPlusOneRows: 178, scaleRamPlusTwoRows: 19 },
      },
    });
    for (const side of ["player-back","opponent-front"] as const) {
      const map = JSON.parse(readFileSync(resolve(root, fixture.orientations[side].changeMap), "utf8")) as Json;
      expect(map).toMatchObject({ schema: "psych-up-normalized-banked-change-map/v1", side });
      expect(map.rows).toHaveLength(179);
      expect(map.rows[0]).toMatchObject({ age: 0, active: true, scriptOffset: 0 });
      expect(map.rows.at(-1)).toMatchObject({ age: 178, active: false, scriptOffset: 113, counts: { visual: 0, sound: 0 }, spiral: [], tasks: [] });
    }
  });

  it("keeps the evidence checkpoint historical while promotion remains Psych-Up-only", () => {
    expect(fixture.measured).toMatchObject({
      window: expect.stringContaining("179 unthinned rows"),
      spiral: expect.stringContaining("ages 7..127"),
      tasks: expect.stringContaining("full 16-word row"),
      palette: expect.stringContaining("RAM+1"),
      latches: expect.stringContaining("RAM+2"),
      monbgRegisters: expect.stringContaining("BLDALPHA=2060"),
      resourcesAudio: expect.stringContaining("SE_M_PSYBEAM2"),
      stateCleanup: expect.stringContaining("inactive age 178"),
    });
    expect(fixture.latchConclusion).toContain("from its own maps only");
    expect(fixture.scope).toEqual({
      legalBilateralPartyOnlySceneOn: true, twiceFreshSemanticAndRawRgb: true, chronologicalRawRgb888Retained: true,
      normalizedBankedChangeMapsRetained: true, gameplayStateOwned: false, productionChanged: false,
      reducerAdded: false, assetWiringAdded: false, typedSeamAdded: false, compositorAdded: false,
      framebufferAcceptanceAdded: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false,
    });
    const data = coverage as Json;

    expect(data.entries.find((entry: Json) => entry.move === "MOVE_PSYCH_UP")).toMatchObject({ status: "exact" });
    expect(data.queue).not.toContain("MOVE_PSYCH_UP");
    expect(data.componentTracks.find((entry: Json) => entry.id === "psych-up-spiral-palette-cycle")).toMatchObject({ representatives: ["MOVE_PSYCH_UP"], fulfilled: true });
  });
});
