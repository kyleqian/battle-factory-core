import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const readJson = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
const verify = (): Json => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/skyAttackEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })) as Json;

describe("MOVE_SKY_ATTACK twice-fresh bilateral dense evidence", () => {
  it("pins every setup/unleash row, raw RGB row, normalized map, and repeat digest", () => {
    const fixture = readJson("tools/compare/fixtures/sky-attack-evidence.json");
    expect(fixture).toMatchObject({
      schema: "sky-attack-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_SKY_ATTACK", moveId: 143,
      status: "unsupported-evidence", coverageCredit: false,
      acceptance: { freshRunsPerOrientation: 2, setupRows: 149, unleashRows: 181, totalRowsPerOrientation: 330, totalRows: 660, firstInactiveCleanupRetained: true },
      evidenceScope: { completeSetupAndUnleashBodies: true, sharedSkyBodyIncluded: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
    });
    for (const [side, probe, rgb, map] of [
      ["player-back", "c6bffb702008a5124633aec363ce3378743ae703cacfecc790362f18abf2e627", "eea63f91eab03bb221f8cee27a20a0a6cdc5933ec5a6d331d77fd8548f0380dc", "f6f54948461a08eeaff4a4d469468f45a8b528642062587b27f236f3870cdb29"],
      ["opponent-front", "5cc63dd66da50b6919a2b987552c32566eb36246ef9ac83054f62fc533cfba92", "6acb23d41e6b7f10ebc3cba3862ebef5c576e93ad3b55cbfd195e3ade0f6ae84", "8c8a675df100520b77e8890a9551d0fcae75860c3b622122a5e03e28905b95b3"],
    ] as const) {
      const entry = fixture.orientations[side];
      expect(entry).toMatchObject({ probeJsonSha256: probe, repeatProbeJsonSha256: probe, rawRgbSequenceSha256: rgb, repeatRawRgbSequenceSha256: rgb, changeMapSha256: map, bodyWindows: [{ frameCount: 149 }, { frameCount: 181 }] });
      expect(entry.summary.setup).toMatchObject({ frameCount: 149, latches: { hardwareOamEqualsPrecedingSoftware: "148/148", hardwareMatricesEqualPrecedingSoftware: "148/148", hardwarePaletteEqualsPrecedingFaded: "147/148", paletteSameRowExceptions: [1] }, cleanup: { age: 148, active: false, visualTasks: 0, soundTasks: 0, ownedTasks: 0, ownedSprites: 0 } });
      expect(entry.summary.unleash).toMatchObject({ frameCount: 181, latches: { hardwareOamEqualsPrecedingSoftware: "180/180", hardwareMatricesEqualPrecedingSoftware: "180/180", hardwarePaletteEqualsPrecedingFaded: "179/180", paletteSameRowExceptions: [45] }, resources: { impact: { tile: { first: 1, last: 179, count: 179 } }, bird: { tile: { first: 4, last: 179, count: 176 } } }, cleanup: { age: 180, active: false, visualTasks: 0, soundTasks: 0, ownedTasks: 0, ownedSprites: 0 } });
    }
  });

  it("replays the immutable evidence checkpoint against the exact move and three fulfilled tracks", () => {
    const result = verify();
    expect(result).toMatchObject({ schema: "sky-attack-bilateral-evidence/v1", move: "MOVE_SKY_ATTACK", status: "unsupported-evidence", coverageCredit: false, boundary: { productionChanged: false, coveragePromotion: false, componentTracksFulfilled: false, barrierChanged: false } });
    for (const side of ["player-back", "opponent-front"]) expect(result.orientations[side]).toMatchObject({ setupRows: 149, unleashRows: 181, bodyWindows: [{ frameCount: 149 }, { frameCount: 181 }] });
    const coverage = readJson("ANIMATION_COVERAGE.json");
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SKY_ATTACK")).toMatchObject({ status: "exact" });
    for (const id of ["play-se1-with-panning", "blend-battle-anim-palette-exclude", "horizontal-shake-complex-bg-palette"]) expect(coverage.componentTracks.find((track: Json) => track.id === id)?.fulfilled).toBe(true);
  });
});
