import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("ANIM_TAG_FINGER source checkpoint", () => {
  it("pins the lowest suitable Level-50 set and distinguishes Follow Me", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/metronomeSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain(
      "set 227/FRONTIER_MON_CHANSEY_1 -> SPECIES_CHANSEY 113/move 118",
    );
    expect(output).toContain(
      "Follow Me sibling has gFollowMeFingerSpriteTemplate/AnimFollowMeFinger",
    );
  });
});
