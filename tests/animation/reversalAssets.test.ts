import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const reversal = JSON.parse(
  readFileSync("src/animation/assets/reversal.json", "utf8"),
);
const dynamicPunch = JSON.parse(
  readFileSync("src/animation/assets/dynamicPunch.json", "utf8"),
);
const fakeTears = JSON.parse(
  readFileSync("src/animation/assets/fake-tears.json", "utf8"),
);

describe("MOVE_REVERSAL source presentation assets", () => {
  it("regenerates byte-for-byte from pinned pokeemerald source", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-reversal-assets-"));
    const output = join(scratch, "reversal.json");
    execFileSync(
      "node",
      [
        "--experimental-strip-types",
        "tools/compare/extractReversalAssets.ts",
        "--out",
        output,
      ],
    );
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/reversal.json"),
    );
  });

  it("proves literal HANDS/IMPACT reuse while keeping BLUE_ORB independent", () => {
    expect(reversal.fist).toEqual(dynamicPunch.fist);
    expect(reversal.hitsplat).toEqual(dynamicPunch.hitsplat);
    expect(reversal.vigorothBack).not.toEqual(fakeTears.delcattyBack);
    expect(reversal.source.blueOrb).toContain(
      "gray_orb.png + blue_orb.pal",
    );
    expect(reversal.blueOrb.tileset.columns).toBe(1);
    expect(reversal.blueOrb.tileset.rows).toBe(3);
  });
});
