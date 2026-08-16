import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_HEAL_BELL complete bilateral production framebuffer", () => {
  it("matches all 522 retained component/seam/raw-RGB/shared-framebuffer rows", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/healBellFramebuffer.ts"], { encoding: "utf8" });
    expect(output).toContain("player-back: 261/261");
    expect(output).toContain("opponent-front: 261/261");
    expect(output).toContain("MOVE_HEAL_BELL: 522/522 exact with zero residual pixels");
  });
});
