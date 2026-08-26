import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/sand-tomb-evidence.json", "utf8")) as Record<string, any>;
const sha = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("MOVE_SAND_TOMB bilateral dense evidence checkpoint", () => {
  it("keeps the move unsupported and the non-exclusive track unfulfilled", () => {
    expect(fixture).toMatchObject({
      schema: "sand-tomb-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_SAND_TOMB", moveId: 328,
      status: "unsupported", coverageCredit: false,
      evidenceScope: { productionAnimationChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, fullDenseRowsRetained: true, twiceFreshByteIdentical: true },
      acceptance: { freshRunsPerOrientation: 2, firstInactiveCleanupRetained: true, denseRows: { "player-back": 124, "opponent-front": 124 }, rawRgbRows: { "player-back": 124, "opponent-front": 124 }, normalizedChangeMaps: true, reducerRows: 0, typedSeamRows: 0, productionFramebufferRows: 0 },
    });
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_SAND_TOMB")).toBeUndefined();
    expect(coverage.queue).not.toContain("MOVE_SAND_TOMB");
    expect(coverage.componentTracks.find((track: any) => track.id === "sand-tomb-vortex")).toMatchObject({ representatives: ["MOVE_SAND_TOMB"], fulfilled: false });
  });

  it("strictly replays all 248 source/state/RGB rows and every owned lifecycle", () => {
    expect(sha(fixture.source.audit)).toBe(fixture.source.auditSha256);
    expect(sha(fixture.source.probe)).toBe(fixture.source.probeSha256);
    expect(sha(fixture.source.evidenceVerifier)).toBe(fixture.source.evidenceVerifierSha256);
    const summary = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.evidenceVerifier], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })) as Record<string, any>;
    expect(summary["player-back"]).toMatchObject({ sourceWindow: { startFrame: 77, endFrame: 200, frameCount: 124 }, dirtSprites: 18, blends: 2, shake: { start: 4, end: 87, count: 84 }, audio: [{ age: 4, channel: "SE1", symbol: "se_m_sand_tomb", panX: [63,63,0,0] }], resources: { tag: 10074, first: 1, last: 122, count: 122 }, latches: { oam: "123/123", matrices: "123/123", palette: "123/123" }, state: { partiesStable: true, engineStable: true, semanticStable: true, immutableStable: true, gameplayRngTransitions: [] }, cleanup: { age: 123, active: false, visualTasks: 0, soundTasks: 0, dirt: 0, blends: 0, tagged: false } });
    expect(summary["opponent-front"]).toMatchObject({ sourceWindow: { startFrame: 81, endFrame: 204, frameCount: 124 }, dirtSprites: 18, blends: 2, shake: { start: 4, end: 87, count: 84 }, audio: [{ age: 4, channel: "SE1", symbol: "se_m_sand_tomb", panX: [-63,-63,0,0] }], resources: { tag: 10074, first: 1, last: 122, count: 122 }, latches: { oam: "123/123", matrices: "123/123", palette: "123/123" }, state: { partiesStable: true, engineStable: true, semanticStable: true, immutableStable: true, gameplayRngTransitions: [] }, cleanup: { age: 123, active: false, visualTasks: 0, soundTasks: 0, dirt: 0, blends: 0, tagged: false } });
    expect(summary["player-back"].state.animationRngTransitions).toHaveLength(123);
    expect(summary["opponent-front"].state.animationRngTransitions).toHaveLength(123);
  });
});
