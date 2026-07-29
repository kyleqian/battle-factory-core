import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_AROMATHERAPY FLOWER checkpoint", () => {
  it("pins the legal carrier, source body, and Petal Dance distinction", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/aromatherapySourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("set 394/FRONTIER_MON_VILEPLUME_1");
    expect(output).toContain("7 small + 2 big");
  });

  it("regenerates Vileplume and ANIM_TAG_FLOWER art byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "pokebench-aromatherapy-assets-"));
    const output = join(directory, "aromatherapy.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/extractAromatherapyAssets.ts", "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/aromatherapy.json"));
  });
});
