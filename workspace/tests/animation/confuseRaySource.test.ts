import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_CONFUSE_RAY source contract", () => {
  it("pins the exclusive interval, 12-component graph, lowest carrier, and panning task", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/confuseRaySourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result).toMatchObject({
      move: "MOVE_CONFUSE_RAY",
      sourceBounds: { start: "0x082cbe91", endExclusive: "0x082cbee4", bytes: "0x53" },
      carrier: "set 116 FRONTIER_MON_CHINCHOU / SPECIES_CHINCHOU / MOVE_CONFUSE_RAY",
      soundTask: "SoundTask_AdjustPanningVar uses gAnimCustomPanning for the Confuse Ray bounce cue",
    });
    expect(result.components).toHaveLength(12);
    expect(result.components).toContain("task:SoundTask_AdjustPanningVar");
  });

  it("keeps Will-O-Wisp as a distinct non-promoted sibling audit", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/confuseRaySourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result.siblingAudit).toEqual({
      move: "MOVE_WILL_O_WISP",
      components: [
        "asset:ANIM_TAG_WISP_FIRE",
        "asset:ANIM_TAG_WISP_ORB",
        "sprite:gWillOWispFireSpriteTemplate",
        "sprite:gWillOWispOrbSpriteTemplate",
        "task:AnimTask_ShakeMon2",
        "task:SoundTask_AdjustPanningVar",
        "visualCommand:clearmonbg",
        "visualCommand:monbg",
        "visualCommand:splitbgprio_all",
        "visualCommand:splitbgprio_foes",
      ],
      shared: [
        "task:SoundTask_AdjustPanningVar",
        "visualCommand:clearmonbg",
        "visualCommand:monbg",
      ],
      independence: "Will-O-Wisp retains WISP_FIRE/WISP_ORB, its orb/fire callbacks, split-bg transitions, and ShakeMon2 body; it is not promoted.",
    });
  });
});
