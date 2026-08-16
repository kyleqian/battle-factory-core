import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_BLIZZARD production framebuffer", () => {
  it("matches every retained Scene-ON row through the shared renderer", () => {
    const output = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/compare/blizzardFramebuffer.ts"],
      { cwd: resolve("."), encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
    );

    expect(output).toContain("player-back: 372/372");
    expect(output).toContain("opponent-front: 361/361");
    expect(output).toContain("MOVE_BLIZZARD: 733/733 exact with zero residual pixels");
  });
});
