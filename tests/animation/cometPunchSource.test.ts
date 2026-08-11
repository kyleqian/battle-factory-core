import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_COMET_PUNCH source contract", () => {
  it("pins its exclusive pointer interval, both routes, fist graph, and sole carrier", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/cometPunchSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("0x082ca2c3..0x082ca33b (0x78 bytes)");
    expect(output).toContain("even -> left, odd -> right");
    expect(output).toContain("set 159 FRONTIER_MON_LEDIAN");
  });

  it("audits the source-derived IMPACT and HANDS_AND_FEET assets deterministically", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/cometPunchAssetAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("MOVE_COMET_PUNCH deterministic asset audit exact");
    expect(output).toContain("HANDS_AND_FEET 2e383e1735d85d2a31d307d25a4eb2de75d8f6450af80504c25fd38f2187797c");
    expect(output).toContain("IMPACT 37ca40afc9002588e5f62d2d20e5dd37058ba7ad57c9615d1e46282372cc55fc");
  });
});
