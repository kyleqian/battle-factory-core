import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/bonemerang-evidence.json" with { type: "json" };
import { verifyBonemerangEvidence } from "../../tools/compare/bonemerangEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_BONEMERANG complete legal bilateral Scene-ON evidence", () => {
  it("reproduces every retained state/RGB row, digest, and normalized map twice", () => {
    const first = verifyBonemerangEvidence();
    expect(verifyBonemerangEvidence()).toEqual(first);
    expect(first).toEqual({
      schema: "bonemerang-bilateral-evidence/v1", status: "unsupported-evidence-checkpoint", coverageCredit: false,
      orientations: {
        "player-back": { rows: 72, changedRows: 53, probeJsonSha256: "cc275fc1d1ddd762308ac18a87bd4ee11fa0aa823c1adfdda7390aac8547d590", rawRgbSequenceSha256: "b55afb4f0e70d50d925877cd4b7886b01b94e21931fed929de9a38573e293353", cleanupAge: 71 },
        "opponent-front": { rows: 72, changedRows: 53, probeJsonSha256: "d6f800d1ec08949a6672938836ef55547ff7993561f1ec37bf0421434b08afb9", rawRgbSequenceSha256: "ed175080e2265506e75aa8ddb052e8b16511258b71554a1a95eb4c8e140117b4", cleanupAge: 71 },
      },
    });
    for (const side of ["player-back","opponent-front"] as const) {
      const map = JSON.parse(readFileSync(resolve(root, fixture.orientations[side].changeMap), "utf8")) as Json;
      expect(map).toMatchObject({ schema: "bonemerang-normalized-banked-change-map/v1", side });
      expect(map.rows).toHaveLength(72);
      expect(map.rows[0]).toMatchObject({ age: 0, active: true, scriptOffset: 0 });
      expect(map.rows.at(-1)).toMatchObject({ age: 71, active: false, scriptOffset: 83, counts: { visual: 0, sound: 0 }, sprites: [], tasks: [] });
    }
  });

  it("pins every Bonemerang-owned mechanism while preserving the unsupported boundary", () => {
    expect(fixture.measured).toMatchObject({
      window: expect.stringContaining("72 consecutive rows"),
      projectile: expect.stringContaining("ages 10..50"),
      hitShakeLunge: expect.stringContaining("ages 32..41"),
      resources: expect.stringContaining("BONE tile/palette tags allocate at age 1"),
      hardware: expect.stringContaining("all 71 comparable rows"),
      monbg: expect.stringContaining("8/35/37/39/41/71"),
      alphaPriority: expect.stringContaining("BLDCNT 16192"),
      audioCursor: expect.stringContaining("SE_M_BONEMERANG"),
      stateRng: expect.stringContaining("Gameplay RNG is opaque and unconsumed"),
      cleanup: expect.stringContaining("Inactive age 71"),
    });
    expect(fixture.latchConclusion).toContain("move-owned facts only");
    expect(fixture.scope).toEqual({
      legalBilateralPartyOnlySceneOn: true, twiceFreshSemanticAndRawRgb: true, chronologicalRawRgb888Retained: true,
      normalizedBankedChangeMapsRetained: true, gameplayStateOwned: false, productionChanged: false,
      reducerAdded: false, assetWiringAdded: false, typedSeamAdded: false, compositorAdded: false,
      framebufferAcceptanceAdded: false, coveragePromotion: false, componentTrackFulfilled: false,
      siblingCredit: false, boneClubCredit: false, boneRushCredit: false,
    });
    const data = coverage as Json;
    expect(data.entries).toHaveLength(256);
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_BONEMERANG")).toMatchObject({ status: "exact" });
    expect(data.queue).toEqual([]);
    expect(data.componentTracks.find((entry: Json) => entry.id === "bone-projectile-bonemerang")).toMatchObject({
      representatives: ["MOVE_BONEMERANG"], fulfilled: true,
      goal: expect.stringContaining("FULFILLED by MOVE_BONEMERANG alone"),
    });
  });
});
