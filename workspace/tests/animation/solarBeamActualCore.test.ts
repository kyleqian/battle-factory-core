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
      exactRows: 123,
      residualRows: 413,
      rowsSha256: "7f8a743a0c4ffa3faa86f61beee7e8b9bb2b4ec69668c3d20fc2ae319b596c97",
      firstResidual: {
        orientation: "player-back", body: "setup", age: 17, frame: 211,
        differentPixels: 8, maxChannelDelta: 111,
        bounds: { x0: 50, y0: 72, x1: 52, y1: 77 },
      },
      lastResidual: {
        orientation: "opponent-front", body: "unleash", age: 151, frame: 983,
        differentPixels: 642, maxChannelDelta: 255,
        bounds: { x0: 43, y0: 71, x1: 103, y1: 111 },
      },
      maximumResidual: {
        orientation: "player-back", body: "unleash", age: 90, frame: 728,
        differentPixels: 1590, maxChannelDelta: 255,
        bounds: { x0: 82, y0: 26, x1: 204, y1: 108 },
      },
    });
    expect(report.rows).toHaveLength(536);
    expect(report.rows.filter((row: { body: string }) => row.body === "setup")).toHaveLength(216);
    expect(report.rows.filter((row: { body: string }) => row.body === "unleash")).toHaveLength(320);
    expect(report.exactRows + report.residualRows).toBe(536);
    expect(Object.values(report.histogram).reduce((sum: number, count) => sum + Number(count), 0)).toBe(report.residualRows);
  }, 20_000);
});
