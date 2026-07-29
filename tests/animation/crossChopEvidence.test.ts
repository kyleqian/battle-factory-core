import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_CROSS_CHOP source and asset checkpoint", () => {
  it("pins legal set 283 and the complete source component body", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/crossChopSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("set 283/species 67/move 238; 2 HANDS_AND_FEET + 1 CROSS_IMPACT");
  });

  it("re-extracts only Machoke, hands, and Cross Impact byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "cross-chop-assets-"));
    const output = join(directory, "cross-chop.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractCrossChopAssets.ts", "--out", output], { stdio: "pipe" });
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/cross-chop.json"));
  });
});
