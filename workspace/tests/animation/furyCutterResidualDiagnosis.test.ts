import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const run = (): Record<string, any> => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/furyCutterResidualDiagnosis.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_FURY_CUTTER actual-core residual diagnosis", () => {
  it("separates the invariant static mask from every live source phase", () => {
    const first = run();
    expect(run()).toEqual(first);
    expect(first).toMatchObject({
      schema: "fury-cutter-residual-diagnosis/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_FURY_CUTTER", status: "unsupported-diagnostic", coverageCredit: false,
      actualCore: { rows: 344, framebufferMatched: 0, residualPixels: 1_225_822 },
      method: {
        sourceQuietRowsPerOrientation: 44,
        staticMask: "identical across source-quiet rows and subset of every retained row",
        noCoordinateOrRgbFitting: true, runtimeOrCoverageUse: false,
      },
      residualPixels: 1_225_822, staticFieldBattlerChromePixels: 802_380,
      activePixels: 423_442,
      active: {
        monbgTransition: 30_072, cutObjAlpha: 210_120,
        monbgAlpha: 30_310, cutObjPalette: 152_940,
      },
      boundary: { productionChanged: false, coveragePromotion: false,
        componentTrackFulfilled: false, gameplayStateOwned: false,
        boundaryOrBarrierChanged: false },
    });
    expect(first.staticFieldBattlerChromePixels + first.activePixels).toBe(first.residualPixels);
    expect(first.orientations).toEqual([
      expect.objectContaining({ orientation: "player-back", rows: 172, quietRows: 44,
        baselineMaskPixels: 2_359, residualPixels: 626_060, staticPixels: 405_748,
        activePixels: 220_312 }),
      expect.objectContaining({ orientation: "opponent-front", rows: 172, quietRows: 44,
        baselineMaskPixels: 2_306, residualPixels: 599_762, staticPixels: 396_632,
        activePixels: 203_130 }),
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
