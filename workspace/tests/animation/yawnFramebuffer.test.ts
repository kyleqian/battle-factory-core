import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_YAWN complete bilateral production framebuffer", () => {
  it("matches all 426 retained reducer/component/seam/raw-RGB/shared-framebuffer rows", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/yawnFramebuffer.ts"], { encoding: "utf8" });
    expect(output).toContain("player-back: 213/213");
    expect(output).toContain("opponent-front: 213/213");
    expect(output).toContain("MOVE_YAWN: 426/426 exact with zero residual pixels");
  });
});
