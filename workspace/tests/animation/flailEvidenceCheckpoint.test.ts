import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/flail-full-hp-evidence.json", "utf8",
));

describe("MOVE_FLAIL full-HP bilateral evidence checkpoint", () => {
  it("keeps the move unsupported and names every presentation-distinct power branch", () => {
    expect(fixture.status).toBe("unsupported");
    expect(fixture.coveredBranch).toEqual({naturalHpBand: "full", power: 20, shakeAmplitude: 1});
    expect(fixture.requiredBranches).toEqual([
      {power: 20, shakeAmplitude: 1, covered: true},
      {power: 40, shakeAmplitude: 3, covered: false},
      {power: 80, shakeAmplitude: 6, covered: false},
      {power: 100, shakeAmplitude: 8, covered: false},
      {power: 150, shakeAmplitude: 12, covered: false},
      {power: 200, shakeAmplitude: 16, covered: false},
    ]);
    expect(fixture.boundedRemainder).toMatch(/No reducer, typed seam, compositor/);
    expect(fixture.boundedRemainder).toMatch(/Luster Purge remains independently unsupported/);
  });

  it("pins complete twice-fresh bilateral rows, raw RGB, random placement, state, and latches", () => {
    expect(fixture.orientations.map((row: {sourceWindow: {frameCount: number}}) => row.sourceWindow.frameCount)).toEqual([114, 114]);
    for (const row of fixture.orientations) {
      expect(row.evidenceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(row.rawRgbSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(row.hitsplat).toMatchObject({sourceAge: 49, slot: 3, animation: 3, liveRows: 10});
    }
    expect(fixture.repeatability).toEqual({runsPerOrientation: 2, evidenceAndRawRgbByteStable: true});
    expect(Object.values(fixture.stateGate).every(Boolean)).toBe(true);
    expect(fixture.latches.wholeHardwareOamEqualsPrecedingSoftwareRows).toBe("113/113 bilaterally");
    expect(fixture.latches.hardwarePaletteEqualsPrecedingFadedRows).toMatch(/112\/113 bilaterally/);
    expect(fixture.latches.randomHitsplat).toMatch(/plain OAM RAM\+1; fresh affine paint RAM\+2 and teardown RAM\+1/);
    expect(fixture.animationRng.productionBoundary).toMatch(/gameplay gRngValue is unchanged/);
  });
});
