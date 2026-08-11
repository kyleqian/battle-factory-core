import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_DOUBLE_SLAP source contract", () => {
  it("pins the exclusive pointer interval, both branches, graph, and sole carrier", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/doubleSlapSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("0x082c93c9..0x082c941c (0x53 bytes)");
    expect(output).toContain("even -> left, odd -> right");
    expect(output).toContain("set 155 FRONTIER_MON_POLIWHIRL");
  });
});
