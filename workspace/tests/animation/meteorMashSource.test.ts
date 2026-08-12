import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_METEOR_MASH source contract", () => {
  it("pins the exclusive script, graph, callbacks, and lowest carrier", () => {
    const output = execFileSync(
      "node",
      ["--experimental-strip-types", "tools/compare/meteorMashSourceAudit.ts"],
      { encoding: "utf8" },
    );
    expect(output).toContain("0x082d56aa..0x082d5731 (0x87 bytes)");
    expect(output).toContain("complete 11-component GOLD_STARS/MeteorStar/SpinningHand/IMPACT/ShakeMon2/BG_COSMIC graph");
    expect(output).toContain("lowest legal Level-50 carrier set 311 FRONTIER_MON_METANG_2");
  });
});
