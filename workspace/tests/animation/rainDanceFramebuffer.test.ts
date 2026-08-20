import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { verifyRainDanceFramebuffer } from "../../tools/compare/rainDanceFramebuffer.ts";

describe("MOVE_RAIN_DANCE production framebuffer", () => {
  test("regenerates the source Rain Drops art and palette byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "rain-dance-assets-"));
    const output = join(scratch, "rain-drops.json");
    try {
      execFileSync(process.execPath, [
        "--experimental-strip-types",
        "tools/compare/extractRainDanceAssets.ts",
        "--out",
        output,
      ]);
      expect(readFileSync(output)).toEqual(
        readFileSync("src/animation/assets/rain-drops.json"),
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test("matches every retained bilateral source row through inactive cleanup", () => {
    expect(verifyRainDanceFramebuffer()).toEqual([
      { orientation: "player-back", rows: 187, framebufferCompared: true },
      { orientation: "opponent-front", rows: 187, framebufferCompared: true },
    ]);
  }, 30_000);
});
