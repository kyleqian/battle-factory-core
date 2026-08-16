import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_SOFT_BOILED complete bilateral production framebuffer", () => {
  it("matches every retained row through first inactive cleanup", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/softBoiledFramebuffer.ts",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    expect(output).toContain(
      "player-back: 272/272 component/seam/raw-RGB/framebuffer exact",
    );
    expect(output).toContain(
      "opponent-front: 272/272 component/seam/raw-RGB/framebuffer exact",
    );
    expect(output).toContain(
      "MOVE_SOFT_BOILED: 544/544 exact with zero residual pixels",
    );
  });
});
