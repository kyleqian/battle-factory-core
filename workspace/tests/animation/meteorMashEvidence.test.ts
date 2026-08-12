import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };

const cases = [
  [
    "meteor-mash-player-metang-opponent-onix.json",
    "player-to-opponent",
    217,
    430,
    214,
    "1e73a00f8d1d77f6c7f5b60bfba6068ab56acdf2a5c3a4393b2ff60b05250bba",
  ],
  [
    "meteor-mash-opponent-metang-player-onix.json",
    "opponent-to-player",
    233,
    447,
    215,
    "c46d8308b1f118fb2d0bd44d15850fb2b6557ce676f23ca228c9ca2a3e08fb63",
  ],
] as const;

describe("MOVE_METEOR_MASH bilateral dense evidence checkpoint", () => {
  it.each(cases)("pins the complete portable source window: %s",
    (name, orientation, startFrame, endFrame, frameCount, evidenceSha256) => {
      const fixture = JSON.parse(readFileSync(`tools/compare/fixtures/${name}`, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(fixture).toMatchObject({
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "METEOR_MASH",
        orientation,
        denseWindow: { startFrame, endFrame, frameCount },
        evidenceSha256,
        secondFreshEvidenceSha256: evidenceSha256,
      });
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.normalizedMapSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      // Production framebuffer equality is still open; never promote from
      // source/component receipts alone.
      expect(coverage.entries.find((entry) => entry.move === "MOVE_METEOR_MASH"))
        .toBeUndefined();
      expect(JSON.stringify(coverage)).toContain("MOVE_METEOR_MASH remains unsupported");
    });
});
