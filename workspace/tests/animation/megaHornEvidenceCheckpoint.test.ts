import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/mega-horn-evidence.json"), "utf8")) as Json;
const run = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/megaHornEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const sha = (path: string): string => createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");

describe("MOVE_MEGAHORN complete bilateral Scene-ON evidence", () => {
  it("retains dense state, chronological RGB, normalized latches, and twice-fresh identity", () => {
    const result = JSON.parse(run()) as Json;
    expect(run()).toBe(JSON.stringify(result, null, 2) + "\n");
    expect(result).toMatchObject({ schema: "mega-horn-bilateral-evidence/v1", move: "MOVE_MEGAHORN", status: "unsupported-evidence", coverageCredit: false, boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false } });
    expect(fixture).toMatchObject({ schema: "mega-horn-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_MEGAHORN", moveId: 224, status: "unsupported-evidence", coverageCredit: false, acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 177, "opponent-front": 176 }, totalRows: 353, firstInactiveCleanupRetained: true }, evidenceScope: { completePointerBody: true, completeBattleAndContestGraph: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedBankedMaps: true, twiceFreshByteIdentical: true, legalBilateralParties: true, hitLegallyConstrained: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false } });
    for (const [side, expected] of Object.entries({ "player-back": { rows: 177, frame: 387, source: "7c1a63d915e1d0d0b2ea2c3b2cb8f198cd59a9fc2ad397e23a1ed622417d140c", rgb: "cc5965f816ce5cf48cbf183dbf1677630e424c50bdf55c4800a892dd14f9345d", latch: "176/176", bank: 8 }, "opponent-front": { rows: 176, frame: 387, source: "77c709bd84f95c83db124119d66a9b605438d28044f3812d8437f13eaec171ad", rgb: "a1bfc221b7d61a905bac87b0a8e798e5f6657a4534936a8d8366b5578619b246", latch: "175/175", bank: 9 } })) {
      const receipt = fixture.orientations[side];
      expect(receipt).toMatchObject({ sourceWindow: { frameCount: expected.rows, endFrame: expected.frame }, probeJsonSha256: expected.source, repeatProbeJsonSha256: expected.source, rawRgbSequenceSha256: expected.rgb, repeatRawRgbSequenceSha256: expected.rgb, summary: { latches: { hardwareOamEqualsPrecedingSoftware: expected.latch, hardwareMatricesEqualsPrecedingSoftware: expected.latch, hardwarePaletteEqualsPrecedingFaded: `${expected.rows - 2}/${expected.rows - 1}`, paletteExceptions: [7], selectedMonbgBank: expected.bank }, state: { partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, rawBattleStateStable: true, gameplayRngTransitions: [] }, cleanup: { frame: expected.frame, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 } } });
      expect(sha(receipt.scenario)).toBe(receipt.scenarioSha256); expect(sha(receipt.denseState)).toBe(receipt.denseStateSha256); expect(sha(receipt.rawRgbArchive)).toBe(receipt.rawRgbArchiveSha256); expect(sha(receipt.changeMap)).toBe(receipt.changeMapSha256);
      const dense = JSON.parse(gunzipSync(readFileSync(resolve(root, receipt.denseState))).toString("utf8")) as Json;
      expect(dense.frames).toHaveLength(expected.rows); expect(dense.frames.at(-1)).toMatchObject({ animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0 });
      expect(dense.frames.every((row: Json) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.spriteOrder.length === 64 && row.resourceAllocators.tileRanges.length === 64 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4)).toBe(true);
    }
  });

  it("keeps exact promotion and the four-component track bounded", () => {
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_MEGAHORN")).toMatchObject({ status: "staged" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "megahorn-horn-control-flow")).toMatchObject({ components: ["asset:ANIM_TAG_HORN_HIT_2", "subroutine:MegahornContinue", "subroutine:MegahornInContest", "visualCommand:create_megahorn_horn_sprite"], representatives: ["MOVE_MEGAHORN"], fulfilled: false });
    expect(fixture.source.novelComponents).toEqual(["asset:ANIM_TAG_HORN_HIT_2", "subroutine:MegahornContinue", "subroutine:MegahornInContest", "visualCommand:create_megahorn_horn_sprite"]);
    expect(fixture.controls.transferCredit).toBe(false);
  });
});
