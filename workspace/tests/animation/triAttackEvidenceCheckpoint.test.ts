import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixturePath = resolve(root, "tools/compare/fixtures/tri-attack-evidence.json");
const runVerifier = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/triAttackEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })) as Json;

describe("MOVE_TRI_ATTACK complete bilateral Scene-ON evidence checkpoint", () => {
  it("replays every retained historical state/RGB/map row after independent promotion", () => {
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
    const result = runVerifier();
    expect(result).toMatchObject({ schema: "tri-attack-bilateral-evidence/v1", move: "MOVE_TRI_ATTACK", status: "unsupported-evidence", coverageCredit: false, boundary: { moveExact: true, trackFulfilled: true, barrierChanged: false } });
    expect(fixture.source).toMatchObject({ root: { start: "0x82d4595", endExclusive: "0x82d4709", byteLength: 372, romSha256: "86d2d0432dd6648fcb29c176d3f1f275a1a53ec9a7234b3bdd860be600935396", sourceSha256: "ac0223c3d6245ec0d062aebb7c6c611352c610cbad267c1cac05af22ebb602fe" }, subroutine: { symbol: "IceCrystalEffectShort", start: "0x82d7720", endExclusive: "0x82d77a4", byteLength: 132, romSha256: "3da0ca21634d29ab068ed61238f9bb3129e4403019d36dbdcf4a7f722f3e5772", sourceSha256: "96031e55891f2051396b5ac2d28303b96f65724d841e8e8cfce7d8be1a004ef2" }, combined: { byteLength: 504, romSha256: "399c3d7c32b99fc52e6e75b8f9d2be8590dd3a8b0a852e4e59432d397a3fc895" } });
    expect(fixture).toMatchObject({ oracleProfile: "battle-scene-on", moveId: 161, evidenceScope: { sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, firstInactiveCleanupRetained: true, twiceFreshByteIdentical: true, legalBilateralParties: true, productionAnimationChanged: false, coveragePromotion: false, gameplayStateOwned: false, transientOverrides: [] }, acceptance: { freshRunsPerOrientation: 2, denseRows: { "player-back": 284, "opponent-front": 284 }, sourceRows: { "player-back": 248, "opponent-front": 248 } }, controls: { inferredSiblingCredit: false, shakeTargetInPatternScaryFace: "unfulfilled" } });
    const expectedWindows = { "player-back": [77, 360], "opponent-front": [81, 364] };
    const expectedPhases = { triangle: [[3, 4, 84]], fire: [[4, 107, 135], [5, 107, 135], [7, 110, 138], [9, 113, 141], [10, 116, 144], [11, 119, 147], [12, 122, 150], [3, 125, 153]], lightning: [[3, 158, 185], [4, 161, 188], [5, 164, 191]], ice: [[3, 208, 244], [4, 214, 250], [5, 220, 256], [7, 226, 262], [9, 232, 268], [10, 238, 274], [11, 244, 280]], simplePaletteBlend: [[3, 86, 123], [12, 244, 281]] };
    for (const side of ["player-back", "opponent-front"] as const) {
      const run = fixture.orientations[side]; const observed = result.orientations[side];
      expect(run.repeatProbeJsonSha256).toBe(run.probeJsonSha256);
      expect(run.repeatRawRgbSequenceSha256).toBe(run.rawRgbSequenceSha256);
      expect(run.sourceWindow).toMatchObject({ startFrame: expectedWindows[side][0], endFrame: expectedWindows[side][1], frameCount: 284, sourceFrameCount: 248 });
      expect(run.latches).toMatchObject({ hardwareOamEqualsPrecedingSoftware: "283/283", hardwareMatricesEqualsPrecedingSoftware: "283/283", hardwarePaletteEqualsPrecedingFaded: "283/283", hardwareOamExceptions: [], hardwareMatrixExceptions: [], hardwarePaletteExceptions: [] });
      expect(run.cleanup).toMatchObject({ age: 283, frame: expectedWindows[side][1], active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 });
      for (const [phase, expected] of Object.entries(expectedPhases)) expect(run.lifecycle[phase].map((item: Json) => [item.slot, item.start, item.end])).toEqual(expected);
      expect(observed.probeJsonSha256).toBe(run.probeJsonSha256);
      expect(observed.rawRgbSequenceSha256).toBe(run.rawRgbSequenceSha256);
      expect(observed.changeMapSha256).toBe(run.changeMapSha256);
      expect(existsSync(resolve(root, run.changeMap))).toBe(true);
      expect(existsSync(resolve(root, run.rawRgbArchive))).toBe(true);
      const dense = JSON.parse(gunzipSync(readFileSync(resolve(root, run.denseState))).toString("utf8")) as Json;
      expect(dense.frames).toHaveLength(284);
      expect(dense.frames[0]).toMatchObject({ frame: expectedWindows[side][0], animScriptActive: true });
      expect(dense.frames.at(-1)).toMatchObject({ frame: expectedWindows[side][1], animScriptActive: false });
      expect(dense.setup).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 2, battleNum: 2, trainerId: 110, sourceInitialized: true, customPartiesBuiltBeforeBattle: true });
      expect(dense.setup.player).toHaveLength(3); expect(dense.setup.opponent).toHaveLength(3);
    }
    expect(fixture.orientations["player-back"].rawRgbSequenceSha256).toBe("fb703918f565c8e7a615d95ca42d2f9e6223bd1aed43dbd22c1230d539c99ded");
    expect(fixture.orientations["opponent-front"].rawRgbSequenceSha256).toBe("8aeca5bf6d6b15274a22f3699f0942743eaf964a78ecf9faf2e060ecd4202149");
  });

  it("pins the independent exact controls and the unchanged frontier boundary", () => {
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_TRI_ATTACK")).toMatchObject({ status: "exact" });
    for (const move of ["MOVE_SCARY_FACE", "MOVE_GLARE", "MOVE_THUNDER"]) expect(coverage.entries.find((entry: Json) => entry.move === move)).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "shake-target-in-pattern-scary-face").fulfilled).toBe(true);
    expect(fixture.controls.siblingStatuses).toEqual({ MOVE_SCARY_FACE: "exact", MOVE_GLARE: "exact", MOVE_THUNDER: "exact", MOVE_TRI_ATTACK: "unsupported" });
    expect(fixture.evidenceScope).toMatchObject({ reducerAdded: false, assetBundleAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferAcceptance: false, boundaryOrBarrierChanged: false });
  });
});
