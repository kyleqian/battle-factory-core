import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import player from "../../tools/compare/fixtures/fake-tears-blend-particle-player-delcatty-opponent-shuckle.json" with { type: "json" };
import opponent from "../../tools/compare/fixtures/fake-tears-blend-particle-opponent-delcatty-player-shuckle.json" with { type: "json" };
import asset from "../../src/animation/assets/blend-particle-small-bubbles.json" with { type: "json" };

describe("task:AnimTask_BlendParticle Fake Tears evidence checkpoint", () => {
  it("extracts only the palette selected by the representative task", () => {
    expect(asset.source.carrier).toContain("FRONTIER_MON_DELCATTY_2 set 267");
    expect(asset.source.excluded).toContain("creates no sprite");
    expect(asset.palette).toHaveLength(16);
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-blend-particle-assets-"));
    const output = join(scratch, "blend-particle-small-bubbles.json");
    execFileSync("node", ["--experimental-strip-types", resolve("tools/compare/extractBlendParticleAssets.ts"), "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync(resolve("src/animation/assets/blend-particle-small-bubbles.json")));
  });

  it("bounds the zero-delay task to creation and first inactive latches", () => {
    for (const fixture of [player, opponent]) {
      expect(fixture).toMatchObject({
        oracleProfile: "battle-scene-on", move: "FAKE_TEARS", reproductions: 2,
        captureWindow: { startFrame: 39, endFrame: 359, frameCount: 321 },
        blendParticleActiveWindow: { frameCount: 1 },
        sourceOwnedComponentWindow: { frameCount: 2 },
      });
      expect(fixture.sourceOwnedComponentWindow.startFrame).toBe(fixture.blendParticleActiveWindow.startFrame);
      expect(fixture.sourceOwnedComponentWindow.endFrame).toBe(fixture.blendParticleActiveWindow.endFrame + 1);
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.receipt).toContain("not accepted here");
    }
    expect(player.orientation).not.toEqual(opponent.orientation);
  });

  it("keeps Heat Wave and Luster Purge as distinct unsupported siblings", () => {
    const audit = execFileSync("node", ["--experimental-strip-types", resolve("tools/compare/fakeTearsBlendParticleSourceAudit.ts")], { encoding: "utf8" });
    expect(audit).toContain("FLYING_DIRT");
    expect(audit).toContain("psychic/white background pipeline");
    expect(audit).toContain("0-delay");
  });
});
