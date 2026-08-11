import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_TRIPLE_KICK source checkpoint", () => {
  it("pins the complete exclusive pointer interval, all branches, graph, and sole carrier", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/tripleKickSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("0x082d2293..0x082d235a (0xc7 bytes)");
    expect(output).toContain("moveTurn 0 -> left, 1 -> right, fallback -> center");
    expect(output).toContain("set 236 FRONTIER_MON_HITMONTOP_1");
  });
});
