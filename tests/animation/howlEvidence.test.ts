import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_HOWL complete dense evidence", () => {
  it("pins both legal challenge-0 Scene-ON orientation receipts", () => {
    for (const path of [
      "tools/compare/fixtures/howl-player-loudred-opponent-onix.json",
      "tools/compare/fixtures/howl-opponent-loudred-player-onix.json",
    ]) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(fixture.schema).toBe("howl-portable-evidence/v1");
      expect(fixture.sourceWindow.frameCount).toBe(102);
      expect(fixture.battleState).toMatchObject({
        hp: 164,
        maxHp: 177,
        heldItem: 196,
        attackStage: 7,
      });
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(scenario).toMatchObject({
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
        playerSetIds: expect.any(Array),
        opponentSetIds: expect.any(Array),
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
