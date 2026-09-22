import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/superpower-evidence.json"), "utf8")) as Json;
const run = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/superpowerEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const sha = (path: string): string => createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");

describe("MOVE_SUPERPOWER complete bilateral Scene-ON evidence", () => {
  it("retains dense semantic state, chronological RGB, normalized latches, and twice-fresh identity", () => {
    const result = JSON.parse(run()) as Json;
    expect(run()).toBe(JSON.stringify(result, null, 2) + "\n");
    expect(result).toMatchObject({ schema: "superpower-bilateral-evidence/v1", move: "MOVE_SUPERPOWER", status: "unsupported-evidence", coverageCredit: false, boundary: { sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedBankedMaps: true, twiceFreshByteIdentical: true, legalBilateralParties: true, hitLegallyConstrained: true, orbAffine: true, fiveRockTrajectories: true, fireballTranslationAndFlips: true, attackerMonbg: true, alphaBlend: true, targetShakeMon2: true, bgYShake: true, audioAndResources: true, firstInactiveCleanup: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false } });
    expect(fixture).toMatchObject({ schema: "superpower-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_SUPERPOWER", moveId: 276, status: "unsupported-evidence", coverageCredit: false, acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 248, "opponent-front": 248 }, totalRows: 496, firstInactiveCleanupRetained: true }, source: { rootStart: "0x082cdfa3", rootEndExclusive: "0x082ce05e", components: 14, receipt: "tools/compare/evidence/superpower-source-audit.json" } });
    for (const [side, expected] of Object.entries({ "player-back": { frame: 326, source: "b9ded455e88f6f01c9fe05b3bcc8143f733013fadfa0cf49dd7ff3cd92ef06ec", rgb: "69d70845cc2e2d7b0d82d490db9365c7bfc467eb65325fe0be80ee729c91c580", map: "ac78be9e9040db45a1ad7e330dba3c8897ebd65ac030dc72c9d7c317eb5c9ba4", bg: "gBattle_BG2", monbg: 6 }, "opponent-front": { frame: 328, source: "b8a3a06431970e197a2584c53edd9e4b414ad02c7bcb764a479e8162f6a4cbba", rgb: "b1aa859dc305a11257c5e01b701bf234ebda29087c5103fad9871d149eb3bf9c", map: "0641f09f9af2f5a4e5321006498c969252e381833145674ce1cfec51a4550c4f", bg: "gBattle_BG1", monbg: 8 } })) {
      const receipt = fixture.orientations[side]; const verified = result.orientations[side];
      expect(receipt).toMatchObject({ sourceWindow: { frameCount: 248, endFrame: expected.frame }, probeJsonSha256: expected.source, repeatProbeJsonSha256: expected.source, rawRgbSequenceSha256: expected.rgb, repeatRawRgbSequenceSha256: expected.rgb, changeMapSha256: expected.map, summary: { latches: { hardwareOamEqualsPrecedingSoftware: "247/247", hardwareMatricesEqualsPrecedingSoftware: "247/247", hardwarePaletteEqualsPrecedingFaded: "246/247", paletteExceptions: [10], selectedBg: expected.bg, monbgSpriteSlot: expected.monbg }, state: { partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, rawBattleStateStable: true, gameplayRngTransitions: [] }, cleanup: { frame: expected.frame, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 } } });
      expect(verified).toMatchObject({ probeJsonSha256: expected.source, rawRgbSequenceSha256: expected.rgb, changeMapSha256: expected.map });
      expect(sha(receipt.scenario)).toBe(receipt.scenarioSha256); expect(sha(receipt.denseState)).toBe(receipt.denseStateSha256); expect(sha(receipt.rawRgbArchive)).toBe(receipt.rawRgbArchiveSha256); expect(sha(receipt.changeMap)).toBe(receipt.changeMapSha256);
      const dense = JSON.parse(gunzipSync(readFileSync(resolve(root, receipt.denseState))).toString("utf8")) as Json;
      expect(dense.frames).toHaveLength(248); expect(dense.sourceWindow).toMatchObject({ frameCount: 248, endFrame: expected.frame }); expect(dense.frames.at(-1)).toMatchObject({ animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0 });
      expect(dense.frames.every((row: Json) => row.scriptOwner === "Move_SUPERPOWER" && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.spriteOrder.length === 64 && row.resourceAllocators.tileRanges.length === 64 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4)).toBe(true);
    }
  });

  it("keeps the staged/no-credit boundary and exactly one unfulfilled novel track", () => {
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SUPERPOWER")).toMatchObject({ status: "staged" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "superpower-rock-orb-fire")).toMatchObject({ representatives: ["MOVE_SUPERPOWER"], fulfilled: false });
    expect(fixture.controls).toMatchObject({ named: { MOVE_SUPERPOWER: "staged", MOVE_REVENGE: "not-started" }, transferCredit: false });
  });
});
