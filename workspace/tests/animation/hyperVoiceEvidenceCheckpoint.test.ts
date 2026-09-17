import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/hyper-voice-evidence.json" with { type: "json" };
import { verifyHyperVoiceEvidence } from "../../tools/compare/hyperVoiceEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_HYPER_VOICE complete bilateral Scene-ON evidence checkpoint", () => {
  it("regenerates every retained digest and normalized map twice", () => {
    const first = verifyHyperVoiceEvidence();
    expect(verifyHyperVoiceEvidence()).toEqual(first);
    expect(first).toEqual({
      schema: "hyper-voice-bilateral-evidence/v1", status: "unsupported-evidence-checkpoint", coverageCredit: false,
      orientations: {
        "player-back": { rows: 105, changedRows: 92, probeJsonSha256: "eff30163a480fcdfbb4b5f4ff269fad2311dcf8f8e32ffe7c4ef8c4410a9658c", rawRgbSequenceSha256: "ddc0ba9ef39d8020b4f07b7f2b208633d9491930a77826454cbb31e44fbf3e18", cleanupAge: 104, oamRamPlusOneRows: 104, ringMatrixRamPlusOneRows: 88, scaleRamPlusTwoRows: 20, targetShakeRamPlusTwoBodies: 2, platformRamPlusOneBodies: 2 },
        "opponent-front": { rows: 105, changedRows: 92, probeJsonSha256: "93f7050c033ac78a74837340a6d88da7b21540ca838d2b38c3d178052943e970", rawRgbSequenceSha256: "5b7f30b73c1b6cb14ccb6650be48fff7916d78fc50f89c49ef7807e03259ca77", cleanupAge: 104, oamRamPlusOneRows: 104, ringMatrixRamPlusOneRows: 88, scaleRamPlusTwoRows: 20, targetShakeRamPlusTwoBodies: 2, platformRamPlusOneBodies: 2 },
      },
    });
    for (const side of ["player-back","opponent-front"] as const) {
      const map = JSON.parse(readFileSync(resolve(root, fixture.orientations[side].changeMap), "utf8")) as Json;
      expect(map).toMatchObject({ schema: "hyper-voice-normalized-banked-change-map/v1", side });
      expect(map.rows).toHaveLength(105);
      expect(map.rows[0]).toMatchObject({ age: 0, active: true, scriptOffset: 0 });
      expect(map.rows.at(-1)).toMatchObject({ age: 104, active: false, scriptOffset: 35, counts: { visual: 0, sound: 0 }, sprites: [] });
    }
  });

  it("keeps Hyper Voice and every named sibling uncredited", () => {
    expect(fixture.measured).toMatchObject({
      window: expect.stringContaining("105 unthinned rows"), rings: expect.stringContaining("4..47"),
      tasks: expect.stringContaining("Every 16-word row"), latches: expect.stringContaining("RAM+2"),
      platform: expect.stringContaining("RAM+1"), palette: expect.stringContaining("same-row"),
      audioResources: expect.stringContaining("Exploud species 372"), stateCleanup: expect.stringContaining("inactive age 104"),
    });
    expect(fixture.scope).toEqual({
      legalBilateralPartyOnlySceneOn: true, twiceFreshSemanticAndRawRgb: true, chronologicalRawRgb888Retained: true,
      normalizedBankedChangeMapsRetained: true, gameplayStateOwned: false, productionChanged: false,
      reducerAdded: false, assetWiringAdded: false, typedSeamAdded: false, compositorAdded: false,
      framebufferAcceptanceAdded: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false,
    });
    const data = coverage as Json;
    expect(data.entries).toHaveLength(258);
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_HYPER_VOICE")).toMatchObject({ status: "exact" });
    expect(data.queue).toEqual([]);
    expect(data.componentTracks.find((entry: Json) => entry.id === "hyper-voice-ring-cry-platform")).toMatchObject({ representatives: ["MOVE_HYPER_VOICE"], fulfilled: true });
    for (const move of ["MOVE_UPROAR","MOVE_ROAR","MOVE_ROCK_TOMB","MOVE_SNORE"]) expect(JSON.stringify(fixture)).not.toContain(`\"${move}\":\"exact\"`);
  });
});
