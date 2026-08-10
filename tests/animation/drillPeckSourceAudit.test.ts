import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_DRILL_PECK source contract", () => {
  it("pins the full six-component body, interval, legal carrier, and controls", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/drillPeckSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result).toEqual({
      move: "MOVE_DRILL_PECK",
      sourceBounds: { start: "0x82cafc8", endExclusive: "0x82cb020" },
      carrier: "set 375 FRONTIER_MON_FEAROW_1 / SPECIES_FEAROW / MOVE_DRILL_PECK",
      components: [
        "asset:ANIM_TAG_IMPACT",
        "asset:ANIM_TAG_WHIRLWIND_LINES",
        "sprite:gBowMonSpriteTemplate",
        "sprite:gSlideMonToOriginalPosSpriteTemplate",
        "task:AnimTask_DrillPeckHitSplats",
        "task:AnimTask_ShakeMon2",
      ],
      controls: {
        MOVE_HEADBUTT: "all three gBowMonSpriteTemplate phases",
        MOVE_WHIRLWIND: "ANIM_TAG_WHIRLWIND_LINES",
        MOVE_SLAM: "gSlideMonToOriginalPosSpriteTemplate/IMPACT/ShakeMon2 nearest exact control",
      },
    });
  });
});
