import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("gGoldRingSpriteTemplate source track", () => {
  it("pins Hypnosis's lowest legal carrier and Psybeam's distinct body", () => {
    const output = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/compare/goldRingSourceAudit.ts"],
      { encoding: "utf8" },
    );
    expect(output).toContain("set 265 POLITOED_1");
    expect(output).toContain("Psybeam remains distinct");
  });
});
