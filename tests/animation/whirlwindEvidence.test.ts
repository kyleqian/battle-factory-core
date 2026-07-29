import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_WHIRLWIND source evidence", () => {
  it("pins the legal carrier, complete component body, and sibling remainder", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/whirlwindSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(JSON.parse(output)).toEqual({
      carrier:
        "set 153 FRONTIER_MON_BUTTERFREE / SPECIES_BUTTERFREE / MOVE_WHIRLWIND",
      whirlwindLines: 6,
      components: [
        "asset:ANIM_TAG_WHIRLWIND_LINES",
        "sprite:gWhirlwindLineSpriteTemplate",
        "task:AnimTask_ShakeMon2",
        "task:AnimTask_SlideOffScreen",
        "task:AnimTask_TranslateMonEllipticalRespectSide",
      ],
      sibling: {
        move: "MOVE_DRILL_PECK",
        remainder:
          "independent BowMon body, AnimTask_DrillPeckHitSplats, IMPACT sprites, looped sound, ShakeMon2, and dense acceptance",
      },
    });
  });

  it("regenerates Butterfree and WHIRLWIND_LINES byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-whirlwind-assets-"));
    const output = join(scratch, "whirlwind.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractWhirlwindAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/whirlwind.json"),
    );
  });
});
