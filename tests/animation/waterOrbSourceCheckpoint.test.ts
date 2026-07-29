import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ANIM_TAG_WATER_ORB source checkpoint", () => {
  it("pins both independent move graphs, legal carriers, and proved primitives", () => {
    const output = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/compare/waterOrbSourceAudit.ts"],
      { encoding: "utf8" },
    );
    expect(output).toContain("Hydro Pump set 303/challenge 2");
    expect(output).toContain("Whirlpool set 170/challenge 0");
    expect(output).toContain("shared exact controls MUD_SHOT + WATER_GUN");
  });

  it("regenerates WATER_ORB, WATER_IMPACT, Masquerain, and Wailmer assets", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "water-orb-assets-"));
    const output = join(outputDirectory, "water-orb.json");
    execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "tools/compare/extractWaterOrbAssets.ts",
        "--out",
        output,
      ],
    );
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/water-orb.json"),
    );
  });
});
