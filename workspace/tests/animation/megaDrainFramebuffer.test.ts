import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_MEGA_DRAIN Scene-ON production framebuffer", () => {
  it("replays both complete retained windows through the shared framebuffer", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/megaDrainFramebuffer.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("MOVE_MEGA_DRAIN: 436/436 rows exact with zero residual pixels");
  });
});
