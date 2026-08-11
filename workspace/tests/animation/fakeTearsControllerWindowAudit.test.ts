import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import player from "../../tools/compare/fixtures/fake-tears-player-delcatty-opponent-shuckle.json" with { type: "json" };
import opponent from "../../tools/compare/fixtures/fake-tears-opponent-delcatty-player-shuckle.json" with { type: "json" };

describe("MOVE_FAKE_TEARS corrected-species controller-window audit", () => {
  it("partitions every dense currentMove frame without promoting controller ownership", () => {
    for (const fixture of [player, opponent]) {
      expect(fixture.controllerWindow).toEqual({
        startFrame: 39,
        endFrame: 360,
        frameCount: 322,
      });
      const phases = Object.values(fixture.phaseWindows);
      expect(phases.reduce((sum, phase) => sum + phase.frameCount, 0)).toBe(322);
      expect(fixture.phaseWindows.sourceAnimation.frameCount).toBe(87);
      expect(
        phases
          .filter((phase) => phase !== fixture.phaseWindows.sourceAnimation)
          .reduce((sum, phase) => sum + phase.frameCount, 0),
      ).toBe(235);
      expect(fixture.sourceVisualWindow).toMatchObject({
        startFrame: fixture.phaseWindows.sourceAnimation.startFrame,
        endFrame: fixture.phaseWindows.sourceAnimation.endFrame,
      });
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(player.phaseWindows.preAnimation.frameCount).toBe(37);
    expect(opponent.phaseWindows.preAnimation.frameCount).toBe(41);
    expect(player.phaseWindows.messagePostAnimation.frameCount).toBe(108);
    expect(opponent.phaseWindows.messagePostAnimation.frameCount).toBe(104);
  });

  it("pins the ROM split between the move animation and main controller path", () => {
    const audit = execFileSync("node", [
      "--experimental-strip-types",
      resolve("tools/compare/fakeTearsControllerWindowSourceAudit.ts"),
    ], { encoding: "utf8" });
    expect(audit).toContain("animation-owned: Move_FAKE_TEARS source body only");
    expect(audit).toContain("ChangeStatBuffs outcome");
    expect(audit).toContain("235 frames per orientation");
  });
});
