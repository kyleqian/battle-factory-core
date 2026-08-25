import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_INGRAIN authoritative source graph", () => {
  it("pins the exclusive body, lowest legal carrier, four-component graph, and controls", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/ingrainSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result).toEqual({
      move: "MOVE_INGRAIN",
      sourceBounds: {
        start: "0x082d40e0",
        endExclusive: "0x082d4191",
        bytes: "0xb1",
      },
      sourceBody: {
        executableLines: 28,
        sha256: "da8b20518a08d8473576c030359f26340ba646ade90c72c697ae29970d4ae56e",
      },
      carrier: "set 140 FRONTIER_MON_LILEEP / SPECIES_LILEEP / MOVE_INGRAIN",
      components: [
        "asset:ANIM_TAG_ORBS",
        "asset:ANIM_TAG_ROOTS",
        "visualCommand:create_ingrain_orb_sprite",
        "visualCommand:create_ingrain_root_sprite",
      ],
      controls: {
        moves: ["MOVE_ABSORB", "MOVE_MEGA_DRAIN", "MOVE_DREAM_EATER", "MOVE_GIGA_DRAIN"],
        statuses: ["exact", "exact", "exact", "exact"],
        independence: "Shared ORBS controls are independently exact; Ingrain remains unsupported and receives no shared-component credit.",
      },
    });
  });
});
