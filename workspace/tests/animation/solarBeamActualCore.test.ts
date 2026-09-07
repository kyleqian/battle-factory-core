import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_SOLAR_BEAM retained actual-core comparator", () => {
  it("reports every bilateral setup and unleash row twice deterministically", () => {
    const report = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/solarBeamActualCore.ts",
      "--passes=2",
    ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
    expect(report).toMatchObject({
      schema: "solar-beam-actual-core-residual/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_SOLAR_BEAM",
      passes: 2,
      deterministic: true,
      totalRows: 536,
      exactRows: 242,
      residualRows: 294,
      rowsSha256: "c140761065ede62a1ed2bbbf8aa4d3dd7ca194de618929826a548f058ae25986",
      firstResidual: {
        orientation: "player-back", body: "unleash", age: 5, frame: 643,
        differentPixels: 14, maxChannelDelta: 255,
        bounds: { x0: 87, y0: 97, x1: 93, y1: 111 },
      },
      lastResidual: {
        orientation: "opponent-front", body: "unleash", age: 151, frame: 983,
        differentPixels: 618, maxChannelDelta: 255,
        bounds: { x0: 43, y0: 71, x1: 103, y1: 111 },
      },
      maximumResidual: {
        orientation: "player-back", body: "unleash", age: 85, frame: 723,
        differentPixels: 1589, maxChannelDelta: 255,
        bounds: { x0: 94, y0: 26, x1: 204, y1: 107 },
      },
    });
    expect(report.rows).toHaveLength(536);
    expect(report.rows.filter((row: { body: string }) => row.body === "setup")).toHaveLength(216);
    expect(report.rows.filter((row: { body: string }) => row.body === "unleash")).toHaveLength(320);
    expect(report.exactRows + report.residualRows).toBe(536);
    expect(Object.values(report.histogram).reduce((sum: number, count) => sum + Number(count), 0)).toBe(report.residualRows);
  }, 20_000);
});
