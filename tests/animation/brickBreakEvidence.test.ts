import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("ANIM_TAG_TORN_METAL Brick Break evidence checkpoint", () => {
  it("pins the 46-to-11 prioritization, lowest Lombre carrier, both bodies, and partial boundary", () => {
    expect(execFileSync("npx", ["tsx", "tools/compare/brickBreakSourceAudit.ts"], { encoding: "utf8" })).toContain("set 131/FRONTIER_MON_LOMBRE");
  });
  it("stages three complete legal parties in both orientations and pins both dense receipts", () => {
    for (const [scenario, fixture, start] of [["tools/battle-lab/mechanic-brick-break-player-lombre-opponent-onix.json", "tools/compare/fixtures/brick-break-player-lombre-opponent-onix.json", 288], ["tools/battle-lab/mechanic-brick-break-opponent-lombre-player-onix.json", "tools/compare/fixtures/brick-break-opponent-lombre-player-onix.json", 289]]) {
      const stage = JSON.parse(readFileSync(scenario, "utf8")); const receipt = JSON.parse(readFileSync(fixture, "utf8"));
      expect(stage.profile).toBe("battle-scene-on"); expect(stage.overrides.parties.player).toHaveLength(3); expect(stage.overrides.parties.opponent).toHaveLength(3);
      expect(receipt.sourceWindow).toMatchObject({ startFrame: start, frameCount: 192 }); expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/); expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
