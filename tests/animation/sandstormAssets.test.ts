import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_SANDSTORM source assets", () => {
  it("regenerates byte-for-byte from pinned pokeemerald source", () => {
    const dir = mkdtempSync(join(tmpdir(), "sandstorm-assets-"));
    const out = join(dir, "sandstorm.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractSandstormAssets.ts",
      "--out",
      out,
    ]);
    expect(readFileSync(out)).toEqual(
      readFileSync("src/animation/assets/sandstorm.json"),
    );
  });
});
