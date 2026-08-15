import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_DREAM_EATER Scene-ON production framebuffer", () => {
  it("replays both complete retained windows through the shared framebuffer", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/dreamEaterFramebuffer.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("MOVE_DREAM_EATER: 533/533 rows exact with zero residual pixels");
  }, 20_000);
});
