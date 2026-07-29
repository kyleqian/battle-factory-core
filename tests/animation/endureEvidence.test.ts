import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_ENDURE source checkpoint", () => {
  it("pins the legal Eevee source set and distinct red shared-asset body", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/endureSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("legal Level-50 set 113/species 133/move 203; 3 EndureEffect calls × 5 FOCUS_ENERGY sprites");
    expect(output).toContain("red BlendColorCycle(2,2,0,11); attacker ShakeMon2(1,0,32,1)");
  });
});
