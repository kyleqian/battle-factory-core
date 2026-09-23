import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const run = (): Record<string, any> => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/furyCutterResidualDiagnosis.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_FURY_CUTTER actual-core residual closure", () => {
  it("closes the invariant and every live source phase without fitted pixels", () => {
    const first = run();
    expect(run()).toEqual(first);
    expect(first).toMatchObject({
      schema: "fury-cutter-residual-closure/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_FURY_CUTTER", status: "exact-closed", coverageCredit: true,
      actualCore: { rows: 344, framebufferMatched: 344, residualPixels: 0 },
      method: {
        sourceQuietRowsPerOrientation: 44,
        staticMask: "identical across source-quiet rows and subset of every retained row",
        noCoordinateOrRgbFitting: true, runtimeOrCoverageUse: false,
      },
      resolvedFrom: { residualPixels: 1_225_822,
        staticFieldBattlerChromePixels: 802_380, activePixels: 423_442 },
      residualPixels: 0, staticFieldBattlerChromePixels: 0, activePixels: 0,
      active: {
        monbgTransition: 0, cutObjAlpha: 0, monbgAlpha: 0, cutObjPalette: 0,
      },
      boundary: { productionChanged: true, coveragePromotion: true,
        componentTrackFulfilled: true, gameplayStateOwned: false,
        boundaryOrBarrierChanged: false },
    });
    expect(first.staticFieldBattlerChromePixels + first.activePixels).toBe(first.residualPixels);
    expect(first.orientations).toEqual([
      expect.objectContaining({ orientation: "player-back", rows: 172, quietRows: 44,
        baselineMaskPixels: 0, residualPixels: 0, staticPixels: 0, activePixels: 0 }),
      expect.objectContaining({ orientation: "opponent-front", rows: 172, quietRows: 44,
        baselineMaskPixels: 0, residualPixels: 0, staticPixels: 0, activePixels: 0 }),
    ]);
    for (const orientation of first.orientations) {
      const phases = Object.values(orientation.phases) as Array<Record<string, number>>;
      expect(phases.reduce((total, phase) => total + phase.residualPixels, 0))
        .toBe(orientation.residualPixels);
      expect(phases.reduce((total, phase) => total + phase.staticPixels + phase.activePixels, 0))
        .toBe(orientation.residualPixels);
    }
  }, 45_000);
});
