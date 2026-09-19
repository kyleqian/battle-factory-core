import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const fixture = JSON.parse(readFileSync("tools/compare/fixtures/psywave-evidence.json", "utf8")) as Json;
const sha = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");
const run = (path: string): string => execFileSync(process.execPath, ["--experimental-strip-types", path], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

describe("MOVE_PSYWAVE unsupported bilateral evidence checkpoint", () => {
  it("pins the complete source/ROM/component graph and Level-50 carrier census byte-identically", () => {
    const first = run(fixture.source.audit);
    expect(run(fixture.source.audit)).toBe(first);
    expect(createHash("sha256").update(first).digest("hex")).toBe(fixture.source.auditRunSha256);
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "psywave-source-audit/v1", move: "MOVE_PSYWAVE", moveId: 149, status: "unsupported", coverageCredit: false,
      source: { pointerOwnedRoot: { start: "0x082d3212", endExclusive: "0x082d3298", byteLength: 134 }, blocks: { Move_PSYWAVE: {}, PsywaveRings: {}, SetPsychicBackground: {}, UnsetPsychicBackground: {} } },
      behavior: { rings: { calls: 6, perCall: 2, total: 12 }, sinTimer: 100, targetPaletteCycle: { blends: 4 }, branches: { playerBack: "reachable", opponentFront: "reachable", contest: "unreachable-in-Factory-singles", partnerBattlers: "unreachable-in-singles" } },
      carriers: { count: 2, excludedOutsideLevel50: [] },
      checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableGraph: true, completeCarrierCensus: true, bilateralReachability: true, unreachableFactorySinglesBranchesNamed: true, reducerAdded: true, typedSceneOnSeam: true, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false },
    });
    expect(audit.graph.components).toHaveLength(14);
    expect(audit.carriers.level50.map((entry: Json) => [entry.index, entry.label])).toEqual([[121, "FRONTIER_MON_SPOINK"], [209, "FRONTIER_MON_CHIMECHO_1"]]);
    expect(sha(fixture.source.audit)).toBe(fixture.source.auditSha256);
    expect(sha(fixture.source.probe)).toBe(fixture.source.probeSha256);
    expect(sha(fixture.source.verifier)).toBe(fixture.source.verifierSha256);
  });

  it("retains twice-fresh complete-party dense semantics and raw RGB through cleanup", () => {
    expect(fixture).toMatchObject({
      status: "unsupported-evidence-checkpoint", coverageCredit: false,
      acceptance: { sourceRows: 410, rawRgbRows: 410, freshRunsPerOrientation: 2, firstInactiveCleanupAge: 204, ringGroups: 6, ringSprites: 12, completePartyOnlyStaging: true, normalizedMaps: true, latchMeasured: true },
      factoryCarrierCensus: { level50: [121, 209], excludedOutsideLevel50: [] },
      scope: { productionChanged: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false },
    });
    for (const side of ["player-back", "opponent-front"] as const) {
      const config = fixture.orientations[side];
      expect(config.probeJsonSha256).toBe(config.repeatProbeJsonSha256);
      expect(config.rawRgbSequenceSha256).toBe(config.repeatRawRgbSequenceSha256);
      for (const key of ["scenario", "denseState", "rawRgbArchive", "changeMap"]) expect(sha(config[key])).toBe(config[`${key}Sha256`]);
      const probe = JSON.parse(gunzipSync(readFileSync(config.denseState)).toString("utf8")) as Json;
      expect(probe.sourceWindow).toEqual(config.sourceWindow);
      expect(probe.frames).toHaveLength(205);
      expect(probe.frames[0]).toMatchObject({ animScriptActive: true, scriptOffset: 0 });
      expect(probe.frames.at(-1)).toMatchObject({ animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0, tasks: [] });
      expect(probe.frames.every((row: Json) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.parties.player.length === 3 && row.parties.opponent.length === 3)).toBe(true);
    }
  });

  it("verifies every move-owned latch map twice without granting siblings or coverage", () => {
    const first = run(fixture.source.verifier);
    expect(run(fixture.source.verifier)).toBe(first);
    expect(createHash("sha256").update(first).digest("hex")).toBe("9a79df8a4bb1f3d573430352855b5093c3f18ceef73f7aa00d0419d5330bd881");
    const verdict = JSON.parse(first) as Json;
    for (const [side, changedRgbRows] of [["player-back", 172], ["opponent-front", 173]] as const) expect(verdict.orientations[side]).toMatchObject({ rows: 205, ringLives: 12, latches: { oam: "204/204", matrices: "204/204", palette: "204/204" }, targetPaletteEdges: 24, bgVramEdges: [23, 184], resourceEdges: 26, presentationRngEdges: 203, gameplayRngEdges: 0, changedRgbRows, cleanupAge: 204 });
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Json;
    expect(coverage.entries.some((entry: Json) => entry.move === "MOVE_PSYWAVE")).toBe(false);
    expect(coverage.componentTracks.find((entry: Json) => entry.id === "loop-se-adjust-panning")).toMatchObject({ representatives: expect.arrayContaining(["MOVE_SHADOW_BALL", "MOVE_PSYBEAM", "MOVE_AURORA_BEAM", "MOVE_HYPER_BEAM", "MOVE_PSYWAVE", "MOVE_TRI_ATTACK"]) });
    expect(fixture.controls).toEqual({ named: { MOVE_SHADOW_BALL: "identity-only", MOVE_PSYBEAM: "identity-only", MOVE_AURORA_BEAM: "identity-only", MOVE_HYPER_BEAM: "identity-only", MOVE_TRI_ATTACK: "identity-only" }, transferCredit: false });
  });
});
