import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_FOCUS_ENERGY source checkpoint", () => {
  it("pins the legal Taillow source set and complete shared-asset body", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/focusEnergySourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("legal set 44/species 304/move 116; 3 EndureEffect calls × 5 FOCUS_ENERGY sprites");
    expect(output).toContain("white BlendColorCycle(2,2,0,11); attacker ShakeMon2(1,0,32,1)");
  });
});
