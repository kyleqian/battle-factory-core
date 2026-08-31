import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_METAL_SOUND source checkpoint", () => {
  it("pins the exclusive interval, full graph, legal carrier, and exact control", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/metalSoundSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result).toEqual({
      move: "MOVE_METAL_SOUND",
      sourceBounds: {
        start: "0x082d59b7",
        endExclusive: "0x082d5a07",
        bytes: "0x50",
      },
      carrier: "set 122 FRONTIER_MON_ARON / SPECIES_ARON / MOVE_METAL_SOUND",
      components: [
        "asset:ANIM_TAG_METAL_SOUND_WAVES",
        "sprite:gMetalSoundSpriteTemplate",
        "subroutine:MetalSoundRings",
        "task:AnimTask_ShakeMon2",
        "visualCommand:clearmonbg",
        "visualCommand:monbg",
        "visualCommand:panse",
        "visualCommand:splitbgprio_foes",
      ],
      control: {
        move: "MOVE_SUPERSONIC",
        status: "exact",
        sharedComponents: [
          "task:AnimTask_ShakeMon2",
          "visualCommand:clearmonbg",
          "visualCommand:monbg",
          "visualCommand:splitbgprio_foes",
        ],
        independence: "Metal Sound is independently exact; its 32x64 metal-wave/panse/def-partner body is not inherited from Supersonic.",
      },
    });
  });

  it("keeps Metal Sound exact while the Level-50 exact count reaches 196", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(215);
    expect(coverage.entries.find(
      (entry: { move: string }) => entry.move === "MOVE_METAL_SOUND",
    )).toMatchObject({ status: "exact" });
    expect(coverage.entries.find(
      (entry: { move: string }) => entry.move === "MOVE_SUPERSONIC",
    )).toMatchObject({ status: "exact" });
  });
});
