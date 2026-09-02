import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/zap-cannon-evidence.json"), "utf8")) as Json;
const sha = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const verify = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/zapCannonEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const sides = ["player-back", "opponent-front"] as const;

describe("MOVE_ZAP_CANNON complete bilateral Scene-ON evidence", () => {
  it("pins two fresh byte-identical dense windows, raw RGB, and normalized maps", () => {
    const result = verify();
    expect(result).toMatchObject({ schema: "zap-cannon-bilateral-evidence/v1", move: "MOVE_ZAP_CANNON", status: "unsupported-evidence", coverageCredit: false, boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false } });
    expect(fixture).toMatchObject({ schema: "zap-cannon-bilateral-evidence/v1", oracleProfile: "battle-scene-on", moveId: 192, status: "unsupported-evidence", coverageCredit: false, acceptance: { freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true, denseRows: { "player-back": 112, "opponent-front": 112 }, rawRgbRows: { "player-back": 112, "opponent-front": 112 } }, evidenceScope: { sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, normalizedMaps: true, frameChangeMaps: true, legalBilateralParties: true, productionAnimationChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false } });
    for (const side of sides) {
      const receipt = fixture.orientations[side]; const observed = result.orientations[side];
      expect(observed).toMatchObject({ sourceWindow: { frameCount: 112, sourceFrameCount: 84 }, probeJsonSha256: receipt.probeJsonSha256, repeatProbeJsonSha256: receipt.repeatProbeJsonSha256, rawRgbSequenceSha256: receipt.rawRgbSequenceSha256 });
      expect(receipt.repeatProbeJsonSha256).toBe(receipt.probeJsonSha256); expect(receipt.repeatRawRgbSequenceSha256).toBe(receipt.rawRgbSequenceSha256);
      expect(sha(readFileSync(resolve(root, receipt.denseState)))).toBe(receipt.denseStateSha256); expect(sha(gunzipSync(readFileSync(resolve(root, receipt.denseState))))).toBe(receipt.probeJsonSha256);
      expect(sha(readFileSync(resolve(root, receipt.rawRgbArchive)))).toBe(receipt.rawRgbArchiveSha256); expect(sha(readFileSync(resolve(root, receipt.changeMap)))).toBe(receipt.changeMapSha256); expect(sha(readFileSync(resolve(root, receipt.changeMapText)))).toBe(receipt.changeMapTextSha256);
      const dense = JSON.parse(gunzipSync(readFileSync(resolve(root, receipt.denseState))).toString("utf8")) as Json; const map = JSON.parse(readFileSync(resolve(root, receipt.changeMap), "utf8")) as Json;
      expect(dense.frames).toHaveLength(112); expect(map).toMatchObject({ schema: "zap-cannon-normalized-change-map/v1", side, sourceWindow: receipt.sourceWindow, changeMap: { tool: "tools/compare/frame-changemap.py" } }); expect(map.rows).toHaveLength(112); expect(map.changeMap.rows).toHaveLength(112);
      expect(dense.frames.every((row: Json) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.spriteOrder.length === 64 && row.spriteFlags.length === 64 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4)).toBe(true);
      expect(map.rows.every((row: Json, age: number) => row.age === age && row.source.age === undefined && row.surfaces.softwareMatrices.length === 32 && row.surfaces.hardwareMatrices.length === 32 && row.surfaces.fadedPalette.length === 512 && row.surfaces.hardwarePalette.length === 512 && row.digests.softwareOam && row.digests.hardwareOam && row.digests.audio && row.digests.immutableState)).toBe(true);
      expect(map.cleanup).toMatchObject({ age: 111, frame: receipt.sourceWindow.endFrame, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 });
    }
  });

  it("pins the move-owned topology, latches, palettes, audio, RNG, cleanup, and no promotion", () => {
    const result = verify();
    for (const side of sides) {
      const observed = result.orientations[side];
      expect(observed.lifecycle.ball.map((life: Json) => [life.slot, life.start, life.end])).toEqual([[3, 7, 38]]);
      expect(observed.lifecycle.sparks.map((life: Json) => [life.slot, life.start, life.end])).toEqual(side === "player-back" ? [[4, 7, 36], [5, 7, 36], [7, 7, 36], [9, 7, 36], [10, 7, 36], [11, 7, 36], [12, 8, 36], [13, 8, 36]] : [[4, 7, 36], [5, 7, 36], [7, 7, 36], [9, 7, 36], [10, 7, 36], [11, 7, 36], [12, 7, 36], [13, 8, 36]]);
      expect(observed.lifecycle.electricity.map((life: Json) => [life.slot, life.start, life.end])).toEqual([[3, 57, 62], [4, 61, 66], [3, 65, 70], [4, 69, 74], [3, 73, 78], [4, 77, 82], [3, 81, 86], [4, 85, 90]]);
      expect(observed.lifecycle.tasks.map((life: Json) => [life.slot, life.func, life.start, life.end])).toEqual([[0, "AnimTask_ShakeMon2_Step", 40, 47], [0, "Task_WaitAndPlaySE", 57, 75]]);
      expect(observed.latches).toMatchObject({ hardwareOamEqualsPrecedingSoftware: "111/111", hardwareMatricesEqualsPrecedingSoftware: "110/111", hardwarePaletteEqualsPrecedingFaded: "111/111", hardwareMatrixExceptions: [8], sourceToBuffer: "same-row", bufferToHardware: "RAM+1", affineMatrices: { count: 8, softwareChanges: expect.arrayContaining([7, 8]), hardwareChanges: expect.arrayContaining([9, 10]) }, paletteTransfer: { fadedChanges: [1, 4], unfadedChanges: [1, 4], hardwareChanges: [2, 5], fadedToHardware: "RAM+1" } });
      expect(observed.tags).toMatchObject({ loaded: { blackBall2: 10171, spark2: 10011 }, edges: { tile: [[0, [false, false]], [1, [true, false]], [4, [true, true]], [111, [false, false]]] } });
      expect(observed.audio.SE1).toEqual([[0, ["se_ball_open", 2147483648]], [7, ["se_m_thunder_wave", 0]], [8, ["se_m_thunder_wave", 3]], [57, ["se_m_thunderbolt2", 0]], [58, ["se_m_thunderbolt2", 3]], [76, ["se_m_thunderbolt2", 0]], [77, ["se_m_thunderbolt2", 3]], [111, ["se_m_thunderbolt2", 2147483648]]]);
      expect(observed.state).toMatchObject({ partiesStable: true, battlersStable: true, immutableStable: true, gameplayRngTransitions: [], animationRng: { distinct: 111 } });
    }
    expect(fixture.controls).toEqual({ inheritedSiblingLatchFacts: false, generalizedTransferFacts: false, inferredSiblingCredit: false, siblingStatuses: { MOVE_SPARK: "exact", MOVE_THUNDERBOLT: "exact", MOVE_THUNDER_WAVE: "exact", MOVE_SHOCK_WAVE: "unsupported", MOVE_ZAP_CANNON: "unsupported" } });
    expect(fixture.acceptanceVerdict).toContain("remains unsupported");
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_ZAP_CANNON")).toBeUndefined();
    const track = coverage.componentTracks.find((entry: Json) => entry.id === "spark-2-electricity");
    expect(track).toMatchObject({ representatives: ["MOVE_SPARK", "MOVE_THUNDERBOLT", "MOVE_THUNDER_WAVE", "MOVE_ZAP_CANNON"] });
    expect(track.fulfilled ?? false).toBe(false);
  });
});
