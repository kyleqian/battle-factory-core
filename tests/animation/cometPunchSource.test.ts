import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_COMET_PUNCH source contract", () => {
  it("pins its exclusive pointer interval, both routes, fist graph, and sole carrier", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/cometPunchSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("0x082ca2c3..0x082ca33b (0x78 bytes)");
    expect(output).toContain("even -> left, odd -> right");
    expect(output).toContain("set 159 FRONTIER_MON_LEDIAN");
  });
});
