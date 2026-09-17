import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/nightmare-evidence.json" with { type: "json" };
import { verifyNightmareEvidence } from "../../tools/compare/nightmareEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_NIGHTMARE complete bilateral Scene-ON evidence checkpoint", () => {
  it("regenerates every retained semantic/RGB digest and normalized map twice", () => {
    const first = verifyNightmareEvidence();
    expect(verifyNightmareEvidence()).toEqual(first);
    expect(first).toEqual({
      schema: "nightmare-bilateral-evidence/v1", status: "unsupported-evidence-checkpoint", coverageCredit: false,
      orientations: {
        "player-back": { rows: 169, changedRows: 131, probeJsonSha256: "fe19f62f70a3f91b98f4a6e2ebe6c998318ffbd3ed16c44d1fdf78d0536f5969", rawRgbSequenceSha256: "0ab0d939fbb3300ff94922fea8d9d8ecc126b629e1dd957cec374a8013875001", cleanupAge: 168, cloneRows: 80, cloneTaskRows: 83, shakeTaskRows: 78, oamRamPlusOneRows: 168, matrixRamPlusOneRows: 168, paletteRamPlusOneRows: 167 },
        "opponent-front": { rows: 169, changedRows: 132, probeJsonSha256: "f48c1c56e30c074ba9c67345584b0d84353c5e41f1ce62e6b7e47df05698f09c", rawRgbSequenceSha256: "0615ff83c1232bc1db55efc0d4e2a9e8910e67601fa05042d802cac4a80f9872", cleanupAge: 168, cloneRows: 80, cloneTaskRows: 83, shakeTaskRows: 78, oamRamPlusOneRows: 168, matrixRamPlusOneRows: 168, paletteRamPlusOneRows: 167 },
      },
    });
    for (const side of ["player-back","opponent-front"] as const) {
      const map = JSON.parse(readFileSync(resolve(root, fixture.orientations[side].changeMap), "utf8")) as Json;
      expect(map).toMatchObject({ schema: "nightmare-normalized-banked-change-map/v1", side });
      expect(map.rows).toHaveLength(169);
      expect(map.rows[0]).toMatchObject({ age: 0, active: true, scriptOffset: 0 });
      expect(map.rows.at(-1)).toMatchObject({ age: 168, active: false, scriptOffset: 43, counts: { visual: 0, sound: 0 }, clone: null });
    }
  });

  it("keeps the historical evidence scope while the contest arm and siblings stay uncredited", () => {
    expect(fixture.scope).toEqual({ legalBilateralPartyOnlySceneOn: true, twiceFreshSemanticAndRawRgb: true, chronologicalRawRgb888Retained: true, normalizedBankedChangeMapsRetained: true, gameplayStateOwned: false, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferAcceptanceAdded: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false });
    const data = coverage as Json;
    expect(data.entries).toHaveLength(258);
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_NIGHTMARE"))
      .toMatchObject({ status: "exact" });
    expect(data.queue).toEqual([]);
    expect(data.componentTracks.find((entry: Json) => entry.id === "nightmare-clone-blend")).toMatchObject({ representatives: ["MOVE_NIGHTMARE"], fulfilled: false, goal: expect.stringContaining("contest-only") });
    for (const move of ["MOVE_FORESIGHT","MOVE_SUPER_FANG","MOVE_HIDDEN_POWER","MOVE_FLAME_WHEEL","MOVE_TORMENT","MOVE_HELPING_HAND","MOVE_RECYCLE","MOVE_ENDEAVOR","MOVE_SKILL_SWAP","MOVE_EXTRASENSORY","MOVE_RAGE","MOVE_NIGHT_SHADE","MOVE_SPITE","MOVE_DESTINY_BOND"]) expect(JSON.stringify(fixture)).not.toContain(`\"${move}\":\"exact\"`);
  });
});
