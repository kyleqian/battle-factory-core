import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
describe("MOVE_LEAF_BLADE source and asset checkpoint", () => {
  it("pins legal set 453 and its distinct complete source body", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/leafBladeSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("set 453/species 279/move 348; LEAF + CROSS_IMPACT");
  });
  it("re-extracts only Sceptile, Leaf, and Cross Impact byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "leaf-blade-assets-")); const output = join(directory, "leaf-blade.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractLeafBladeAssets.ts", "--out", output], { stdio: "pipe" });
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/leaf-blade.json"));
  });
});
