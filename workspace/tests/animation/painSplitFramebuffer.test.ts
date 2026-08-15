import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_PAIN_SPLIT complete bilateral production framebuffer", () => {
  it("matches all 162 retained component/seam/raw-RGB/shared-framebuffer rows", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/painSplitFramebuffer.ts"], { encoding: "utf8" });
    expect(output).toContain("player-back: 81/81");
    expect(output).toContain("opponent-front: 81/81");
    expect(output).toContain("MOVE_PAIN_SPLIT: 162/162 exact with zero residual pixels");
  });
});
