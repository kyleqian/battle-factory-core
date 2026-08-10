import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_KARATE_CHOP bounded source checkpoint", () => {
  it("pins the ROM interval, sole Level-50 carrier, callback body, and distinct components", () => {
    const output = execFileSync(
      "node",
      ["--experimental-strip-types", "tools/compare/karateChopSourceAudit.ts"],
      { encoding: "utf8" },
    );
    expect(output).toContain("0x082d20b3");
    expect(output).toContain("0x082d2105 (0x52 bytes)");
    expect(output).toContain("set 232 FRONTIER_MON_PRIMEAPE_1 is the sole and lowest legal Level-50 carrier");
    expect(output).toContain("Set 81 Mankey is below the Level-50 challenge range");
  });

  it("keeps Karate Chop exact after the Night Shade promotion", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status?: string }) => entry.status === "exact"))
      .toHaveLength(156);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_KARATE_CHOP"))
      .toMatchObject({ move: "MOVE_KARATE_CHOP", status: "exact" });
  });
});
