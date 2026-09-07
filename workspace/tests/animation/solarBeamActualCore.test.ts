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
      exactRows: 406,
      residualRows: 130,
      rowsSha256: "901957aea089ea8fb0ea48de80c2c8d8c605c3461d6959e33d8cb4182da0ee90",
      firstResidual: {
        orientation: "player-back", body: "unleash", age: 23, frame: 661,
        differentPixels: 1152, maxChannelDelta: 247,
        bounds: { x0: 148, y0: 26, x1: 204, y1: 71 },
      },
      lastResidual: {
        orientation: "opponent-front", body: "unleash", age: 151, frame: 983,
        differentPixels: 603, maxChannelDelta: 255,
        bounds: { x0: 43, y0: 71, x1: 103, y1: 111 },
      },
      maximumResidual: {
        orientation: "player-back", body: "unleash", age: 146, frame: 784,
        differentPixels: 1194, maxChannelDelta: 255,
        bounds: { x0: 148, y0: 26, x1: 204, y1: 71 },
      },
    });
    expect(report.rows).toHaveLength(536);
    expect(report.rows.filter((row: { body: string }) => row.body === "setup")).toHaveLength(216);
    expect(report.rows.filter((row: { body: string }) => row.body === "unleash")).toHaveLength(320);
    expect(report.exactRows + report.residualRows).toBe(536);
    expect(Object.values(report.histogram).reduce((sum: number, count) => sum + Number(count), 0)).toBe(report.residualRows);
  }, 20_000);
});
