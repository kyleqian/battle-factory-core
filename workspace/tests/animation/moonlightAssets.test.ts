import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_MOONLIGHT source assets", () => {
  it("regenerates MOON, GREEN_SPARKLE, BLUE_STAR, and Gloom byte-for-byte", () => {
    const dir = mkdtempSync(join(tmpdir(), "moonlight-assets-"));
    const out = join(dir, "moonlight.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/extractMoonlightAssets.ts",
      "--out", out,
    ]);
    expect(readFileSync(out)).toEqual(
      readFileSync("src/animation/assets/moonlight.json"),
    );
  });
});
