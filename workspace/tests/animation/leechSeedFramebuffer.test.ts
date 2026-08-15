import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_LEECH_SEED Scene-ON production framebuffer", () => {
  it("replays all four complete main and natural residual windows", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/leechSeedFramebuffer.ts"], { encoding: "utf8" });
    expect(output).toContain("player-back/main: 141/141");
    expect(output).toContain("player-back/residual: 207/207");
    expect(output).toContain("opponent-front/main: 141/141");
    expect(output).toContain("opponent-front/residual: 207/207");
    expect(output).toContain("MOVE_LEECH_SEED: 696/696 exact with zero residual pixels");
  }, 30_000);
});
