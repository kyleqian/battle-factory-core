import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/extrasensory-evidence.json"), "utf8")) as Json;
const sha = (path: string): string => createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");
const run = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extrasensoryEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

describe("MOVE_EXTRASENSORY unsupported evidence checkpoint", () => {
  it("retains complete twice-fresh bilateral state, raw RGB, and normalized maps", () => {
    expect(fixture).toMatchObject({
      schema: "extrasensory-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_EXTRASENSORY", moveId: 326,
      status: "unsupported-evidence-checkpoint", coverageCredit: false,
      acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 161, "opponent-front": 161 }, totalRows: 322, firstInactiveCleanupRetained: true },
      evidenceScope: { completePointerBody: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, allThreeDistortionStages: true, bothAttackerBlendPrograms: true, cloneGrowthShrinkTeardown: true, defenderPartnerMonbg: true, psychicBackground: true, paletteRegistersAudioAllocationOrder: true, firstInactiveCleanup: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
    });
    for (const [side, hashes] of Object.entries({
      "player-back": { scenario: "93c95bfee5259c67eef019f306a6b7d1ac0ca9e25d1fb3e27f7d092a50b20228", dense: "71fe9212bceb13a998668c451db40915e41215881fda4a22d745a9235b390886", probe: "40519f5f249c10f178d5c5b287eff3fdeef9090e0b349ba3c7888ca25f8971d2", archive: "6f42739e672b3f47c4b2a11d27592527a1cabe1dc594d30b1b0d5ab9ec6d9fa8", rgb: "54456d0178c6c6a449246ca719009f45ce38ac4bae7f6c8eec31b181f6f8ac30", map: "70a55e952da0fa262780f24ffec1b16fc79a54d62ed25ba21431968d5c1bf89b" },
      "opponent-front": { scenario: "308a9f3af259f43dc94210b4a9b39cc14bae7ccd8b9166861fcd436fa496d96a", dense: "a0cf3ed224554fdf98ca1365e845ef6ec08f8feff9150a341939b65f794d9bbb", probe: "b1de132932e0bd12b91f545a909dcbeb9c850b9205a10812bde7e4526efd38a7", archive: "a6b4715e19da9c7dc8180560bd151d385734f3a5e3e0b2370a33869929a38898", rgb: "ffd4644e668ca148ced1f5f8f5828f78a3add4ac5d3fa6a13a0f8ca6ca0562db", map: "1a2eab6f16c72b89c952abbd5bf0fffe2c11c6a82607004e70c3323b22c92643" },
    })) {
      const receipt = fixture.orientations[side];
      expect(receipt).toMatchObject({ scenarioSha256: hashes.scenario, denseStateSha256: hashes.dense, probeJsonSha256: hashes.probe, repeatProbeJsonSha256: hashes.probe, rawRgbArchiveSha256: hashes.archive, rawRgbSequenceSha256: hashes.rgb, repeatRawRgbSequenceSha256: hashes.rgb, changeMapSha256: hashes.map, sourceWindow: { frameCount: 161 }, summary: { latches: { hardwareOamEqualsPrecedingSoftware: "160/160", hardwareMatricesEqualPrecedingSoftware: "136/160", hardwarePaletteEqualsPrecedingFaded: "159/160", oamExceptions: [], matrixExceptions: Array.from({ length: 24 }, (_, index) => index + 95), paletteExceptions: [39], scanlineStageSourceLives: [[42, 66], [68, 92], [94, 118]], scanlineStageDisplayedLives: [[43, 67], [69, 93], [95, 119]], cloneSourceLife: [94, 117], cloneOamDisplayedLife: [95, 118], cloneAffineDisplayedChanges: [96, 118] }, state: { partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, rawBattleStateStable: true, gameplayRngStable: true }, cleanup: { age: 160, active: false, visualTasks: 0, soundTasks: 0, ownedTasks: 0, cloneSprites: 0, scanlineState: 0 } } });
      expect(sha(receipt.scenario)).toBe(hashes.scenario);
      expect(sha(receipt.denseState)).toBe(hashes.dense);
      expect(sha(receipt.rawRgbArchive)).toBe(hashes.archive);
      expect(sha(receipt.changeMap)).toBe(hashes.map);
      const probe = JSON.parse(gunzipSync(readFileSync(resolve(root, receipt.denseState))).toString("utf8")) as Json;
      expect(probe.frames).toHaveLength(161);
      expect(probe.frames.at(-1)).toMatchObject({ animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0 });
    }
  });

  it("replays all move-owned latches deterministically without granting production credit", () => {
    const first = run();
    expect(run()).toBe(first);
    expect(createHash("sha256").update(first).digest("hex")).toBe("2e9452be249ef7d35caf8bb408c1c429132cce7196cb5787fe5ec9f85666fa2c");
    expect(JSON.parse(first)).toMatchObject({ move: "MOVE_EXTRASENSORY", status: "unsupported-evidence-checkpoint", coverageCredit: false, boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false } });
  });

  it("keeps the move staged, its novel track unfulfilled, and shared Psychic controls independent", () => {
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_EXTRASENSORY")).toMatchObject({ status: "staged" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "extrasensory-distortion-clone")).toMatchObject({ components: ["task:AnimTask_ExtrasensoryDistortion", "task:AnimTask_TransparentCloneGrowAndShrink"], representatives: ["MOVE_EXTRASENSORY"], fulfilled: false });
    for (const move of ["MOVE_SKILL_SWAP", "MOVE_AMNESIA", "MOVE_CONFUSION", "MOVE_FUTURE_SIGHT", "MOVE_PSYCHIC"]) expect(coverage.entries.find((entry: Json) => entry.move === move)).toMatchObject({ status: "exact" });
    expect(fixture.controls).toEqual({ named: { MOVE_SKILL_SWAP: "exact", MOVE_AMNESIA: "exact", MOVE_CONFUSION: "exact", MOVE_FUTURE_SIGHT: "exact", MOVE_PSYCHIC: "exact" }, transferCredit: false });
  });
});
