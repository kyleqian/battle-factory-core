import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/smog-evidence.json" with { type: "json" };
import { verifySmogEvidence } from "../../tools/compare/smogEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_SMOG complete legal bilateral Scene-ON evidence", () => {
  it("reproduces every retained state/RGB row, digest, and normalized map twice", () => {
    const first = verifySmogEvidence();
    expect(verifySmogEvidence()).toEqual(first);
    expect(first).toEqual({
      schema: "smog-bilateral-evidence/v1", status: "unsupported-evidence-checkpoint", coverageCredit: false,
      orientations: {
        "player-back": { rows: 306, changedRows: 293, probeJsonSha256: "59350f88138a29b7d40fd148e7e56519a0eb8b77d1f64d95cd66c549e55f48b6", rawRgbSequenceSha256: "cff3b70a17a02a8924b1dd8157f5e9c570ee3691879dec4b28d8d056f5ce6021", cleanupAge: 305, equalTieRows: 175 },
        "opponent-front": { rows: 306, changedRows: 293, probeJsonSha256: "b5bb44c1cb29130551a1407657c20d5eb6e4a86cec9b6479b09d57c76d4cf098", rawRgbSequenceSha256: "bf80df8687977bcb330849438ecda5c9fc0daa11bee9a8783e8e75a3a3f9b808", cleanupAge: 305, equalTieRows: 175 },
      },
    });
    for (const side of ["player-back","opponent-front"] as const) {
      const map = JSON.parse(readFileSync(resolve(root, fixture.orientations[side].changeMap), "utf8")) as Json;
      expect(map).toMatchObject({ schema: "smog-normalized-banked-change-map/v1", side });
      expect(map.rows).toHaveLength(306);
      expect(map.rows[0]).toMatchObject({ age: 0, active: true, scriptOffset: 0 });
      expect(map.rows.at(-1)).toMatchObject({ age: 305, active: false, scriptOffset: 100, counts: { visual: 0, sound: 0 }, clouds: [] });
    }
  });

  it("pins every move-owned mechanism and the independent exact promotion boundary", () => {
    expect(fixture.measured).toMatchObject({
      window: expect.stringContaining("306 rows"),
      clouds: expect.stringContaining("Seven gSmogCloudSpriteTemplate lives"),
      cloudHardwareOrder: expect.stringContaining("305 comparable rows"),
      paletteCycle: expect.stringContaining("not BlendColorCycleByTag"),
      resource: expect.stringContaining("frees on inactive cleanup 305"),
      shakeMonbg: expect.stringContaining("RAM+1"),
      registers: expect.stringContaining("BLDALPHA=2060"),
      audio: expect.stringContaining("SE_M_TOXIC"),
      stateOutcome: expect.stringContaining("Exactly one legal Magby Smog PP"),
      cleanup: expect.stringContaining("Inactive age 305"),
    });
    expect(fixture.latchConclusion).toContain("independently measured exception");
    expect(fixture.scope).toEqual({
      legalBilateralPartyOnlySceneOn: true, twiceFreshSemanticAndRawRgb: true, chronologicalRawRgb888Retained: true,
      normalizedBankedChangeMapsRetained: true, gameplayStateOwned: false, productionChanged: false,
      reducerAdded: false, assetWiringAdded: false, typedSeamAdded: false, compositorAdded: false,
      framebufferAcceptanceAdded: false, coveragePromotion: false, componentTrackFulfilled: false,
      siblingCredit: false, poisonGasCredit: false,
    });
    const data = coverage as Json;
    expect(data.entries).toHaveLength(250);
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_SMOG")).toMatchObject({ status: "exact" });
    expect(data.queue).toEqual(["MOVE_BONEMERANG"]);
    expect(data.componentTracks.find((entry: Json) => entry.id === "smog-purple-gas-cloud")).toMatchObject({
      representatives: ["MOVE_SMOG"], fulfilled: true,
      goal: expect.stringContaining("FULFILLED by MOVE_SMOG only"),
    });
  });
});
