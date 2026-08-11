import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_ATTRACT complete dense evidence", () => {
  it("pins complete legal opposite-gender parties and both receipts", () => {
    for (const [path, evidence, raw] of [
      [
        "tools/compare/fixtures/attract-player-eevee-opponent-onix.json",
        "a5008ce72fd22417d8ec1be80158fd3a5f93b715165700b875601c476c5717c8",
        "e627d99e69936a320250ab89b946221a179d2ea3a2ed076068a2ff82e9edd9a9",
      ],
      [
        "tools/compare/fixtures/attract-opponent-eevee-player-onix.json",
        "234dd9d0da4f02be12a404f3ef36eaa1071bd66d2886eaa75fe3aa25ae48422e",
        "daa9c2ed067fcfa6d56a98d364c5d3e31e0ca7af30bd15ca72c2c93ddb2ef329",
      ],
    ] as const) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(fixture).toMatchObject({
        schema: "attract-portable-evidence/v1",
        sourceWindow: { frameCount: 435 },
        evidenceSha256: evidence,
        rawRgbSha256: raw,
        battleState: { attackerItem: 170 },
      });
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect([
        scenario.overrides.parties.player[0].gender,
        scenario.overrides.parties.opponent[0].gender,
      ].sort()).toEqual(["female", "male"]);
    }
  });
});
