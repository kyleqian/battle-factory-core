import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/sheer-cold-evidence.json" with { type: "json" };
import { verifySheerColdEvidence } from "../../tools/compare/sheerColdEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_SHEER_COLD complete legal bilateral Scene-ON evidence", () => {
  it("replays every retained state/RGB/map row and regeneration receipt twice", () => {
    const first = verifySheerColdEvidence();
    expect(verifySheerColdEvidence()).toEqual(first);
    expect(first).toEqual({
      schema: "sheer-cold-bilateral-evidence/v1", status: "unsupported-evidence-checkpoint", coverageCredit: false,
      orientations: {
        "player-back": { rows: 192, changedRows: 88, probeJsonSha256: "e1445f75049538d3d53217df748d9c57b799d44a5a998260bfae84ca18e0e167", rawRgbSequenceSha256: "17a8200c5548914baf85abfee7b1131a8cb88f709ccd318d7da210ac086e0f23", cleanupAge: 191 },
        "opponent-front": { rows: 191, changedRows: 88, probeJsonSha256: "3d034366480bb0db5b8198351535f4bdf51ae7243605a3c04dacc58960a9a1a5", rawRgbSequenceSha256: "01bdac99503aca2ea1aa7e14ce5ea0cf9380ca6b96940500b0e4eb8b9411ca98", cleanupAge: 190 },
      },
    });
    for (const side of ["player-back", "opponent-front"] as const) {
      const map = JSON.parse(readFileSync(resolve(root, fixture.orientations[side].changeMap), "utf8")) as Json;
      expect(map).toMatchObject({ schema: "sheer-cold-normalized-banked-change-map/v1", side });
      expect(map.rows).toHaveLength(side === "player-back" ? 192 : 191);
      expect(map.rows[0]).toMatchObject({ age: 0, active: true, scriptOffset: 0 });
      expect(map.rows.at(-1)).toMatchObject({ active: false, scriptOffset: 36, counts: { visual: 0, sound: 0 } });
    }
  });

  it("pins every move-owned mechanism, legal outcome, clean boundary, and unsupported scope", () => {
    expect(fixture.measured).toMatchObject({
      window: expect.stringContaining("first fully clean inactive row"),
      bgIce: expect.stringContaining("BG_ICE VRAM loads at 20"),
      iceCube: expect.stringContaining("64x64, 64x32, 32x64, and 32x32 subsprites"),
      paletteAlpha: expect.stringContaining("faded palette bank 23"),
      monbg: expect.stringContaining("player-back BG1 setup registers change same-row"),
      hardware: expect.stringContaining("Whole hardware OAM and matrices equal preceding software"),
      tasksAudioOrder: expect.stringContaining("SE_M_HAIL age 62"),
      stateOutcome: expect.stringContaining("MOVE_RESULT_ONE_HIT_KO=16"),
      cleanup: expect.stringContaining("First inactive ages 191 player-back and 190 opponent-front"),
    });
    expect(fixture.latchConclusion).toContain("orientation-split monbg setup");
    expect(fixture.scope).toEqual({
      legalBilateralPartyOnlySceneOn: true, twiceFreshSemanticAndRawRgb: true, chronologicalRawRgb888Retained: true,
      normalizedBankedChangeMapsRetained: true, gameplayStateOwned: false, productionChanged: false,
      reducerAdded: false, assetWiringAdded: false, typedSeamAdded: false, compositorAdded: false,
      framebufferAcceptanceAdded: false, coveragePromotion: false, componentTrackFulfilled: false,
      siblingCredit: false, icePunchCredit: false,
    });
    const data = coverage as Json;
    expect(data.entries).toHaveLength(248);
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_SHEER_COLD")?.status ?? "unsupported").toBe("unsupported");
    expect(data.componentTracks.find((entry: Json) => entry.id === "ice-cube-frozen-ice-cube")).toMatchObject({
      representatives: ["MOVE_SHEER_COLD"], fulfilled: false,
      goal: expect.stringContaining("no reducer, typed seam, compositor, framebuffer acceptance, promotion, or track fulfillment"),
    });
  });
});
