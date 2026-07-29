import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_WISH source assets", () => {
  it("regenerates GOLD_STARS, SPARKLE_2, and Illumise byte-for-byte", () => {
    const dir = mkdtempSync(join(tmpdir(), "wish-assets-"));
    const out = join(dir, "wish.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/extractWishAssets.ts",
      "--out", out,
    ]);
    expect(readFileSync(out)).toEqual(
      readFileSync("src/animation/assets/wish.json"),
    );
  });
});
