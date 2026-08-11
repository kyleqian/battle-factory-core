import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_DOUBLE_KICK source acceptance", () => {
  it("pins the exclusive pointer interval, full component graph, assets, and lowest carrier", () => {
    const output = execFileSync("node", [
      "--experimental-strip-types",
      "tools/compare/doubleKickSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("0x082d2261..0x082d2293 (0x32 bytes)");
    expect(output).toContain("HANDS_AND_FEET gfx/pal 0x08c2cbac..0x08c2cdf4");
    expect(output).toContain("IMPACT gfx/pal 0x08c1a3a0..0x08c1a490");
    expect(output).toContain("set 146 FRONTIER_MON_NIDORINA");
  });
});
