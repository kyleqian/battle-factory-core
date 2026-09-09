import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
type Side = "player-back" | "opponent-front";

const root = resolve(import.meta.dirname, "../..");
const sides: Side[] = ["player-back", "opponent-front"];
const sha256 = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/thunderbolt-evidence.json"), "utf8")) as Json;
let verified: Json | undefined;
let sourceAudit: Json | undefined;

function verify(): Json {
  verified ??= JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/thunderboltEvidence.ts"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }));
  return verified!;
}

function audit(): Json {
  sourceAudit ??= JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/thunderboltSourceAudit.ts"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }));
  return sourceAudit!;
}

function dense(side: Side): Json {
  const path = resolve(root, fixture.orientations[side].denseState);
  return JSON.parse(gunzipSync(readFileSync(path)).toString("utf8"));
}

describe("MOVE_THUNDERBOLT complete bilateral Scene-ON evidence checkpoint", () => {
  it("replays both full source windows and pins twice-fresh deterministic hashes", () => {
    const result = verify();
    expect(result).toMatchObject({
      schema: "thunderbolt-bilateral-evidence/v1",
      move: "MOVE_THUNDERBOLT",
      status: "unsupported-evidence",
      coverageCredit: false,
      boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false },
    });
    expect(fixture).toMatchObject({
      schema: "thunderbolt-bilateral-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_THUNDERBOLT",
      moveId: 85,
      status: "unsupported-evidence",
      coverageCredit: false,
      acceptance: { freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true, denseRows: { "player-back": 237, "opponent-front": 237 }, rawRgbRows: { "player-back": 237, "opponent-front": 237 } },
    });
    for (const side of sides) {
      const receipt = fixture.orientations[side];
      const observed = result.orientations[side];
      expect(observed).toMatchObject({
        sourceWindow: { frameCount: 237, sourceFrameCount: 209 },
        probeJsonSha256: receipt.probeJsonSha256,
        repeatProbeJsonSha256: receipt.repeatProbeJsonSha256,
        rawRgbSequenceSha256: receipt.rawRgbSequenceSha256,
      });
      expect(receipt.repeatProbeJsonSha256).toBe(receipt.probeJsonSha256);
      expect(receipt.repeatRawRgbSequenceSha256).toBe(receipt.rawRgbSequenceSha256);
      expect(sha256(readFileSync(resolve(root, receipt.denseState)))).toBe(receipt.denseStateSha256);
      expect(sha256(gunzipSync(readFileSync(resolve(root, receipt.denseState))))).toBe(receipt.probeJsonSha256);
      expect(sha256(readFileSync(resolve(root, receipt.rawRgbArchive)))).toBe(receipt.rawRgbArchiveSha256);
      expect(sha256(readFileSync(resolve(root, receipt.changeMap)))).toBe(receipt.changeMapSha256);
      expect(sha256(readFileSync(resolve(root, receipt.changeMapText)))).toBe(receipt.changeMapTextSha256);
      expect(receipt.sourceWindow.endFrame - receipt.sourceWindow.startFrame + 1).toBe(237);
    }
  });

  it("retains complete rows/maps and exact move-owned lifecycle cardinalities", () => {
    const boltEvents = [28, 30, 32, 34, 36, 37, 39, 41, 43, 45, 46, 48, 50, 52, 54];
    const taskShape = [
      [0, "AnimTask_BlendSpriteColor_Step2", 10, 14],
      [0, "AnimTask_ElectricBolt_Step", 28, 37], [1, "AnimTask_ElectricBolt_Step", 37, 46], [0, "AnimTask_ElectricBolt_Step", 46, 55],
      [0, "AnimTask_BlendSpriteColor_Step2", 57, 68], [0, "AnimTask_BlendSpriteColor_Step2", 70, 81],
      [0, "Task_WaitAndPlaySE", 173, 191], [0, "AnimTask_BlendSpriteColor_Step2", 230, 234],
    ];
    for (const side of sides) {
      const receipt = fixture.orientations[side];
      const map = JSON.parse(readFileSync(resolve(root, receipt.changeMap), "utf8")) as Json;
      const rows = dense(side).frames as Json[];
      expect(rows).toHaveLength(237);
      expect(map).toMatchObject({ schema: "thunderbolt-normalized-change-map/v1", side, sourceWindow: receipt.sourceWindow, changeMap: { tool: "tools/compare/frame-changemap.py" } });
      expect(map.rows).toHaveLength(237);
      expect(map.changeMap.rows).toHaveLength(237);
      expect(map.rows.every((row: Json, age: number) => row.age === age && row.source.age === age && row.digests.tasks && row.digests.sprites && row.digests.softwareOam && row.digests.hardwareOam && row.digests.softwareMatrices && row.digests.hardwareMatrices && row.digests.fadedPalette && row.digests.hardwarePalette && row.digests.parties && row.digests.battlers && row.digests.engine && row.digests.immutableState)).toBe(true);
      expect(map.changeMap.rows.every((row: Json) => row.source && row.counts && row.tasks && row.sprites && row.spriteFlags.length === 64 && row.spriteOrder.length === 64 && row.registers && row.battleBg && row.bgVram && row.tags && row.audio && row.animationRng !== undefined && row.immutableState && row.digests)).toBe(true);
      expect(rows.every((row: Json) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.spriteOrder.length === 64 && row.spriteFlags.length === 64 && row.bgVram.charBlockSha256.length === 4 && row.bgVram.screenBlockSha256.length === 32 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4)).toBe(true);
      expect(rows[0]).toMatchObject({ frame: receipt.sourceWindow.startFrame, animScriptActive: true });
      expect(rows.at(-1)).toMatchObject({ frame: receipt.sourceWindow.endFrame, animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0 });
      expect(map.lifecycle.tasks.map((life: Json) => [life.slot, life.func, life.start, life.end])).toEqual(taskShape);
      expect(map.lifecycle.electricBolt).toMatchObject({ taskStarts: [28, 37, 46], creationRows: boltEvents, segmentCount: 15 });
      expect(map.lifecycle.electricBolt.taskRows).toHaveLength(3);
      expect(map.lifecycle.electricBolt.taskRows.every((task: Json) => task.end - task.start === 9 && task.steps.length === 10)).toBe(true);
      expect(map.lifecycle.orb).toHaveLength(1);
      expect(map.lifecycle.orb[0]).toMatchObject({ start: 105, end: 149, first: { callback: "AnimThunderboltOrb_Step", matrixNum: 0 }, last: { data: expect.arrayContaining([0, 0, 0, 0]) } });
      expect(map.lifecycle.flashing).toHaveLength(8);
      expect(map.lifecycle.electricity).toHaveLength(8);
      expect(map.lifecycle.electricity.map((life: Json) => [life.slot, life.start, life.end])).toEqual([[3, 173, 178], [4, 177, 182], [3, 181, 186], [4, 185, 190], [3, 189, 194], [4, 193, 198], [3, 197, 202], [4, 201, 206]]);
      expect(map.cleanup).toMatchObject({ age: 236, frame: receipt.sourceWindow.endFrame, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 });
    }
  });

  it("pins transfer exceptions, palette/audio phases, tags, RNG, and immutable state", () => {
    const result = verify();
    const targetChanges = Array.from({ length: 26 }, (_, age) => age + 57);
    const bgChanges = [10, 11, 12, 13, 14, 15, 108, 116, 124, 132, 230, 231, 232, 233, 234, 235];
    const se1 = [[0, ["se_ball_open", 2147483648]], [106, ["se_m_hyper_beam", 0]], [107, ["se_m_hyper_beam", 3]], [132, ["se_m_hyper_beam", 2147483648]], [173, ["se_m_thunderbolt2", 0]], [174, ["se_m_thunderbolt2", 3]], [192, ["se_m_thunderbolt2", 0]], [193, ["se_m_thunderbolt2", 3]], [227, ["se_m_thunderbolt2", 2147483648]]];
    const se2 = [[0, ["se_select", 2147483648]], [28, ["se_m_thunderbolt", 0]], [29, ["se_m_thunderbolt", 3]], [37, ["se_m_thunderbolt", 0]], [38, ["se_m_thunderbolt", 3]], [46, ["se_m_thunderbolt", 0]], [47, ["se_m_thunderbolt", 3]], [81, ["se_m_thunderbolt", 2147483648]]];
    for (const side of sides) {
      const observed = result.orientations[side];
      expect(observed.latches).toMatchObject({ hardwareOamEqualsPrecedingSoftware: "236/236", hardwareMatricesEqualsPrecedingSoftware: "235/236", hardwarePaletteEqualsPrecedingFaded: "236/236", ordinaryOam: { bufferToHardware: "RAM+1", comparableRows: "236/236", creationExceptions: [] }, paletteTransfer: { fadedToHardware: "RAM+1", comparableRows: "236/236", exceptions: [] }, taskAxes: { sourceToBuffer: "RAM+1", bufferToHardware: "RAM+1", sourceTaskToDisplay: "RAM+2", segmentCount: 15 }, electricityArcs: { sourceToBuffer: "same-row", bufferToHardware: "RAM+1", sourceToDisplay: "RAM+1", count: 8 }, freshAffineMatrices: { count: 9, allocations: [{ age: 105, indices: [0, 3, 4, 5, 6, 7, 8, 9] }, { age: 106, indices: [10] }], firstEightDisplay: "source+2", lateMatrixDisplay: "source+1", hardwareChangeAge: 107 } });
      expect(observed.palette).toMatchObject({ targetChanges, bgChanges });
      expect(observed.audio).toEqual({ SE1: se1, SE2: se2 });
      expect(fixture.orientations[side].tags).toMatchObject({ loaded: { spark: 10001, shock3: 10282, spark2: 10011 }, edges: { tile: [[0, [false, false, false]], [1, [true, false, false]], [4, [true, true, false]], [7, [true, true, true]], [236, [false, false, false]]] } });
      expect(observed.state).toMatchObject({ battlersStable: true, immutableStable: true, gameplayRngTransitions: [], animationRng: { distinct: 236 }, enginePresentationEdges: [[0, 2], [105, side === "player-back" ? 0 : 1], [106, 2]] });
      expect(observed.state.partyPresentationEdges.map((edge: Json) => edge[0])).toEqual(side === "player-back" ? [0] : [0, 105, 106]);
      expect(observed.state.partiesStable).toBe(side === "player-back");
    }
  });

  it("keeps the historical evidence scope distinct from later move-only promotion", () => {
    const source = audit();
    expect(source).toMatchObject({ move: "MOVE_THUNDERBOLT", moveId: 85, status: "exact", pointerOwned: { root: { start: "0x82ca40a", endExclusive: "0x82ca5c0", byteLength: 438 }, subroutine: { symbol: "ElectricityEffect", start: "0x82d7bea", endExclusive: "0x82d7c75", byteLength: 139 }, combined: { byteLength: 577 } }, graph: { components: expect.arrayContaining(["asset:ANIM_TAG_SHOCK_3", "asset:ANIM_TAG_SPARK", "asset:ANIM_TAG_SPARK_2", "sprite:gElectricitySpriteTemplate", "sprite:gSparkElectricityFlashingSpriteTemplate", "sprite:gThunderboltOrbSpriteTemplate", "subroutine:ElectricityEffect", "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_ElectricBolt"]) } });
    expect(source.siblings).toEqual([{ move: "MOVE_SPARK", status: "exact", blocks: ["Move_SPARK", "ElectricityEffect"] }, { move: "MOVE_THUNDER_WAVE", status: "exact", blocks: ["Move_THUNDER_WAVE"] }, { move: "MOVE_ZAP_CANNON", status: "exact", blocks: ["Move_ZAP_CANNON", "ElectricityEffect"] }, { move: "MOVE_SHOCK_WAVE", status: "unsupported", blocks: ["Move_SHOCK_WAVE"] }]);
    expect(fixture.controls).toMatchObject({ inheritedSiblingLatchFacts: false, generalizedTransferFacts: false, inferredSiblingCredit: false, siblingStatuses: { MOVE_SPARK: "exact", MOVE_THUNDER_WAVE: "exact", MOVE_ZAP_CANNON: "unsupported", MOVE_SHOCK_WAVE: "unsupported" } });
    expect(fixture.evidenceScope).toMatchObject({ sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, normalizedMaps: true, frameChangeMaps: true, productionAnimationChanged: false, reducerAdded: false, assetBundleAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false });
    expect(fixture.acceptance.verdict).toContain("MOVE_THUNDERBOLT remains unsupported");
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries).toHaveLength(241);
    expect(coverage.entries.filter((entry: Json) => entry.status === "exact")).toHaveLength(241);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_THUNDERBOLT"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "spark-2-electricity")).toMatchObject({ representatives: ["MOVE_SPARK", "MOVE_THUNDERBOLT", "MOVE_THUNDER_WAVE", "MOVE_ZAP_CANNON"], fulfilled: true });
    expect(fixture.acceptance.latchVerdict).toContain("no sibling latch is inherited");
  });
});
