import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_SAFEGUARD authoritative source graph", () => {
  it("pins its full interval, generated component graph, carrier, and controls", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/safeguardSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result).toEqual({
      move: "MOVE_SAFEGUARD",
      sourceBounds: { start: "0x082cb6f7", endExclusive: "0x082cb739", bytes: "0x42" },
      carrier: "set 180 FRONTIER_MON_BAYLEEF_1 / SPECIES_BAYLEEF / MOVE_SAFEGUARD",
      components: [
        "asset:ANIM_TAG_GUARD_RING",
        "sprite:gGuardRingSpriteTemplate",
        "visualCommand:blend_color_cycle",
        "visualCommand:blendoff",
        "visualCommand:clearmonbg",
        "visualCommand:monbg",
        "visualCommand:setalpha",
      ],
      controls: {
        moves: ["MOVE_SWEET_SCENT", "MOVE_BARRIER", "MOVE_LIGHT_SCREEN"],
        statuses: ["exact", "exact", "exact"],
        independence: "Safeguard alone may receive future credit; named controls remain independently exact.",
      },
    });
  });
});
