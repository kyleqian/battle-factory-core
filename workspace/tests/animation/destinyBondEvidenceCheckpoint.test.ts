import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };
import fixture from "../../tools/compare/fixtures/destiny-bond-evidence.json" with { type: "json" };
import { verifyDestinyBondEvidence } from "../../tools/compare/destinyBondEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");

describe("MOVE_DESTINY_BOND complete bilateral retained evidence", () => {
  it("replays every retained semantic, hardware, raw-RGB, and normalized-map row twice", () => {
    const first = verifyDestinyBondEvidence();
    expect(verifyDestinyBondEvidence()).toEqual(first);
    expect(first).toEqual({
      schema: "destiny-bond-bilateral-evidence/v1", status: "unsupported-reducer-seam-checkpoint", coverageCredit: false,
      orientations: {
        "player-back": { rows: 188, changedRows: 161, probeJsonSha256: "cf19762a42afe269d489b7388edba4d18c9ec28f699b8d5f1aca7bb04ca31069", rawRgbSequenceSha256: "3ec70811c9210b6f330689181da8368f5f2a8e7c5d04c89c4c71edd14fd6e2a6", attackerRank: 9 },
        "opponent-front": { rows: 188, changedRows: 161, probeJsonSha256: "731924361b77e6ff626698a5818729dbbac217df2cccc1d9d82917fc8ff87e66", rawRgbSequenceSha256: "711a2c27063f465e0160ebcd27ed99b44957c5fa3a5fde5f0082d8832d25f424", attackerRank: 10 },
      },
    });
    for (const side of ["player-back", "opponent-front"] as const) {
      const map = JSON.parse(readFileSync(resolve(root, fixture.orientations[side].changeMap), "utf8")) as Json;
      expect(map).toMatchObject({ schema: "destiny-bond-normalized-banked-change-map/v1", side });
      expect(map.rows).toHaveLength(188);
      expect(map.rows[0]).toMatchObject({ age: 0, active: true, scriptOffset: 0 });
      expect(map.rows[187]).toMatchObject({ age: 187, active: false, scriptOffset: 90 });
    }
  });

  it("pins WHITE_SHADOW, excluded palettes, Ghost BG, shake, audio, resources, state, and cleanup without acceptance", () => {
    expect(fixture.measured).toMatchObject({
      whiteShadow: expect.stringContaining("ordinary RAM+1"),
      paletteBlend: expect.stringContaining("banks 16 and 17"),
      ghostBg: expect.stringContaining("VRAM changes at ages 23/163"),
      shake: expect.stringContaining("hardware starts 94"),
      audio: expect.stringContaining("SE_M_NIGHTMARE at 119"),
      resources: expect.stringContaining("tag 10188"),
      state: expect.stringContaining("gameplay RNG are immutable"),
      cleanup: expect.stringContaining("age 187"),
    });
    expect(fixture.scope).toEqual({
      legalBilateralPartyOnlySceneOn: true, twiceFreshSemanticAndRawRgb: true, chronologicalRawRgb888Retained: true,
      normalizedBankedChangeMapsRetained: true, gameplayStateOwned: false, productionChanged: true, reducerAdded: true,
      assetWiringAdded: true, typedSeamAdded: true, compositorAdded: false, framebufferAcceptanceAdded: false,
      coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false,
    });
  });

  it("records Destiny Bond alone as exact and fulfills its nine-component track", () => {
    const data = coverage as Json;
    expect(data.entries).toHaveLength(258);
    expect(data.entries.find((entry: Json) => entry.move === "MOVE_DESTINY_BOND")).toMatchObject({ status: "exact" });
    expect(data.queue).toEqual([]);
    const track = data.componentTracks.find((entry: Json) => entry.id === "destiny-bond-white-shadow");
    expect(track).toMatchObject({ representatives: ["MOVE_DESTINY_BOND"], fulfilled: true });
    expect(track.components).toHaveLength(9);
    for (const path of [
      "tools/compare/fixtures/destiny-bond-evidence.json",
      "src/animation/assets/destiny-bond.json",
      "src/animation/destinyBond.ts",
      "tools/compare/verifyDestinyBondReducer.ts",
      "tests/animation/destinyBondReducer.test.ts",
      "tools/compare/destinyBondActualCore.ts",
      "tests/animation/destinyBondActualCore.test.ts",
    ]) expect(track.evidence).toContain(path);
  });
});
