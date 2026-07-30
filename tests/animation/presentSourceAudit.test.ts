import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_PRESENT source/controller checkpoint", () => {
  it("pins the legal carrier and both source animation bodies", () => {
    const result = spawnSync("node", ["--experimental-strip-types", "tools/compare/presentSourceAudit.ts"], { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("set 118 DELIBIRD is the sole/lowest");
    expect(result.stdout).toContain("RNG roll >= 204");
  });
});
