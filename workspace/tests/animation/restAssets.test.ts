import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("letter-z track source presentation assets", () => {
  it("regenerates Teddiursa, Seaking, and LETTER_Z byte-for-byte", () => {
    const dir = mkdtempSync(join(tmpdir(), "pokebench-rest-assets-"));
    const out = join(dir, "rest.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractRestAssets.ts",
      "--out",
      out,
    ]);
    expect(readFileSync(out)).toEqual(
      readFileSync("src/animation/assets/rest.json"),
    );
  });
});
