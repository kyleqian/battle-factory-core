import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_NEEDLE_ARM source assets", () => {
  it("regenerates byte-for-byte from pinned pokeemerald source", () => {
    const dir = mkdtempSync(join(tmpdir(), "needle-arm-assets-"));
    const out = join(dir, "needle-arm.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractNeedleArmAssets.ts",
      "--out",
      out,
    ]);
    expect(readFileSync(out)).toEqual(
      readFileSync("src/animation/assets/needle-arm.json"),
    );
  });
});
