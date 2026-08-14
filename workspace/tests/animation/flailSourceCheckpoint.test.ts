import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_FLAIL source checkpoint", () => {
  it("pins the exclusive body, all legal carriers, visual RNG, and Luster Purge remainder", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/flailSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("exclusive 0x082cd4f9..0x082cd536 (0x3d bytes)");
    expect(output).toContain("11 Level-50 legal species");
    expect(output).toContain("fixed animation 3 consumes exactly two Random2 calls");
    expect(output).toContain("power-shake amplitude is clamp(gAnimMovePower/12,1,16)");
    expect(output).toContain("MOVE_LUSTER_PURGE batch audit only");
    expect(output).toContain("six RNG hitsplats");
    expect(output).toContain("remain unsupported");
  });
});
