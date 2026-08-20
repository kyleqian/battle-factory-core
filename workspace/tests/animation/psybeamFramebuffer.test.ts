import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_PSYBEAM production framebuffer", () => {
  it("reuses source-identity art and matches all retained bilateral rows", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/psybeamFramebuffer.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("player-back: 160/160");
    expect(output).toContain("opponent-front: 160/160");
    expect(output).toContain("320/320 exact with zero residual pixels");
  });
});
