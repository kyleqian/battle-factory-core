import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_TICKLE source checkpoint", () => {
  it("pins legal set 138 and its independent EYE_SPARKLE/Sway/Rock body", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/tickleSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("set 138/species 139/move 321; EYE_SPARKLE");
  });
});
