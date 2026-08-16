import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/fire-blast-evidence.json", "utf8",
));
const sha = (path: string): string => createHash("sha256")
  .update(readFileSync(path)).digest("hex");

describe("MOVE_FIRE_BLAST production framebuffer", () => {
  it("reuses the exact source-extracted SMALL_EMBER asset", () => {
    expect(fixture.source.smallEmberAsset).toBe(
      "src/assets/gen/battle-anim-small-ember.json",
    );
    expect(sha(fixture.source.smallEmberAsset))
      .toBe(fixture.source.smallEmberAssetSha256);
  });

  it("matches every retained bilateral row through inactive cleanup", () => {
    expect(sha(fixture.source.framebufferVerifier))
      .toBe(fixture.source.framebufferVerifierSha256);
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      fixture.source.framebufferVerifier,
    ], { encoding: "utf8" });
    expect(output).toContain("player-back: 197/197");
    expect(output).toContain("opponent-front: 197/197");
    expect(output).toContain("394/394 exact with zero residual pixels");
  });
});
