import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_SCREECH authoritative source graph", () => {
  it("pins the complete interval, generated graph, lowest legal carrier, and controls", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/screechSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result).toEqual({
      move: "MOVE_SCREECH",
      sourceBounds: {
        start: "0x082c9a19",
        endExclusive: "0x082c9a66",
        bytes: "0x4d",
      },
      carrier: "set 115 FRONTIER_MON_VOLTORB / SPECIES_VOLTORB / MOVE_SCREECH",
      components: [
        "asset:ANIM_TAG_PURPLE_RING",
        "sprite:gScreechRingSpriteTemplate",
        "subroutine:ScreechRing",
        "task:AnimTask_ShakeMon2",
        "task:AnimTask_SwayMon",
      ],
      newComponents: [
        "asset:ANIM_TAG_PURPLE_RING",
        "sprite:gScreechRingSpriteTemplate",
        "subroutine:ScreechRing",
      ],
      controls: {
        moves: ["MOVE_SUPERSONIC", "MOVE_METAL_SOUND"],
        statuses: ["exact", "exact"],
        independence: "Screech alone is exact; Supersonic and Metal Sound retain independent control credit only.",
      },
    });
  });
});
