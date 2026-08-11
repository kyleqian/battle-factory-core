import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_HYPNOSIS source assets", () => {
  it("regenerates GoldRing and Politoed presentation assets byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-hypnosis-assets-"));
    const out = join(scratch, "hypnosis.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractHypnosisAssets.ts",
      "--out",
      out,
    ]);
    expect(readFileSync(out)).toEqual(
      readFileSync("src/animation/assets/hypnosis.json"),
    );
  });
});
