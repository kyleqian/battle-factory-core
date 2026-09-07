import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_SOLAR_BEAM retained actual-core comparator", () => {
  it("closes every bilateral setup and unleash row plus an altered live control twice", () => {
    const report = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/solarBeamActualCore.ts",
      "--passes=2",
      "--require-exact",
    ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
    expect(report).toMatchObject({
      schema: "solar-beam-actual-core-residual/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_SOLAR_BEAM",
      passes: 2,
      deterministic: true,
      totalRows: 536,
      exactRows: 536,
      residualRows: 0,
      rowsSha256: "b1c852b517beb0f046a28d1b21293e221f4935cf7dab8f4b143bd10356dee972",
      firstResidual: null,
      lastResidual: null,
      maximumResidual: null,
      alteredControl: {
        passes: 2,
        deterministic: true,
        species: ["VILEPLUME", "ONIX"],
        sides: ["player", "opponent"],
        baseFramebufferSequenceSha256: "d4ca667834a81aefa4fd700d7cd27846c062db27df1638a4bead6cfc21220983",
        alteredFramebufferSequenceSha256: "8cce16358e5c9ff2203e0eb930653f672942eb3975e4776e06bf416be82379aa",
      },
    });
    expect(report.rows).toHaveLength(536);
    expect(report.rows.filter((row: { body: string }) => row.body === "setup")).toHaveLength(216);
    expect(report.rows.filter((row: { body: string }) => row.body === "unleash")).toHaveLength(320);
    expect(report.exactRows + report.residualRows).toBe(536);
    expect(report.alteredControl.baseFramebufferSequenceSha256)
      .not.toBe(report.alteredControl.alteredFramebufferSequenceSha256);
    expect(Object.values(report.histogram).reduce((sum: number, count) => sum + Number(count), 0)).toBe(report.residualRows);
  }, 20_000);
});
