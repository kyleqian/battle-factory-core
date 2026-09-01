import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const verify = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/waterSpoutTierEvidence.ts"], { encoding: "utf8" }));

describe("MOVE_WATER_SPOUT legal lower-HP tier evidence", () => {
  it("retains every bilateral tier 0..2 row and raw RGB twice fresh", () => {
    expect(verify()).toEqual([
      { orientation: "player-back", rows: { 0: 204, 1: 204, 2: 229 }, rawRgb: expect.any(String), twiceFresh: true },
      { orientation: "opponent-front", rows: { 0: 201, 1: 206, 2: 230 }, rawRgb: expect.any(String), twiceFresh: true },
    ]);
  }, 60_000);
});
