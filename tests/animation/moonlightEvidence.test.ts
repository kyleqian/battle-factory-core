import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_MOONLIGHT complete dense evidence", () => {
  it("pins complete legal three-mon parties in both Scene-ON orientations", () => {
    for (const path of [
      "tools/compare/fixtures/moonlight-player-gloom-opponent-onix.json",
      "tools/compare/fixtures/moonlight-opponent-gloom-player-onix.json",
    ]) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(fixture.schema).toBe("moonlight-portable-evidence/v1");
      expect(fixture.denseWindow).toEqual({
        startFrame: 207, endFrame: 558, frameCount: 352,
      });
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.lifecycleCounts).toEqual({
        gMoonSpriteTemplate: 1,
        gMoonlightSparkleSpriteTemplate: 5,
        gHealingBlueStarSpriteTemplate: 4,
      });
      expect(fixture.attacker.species).toBe("GLOOM");
      expect(fixture.target.species).toBe("ONIX");
      expect(fixture.fieldProfile.pendingHeal).toEqual({
        battler: "attacker", fromHp: 143, toHp: 153,
        weather: "none", numerator: 1, denominator: 2,
      });
      expect(scenario).toMatchObject({
        profile: "battle-scene-on", level: 50, challengeNum: 0,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      for (const party of Object.values(scenario.overrides.parties) as any[][]) {
        expect(new Set(party.map((mon) => mon.item)).size).toBe(3);
        for (const mon of party) {
          expect(mon.moves).toHaveLength(4);
          expect(mon.ivs).toEqual({
            hp: 3, attack: 3, defense: 3,
            speed: 3, spAttack: 3, spDefense: 3,
          });
          expect(mon.friendship).toBe(0);
        }
      }
    }
  });
});
