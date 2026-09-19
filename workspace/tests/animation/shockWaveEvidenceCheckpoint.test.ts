import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/shock-wave-evidence.json" with { type: "json" };
import { verifyShockWaveEvidence } from "../../tools/compare/shockWaveEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_SHOCK_WAVE complete legal bilateral Scene-ON evidence", () => {
  it("reproduces every retained semantic/RGB digest and normalized banked map twice", () => {
    const first = verifyShockWaveEvidence();
    expect(verifyShockWaveEvidence()).toEqual(first);
    expect(first).toEqual({
      schema: "shock-wave-bilateral-evidence/v1", status: "unsupported-evidence-checkpoint", coverageCredit: false,
      orientations: {
        "player-back": { rows: 267, changedRows: 170, probeJsonSha256: "3b88bc1b5a2e08a1f38b5e3eacb3af330db86db97d058139e248759a6fe977f2", rawRgbSequenceSha256: "58f1a3c9a4b31d7dccbfedf59be35ea79b34b559607629658861299d7e252b93", cleanupAge: 266, oamRamPlusOneRows: 266, matrixRamPlusOneRows: 266, paletteRamPlusOneRows: 265, paletteSameRowExceptions: [13] },
        "opponent-front": { rows: 263, changedRows: 167, probeJsonSha256: "cfa46daf1b872036de7a1335a7f03a057b6fa484f15bc68223da0beebcbe055b", rawRgbSequenceSha256: "9970ce05a7e3840b235fd7d85e4da29fb76aa70a66c497005be52494898b70ea", cleanupAge: 262, oamRamPlusOneRows: 262, matrixRamPlusOneRows: 262, paletteRamPlusOneRows: 261, paletteSameRowExceptions: [13] },
      },
    });
    for (const side of ["player-back","opponent-front"] as const) {
      const map = JSON.parse(readFileSync(resolve(root, fixture.orientations[side].changeMap), "utf8")) as Json;
      expect(map).toMatchObject({ schema: "shock-wave-normalized-banked-change-map/v1", side });
      expect(map.rows).toHaveLength(side === "player-back" ? 267 : 263);
      expect(map.rows[0]).toMatchObject({ age: 0, active: true, scriptOffset: 0 });
      expect(map.rows.at(-1)).toMatchObject({ active: false, scriptOffset: 161, counts: { visual: 0, sound: 0 }, sprites: [], registers: { bldcnt: 0, bldalpha: 0 } });
    }
  });

  it("pins the historical evidence boundary while current coverage promotes only Shock Wave", () => {
    expect(fixture.components).toHaveLength(15);
    expect(fixture.measured).toMatchObject({
      window: expect.stringContaining("complete and unthinned"), charging: expect.stringContaining("Twenty"),
      orbBoltsLightning: expect.stringContaining("49 player-back and 43 opponent-front"), palette: expect.stringContaining("RAM+1"),
      latches: expect.stringContaining("266/266 player-back and 262/262 opponent-front"), resources: expect.stringContaining("ages 1/4/7/10"),
      monbgRegisters: expect.stringContaining("first inactive ages 266/262"), audio: expect.stringContaining("THUNDERBOLT"),
      stateOutcome: expect.stringContaining("Exactly one legal Flaaffy Shock Wave PP"), cleanup: expect.stringContaining("zero visual/sound counts"),
    });
    expect(fixture.latchConclusion).toContain("sole same-row palette exception");
    expect(fixture.scope).toEqual({
      legalBilateralPartyOnlySceneOn: true, twiceFreshSemanticAndRawRgb: true, chronologicalRawRgb888Retained: true, normalizedBankedChangeMapsRetained: true,
      gameplayStateOwned: false, productionChanged: false, reducerAdded: false, assetWiringAdded: false, typedSeamAdded: false, compositorAdded: false,
      framebufferAcceptanceAdded: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false, namedControlCredit: false,
    });
    const data = coverage as Json;
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_SHOCK_WAVE")).toMatchObject({ status: "exact" });
    expect(data.queue).not.toContain("MOVE_SHOCK_WAVE");
    expect(data.componentTracks.find((track: Json) => track.id === "shock-wave-electric-bolts")).toMatchObject({ representatives: ["MOVE_SHOCK_WAVE"], fulfilled: true });
  });
});
