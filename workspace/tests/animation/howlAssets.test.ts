import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_HOWL source presentation assets", () => {
  it("regenerates Loudred and NOISE_LINE byte-for-byte", () => {
    const dir = mkdtempSync(join(tmpdir(), "pokebench-howl-assets-"));
    const out = join(dir, "howl.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractHowlAssets.ts",
      "--out",
      out,
    ]);
    expect(readFileSync(out)).toEqual(
      readFileSync("src/animation/assets/howl.json"),
    );
  });
});
