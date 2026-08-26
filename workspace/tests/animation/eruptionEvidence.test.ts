import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/eruption-evidence.json", "utf8")) as Record<string, any>;
const sha = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("MOVE_ERUPTION bilateral dense evidence checkpoint", () => {
  it("keeps the evidence-only scope and independent controls explicit", () => {
    expect(fixture).toMatchObject({ schema: "eruption-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_ERUPTION", moveId: 284, status: "unsupported-dense-evidence-checkpoint", coverageCredit: false, evidenceScope: { productionAnimationChanged: false, reducerAdded: true, paletteComponentBanked: true, typedSeamAdded: false, compositorAdded: false, framebufferLookupAdded: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, fullDenseRowsRetained: true, twiceFreshByteIdentical: true } });
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_ERUPTION")).toBeUndefined();
    expect(coverage.componentTracks.find((track: any) => track.id === "eruption-warm-rock")).toMatchObject({ fulfilled: false, representatives: ["MOVE_ERUPTION"] });
    for (const [move, status] of [["MOVE_EARTHQUAKE", "exact"], ["MOVE_FISSURE", "exact"], ["MOVE_LUSTER_PURGE", "exact"], ["MOVE_SKY_ATTACK", undefined], ["MOVE_MAGNITUDE", undefined]] as const) expect(coverage.entries.find((entry: any) => entry.move === move)?.status).toBe(status);
  });
  it("strictly replays every retained bilateral row, transfer fit, lifecycle, and cleanup", () => {
    expect(sha(fixture.source.audit)).toBe(fixture.source.auditSha256);
    expect(sha(fixture.source.probe)).toBe(fixture.source.probeSha256);
    expect(sha(fixture.source.evidenceVerifier)).toBe(fixture.source.evidenceVerifierSha256);
    expect(sha(fixture.source.paletteComponentAudit)).toBe(fixture.source.paletteComponentAuditSha256);
    const summary = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.evidenceVerifier], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })) as Record<string, any>;
    expect(summary["player-back"]).toMatchObject({ sourceWindow: { startFrame: 234, endFrame: 709, frameCount: 476 }, lifecycleCounts: { launchRockCreations: 14, fallingRockCreations: 6, paletteBlendCreations: 2 }, audio: [{ age: 79, symbol: "se_m_explosion" }, { age: 239, symbol: "se_m_rock_throw" }], latches: { hardwareOamEqualsPrecedingSoftware: "475/475", hardwarePaletteEqualsPrecedingFaded: "475/475" }, state: { gameplayRngTransitions: [], partiesStable: true, engineStable: true, semanticStable: true }, cleanup: { age: 475, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 } });
    expect(summary["opponent-front"]).toMatchObject({ sourceWindow: { startFrame: 221, endFrame: 714, frameCount: 494 }, lifecycleCounts: { launchRockCreations: 14, fallingRockCreations: 6, paletteBlendCreations: 2 }, audio: [{ age: 79, symbol: "se_m_explosion" }, { age: 257, symbol: "se_m_rock_throw" }], latches: { hardwareOamEqualsPrecedingSoftware: "493/493", hardwarePaletteEqualsPrecedingFaded: "493/493" }, state: { gameplayRngTransitions: [], partiesStable: true, engineStable: true, semanticStable: true }, cleanup: { age: 493, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 } });
  });
});
