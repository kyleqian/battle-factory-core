import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_ROAR source checkpoint", () => {
  it("pins the legal carrier, full animation body, and controller boundary", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/roarSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain(
      "set 119/FRONTIER_MON_HOUNDOUR -> SPECIES_HOUNDOUR 228/MOVE_ROAR 46",
    );
    expect(output).toContain("target SlideOffScreen");
    expect(output).toContain("forcerandomswitch");
  });
});
