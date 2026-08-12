import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };

const cases = [
  [
    "fury-swipes-player-aipom-opponent-onix.json",
    "player-to-opponent",
    83,
    130,
    "a54e4d2c6337f2d6add5fb0281e5fb6a5e9b4605e5d71dd57b6844c4766d0db6",
  ],
  [
    "fury-swipes-player-onix-opponent-aipom.json",
    "opponent-to-player",
    87,
    134,
    "c7bc934f8e509477b3938f0d32db1f612e93d351d209c1185524ca865552de1d",
  ],
] as const;

describe("MOVE_FURY_SWIPES bilateral dense evidence", () => {
  it.each(cases)("pins the complete source window and legal parties: %s",
    (name, orientation, startFrame, endFrame, evidenceSha256) => {
      const receipt = JSON.parse(
        readFileSync(`tools/compare/fixtures/${name}`, "utf8"),
      ) as {
        schema: string;
        oracleProfile: string;
        move: string;
        orientation: string;
        denseWindow: { startFrame: number; endFrame: number; frameCount: number };
        scenario: string;
        evidenceSha256: string;
        secondFreshEvidenceSha256: string;
        normalizedMapSha256: string;
      };
      const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8")) as {
        profile: string;
        level: number;
        overrides: { parties: { player: unknown[]; opponent: unknown[] } };
      };
      expect(receipt).toMatchObject({
        schema: "scene-on-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        move: "FURY_SWIPES",
        orientation,
        denseWindow: { startFrame, endFrame, frameCount: 48 },
        evidenceSha256,
        secondFreshEvidenceSha256: evidenceSha256,
      });
      expect(receipt.normalizedMapSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(coverage.entries.find((entry) => entry.move === "MOVE_FURY_SWIPES"))
        .toMatchObject({ status: "exact" });
    });
});
