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
      exactRows: 58,
      residualRows: 478,
      rowsSha256: "829fd3eeee7438739f9fbd4367da91297ee42e2ff0abc75cd86a64fbc197acbc",
      firstResidual: {
        orientation: "player-back", body: "setup", age: 9, frame: 203,
        differentPixels: 1394, maxChannelDelta: 16,
        bounds: { x0: 48, y0: 69, x1: 95, y1: 111 },
      },
      lastResidual: {
        orientation: "opponent-front", body: "unleash", age: 159, frame: 991,
        differentPixels: 18257, maxChannelDelta: 255,
        bounds: { x0: 0, y0: 0, x1: 239, y1: 149 },
      },
      maximumResidual: {
        orientation: "opponent-front", body: "unleash", age: 47, frame: 840,
        differentPixels: 20027, maxChannelDelta: 255,
        bounds: { x0: 0, y0: 0, x1: 239, y1: 149 },
      },
    });
    expect(report.rows).toHaveLength(536);
    expect(report.rows.filter((row: { body: string }) => row.body === "setup")).toHaveLength(216);
    expect(report.rows.filter((row: { body: string }) => row.body === "unleash")).toHaveLength(320);
    expect(report.exactRows + report.residualRows).toBe(536);
    expect(Object.values(report.histogram).reduce((sum: number, count) => sum + Number(count), 0)).toBe(report.residualRows);
  }, 20_000);
});
