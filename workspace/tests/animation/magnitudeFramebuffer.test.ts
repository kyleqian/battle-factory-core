import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const run = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/magnitudeFramebuffer.ts",
], { encoding: "utf8" }));

describe("MOVE_MAGNITUDE actual core framebuffer", () => {
  it("is 764/764 zero-residual in two byte-identical fresh processes", () => {
    const first = run(), second = run();
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      schema: "magnitude-actual-core-verdict/v1",
      rows: 764,
      componentMatched: 764,
      matched: 764,
      residualPixels: 0,
      alteredLiveControl: {
        species: ["SURSKIT", "ARON"],
        geometryChanged: true,
        allocationOrderChanged: true,
        changed: true,
      },
    });
    expect(first.bodies).toEqual([
      { id: "regular-player", rows: 175, componentMatched: 175, matched: 175, residualPixels: 0, failures: [] },
      { id: "regular-opponent", rows: 175, componentMatched: 175, matched: 175, residualPixels: 0, failures: [] },
      { id: "intense-player", rows: 207, componentMatched: 207, matched: 207, residualPixels: 0, failures: [] },
      { id: "intense-opponent", rows: 207, componentMatched: 207, matched: 207, residualPixels: 0, failures: [] },
    ]);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  }, 30_000);
});
