import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };

const cases = [
  [
    "meteor-mash-player-metang-opponent-onix.json",
    "player-to-opponent",
    298,
    511,
    214,
    "ed028a168afdd4554a015978bd081655a64d5fc8cfa5df7685d165b5bb2747e5",
  ],
  [
    "meteor-mash-opponent-metang-player-onix.json",
    "opponent-to-player",
    231,
    445,
    215,
    "367dda5391d7b509718504afd34085a426db14b49daa4ca9d69d4b21937d99a6",
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
      const parties = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
      expect(parties.some((mon: { species: number }) => mon.species === 399)).toBe(true);
      expect(parties.some((mon: { species: number }) => mon.species === 375)).toBe(false);
      // Production framebuffer equality is still open; never promote from
      // source/component receipts alone.
      expect(coverage.entries.find((entry) => entry.move === "MOVE_METEOR_MASH"))
        .toBeUndefined();
      expect(JSON.stringify(coverage)).toContain("MOVE_METEOR_MASH remains unsupported");
    });
});
