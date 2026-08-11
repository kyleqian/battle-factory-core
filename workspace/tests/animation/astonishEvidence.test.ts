import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import player from "../../tools/compare/fixtures/astonish-player-loudred-opponent-onix.json" with { type: "json" };
import opponent from "../../tools/compare/fixtures/astonish-opponent-loudred-player-onix.json" with { type: "json" };

describe("task:AnimTask_StretchTargetUp Astonish evidence checkpoint", () => {
  it("pins complete Scene-ON source windows for legal set-144 LOUDRED", () => {
    expect(player).toMatchObject({
      oracleProfile: "battle-scene-on", attackerSide: "player",
      sourceWindow: { startFrame: 220, endFrame: 282, frameCount: 63 },
    });
    expect(opponent).toMatchObject({
      oracleProfile: "battle-scene-on", attackerSide: "opponent",
      sourceWindow: { startFrame: 219, endFrame: 281, frameCount: 63 },
    });
    for (const fixture of [player, opponent]) {
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("keeps the task scoped beneath Astonish's complete source body and distinct siblings", () => {
    const audit = execFileSync("node", ["--experimental-strip-types", "tools/compare/astonishSourceAudit.ts"], { encoding: "utf8" });
    expect(audit).toContain("two 10-frame affine legs");
    expect(audit).toContain("two SWEAT_BEAD droplet callbacks");
    expect(audit).toContain("MOVE_FAKE_OUT");
    expect(audit).toContain("MOVE_TRICK");
  });
});
