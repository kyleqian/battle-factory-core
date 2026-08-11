import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_PRESENT source/controller checkpoint", () => {
  it("pins the legal carrier and both source animation bodies", () => {
    const result = spawnSync("node", ["--experimental-strip-types", "tools/compare/presentSourceAudit.ts"], { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("set 118 DELIBIRD is the sole/lowest");
    expect(result.stdout).toContain("RNG roll >= 204");
    expect(result.stdout).toContain("tutor-legal Onix Double-Edge with Sturdy");
  });

  it("pins four complete source-evidence fixtures without promoting a renderer", () => {
    const fixtures = [
      "present-player-damage.json", "present-player-heal.json",
      "present-opponent-damage.json", "present-opponent-heal.json",
    ].map((name) => JSON.parse(readFileSync(`tools/compare/fixtures/${name}`, "utf8")) as {
      orientation: string; branch: string; denseWindow: { frameCount: number }; lifecycleCounts: Record<string, number>; evidenceSha256: string; rawRgbSha256: string;
    });
    expect(new Set(fixtures.map((fixture) => `${fixture.orientation}/${fixture.branch}`)).size).toBe(4);
    for (const fixture of fixtures) {
      expect(fixture.denseWindow.frameCount).toBeGreaterThan(200);
      expect(fixture.lifecycleCounts.gPresentSpriteTemplate).toBe(1);
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
      if (fixture.branch === "damage") expect(fixture.lifecycleCounts.gExplosionSpriteTemplate).toBe(5);
      else expect(fixture.lifecycleCounts.gPresentHealParticleSpriteTemplate).toBe(9);
    }
  });
});
