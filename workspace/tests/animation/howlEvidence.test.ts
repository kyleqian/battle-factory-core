import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_HOWL complete dense evidence", () => {
  it("pins both legal challenge-0 Scene-ON orientation receipts", () => {
    const receipts = [
      {
        path: "tools/compare/fixtures/howl-player-loudred-opponent-onix.json",
        evidence: "919211a099b285671b4e2e2afd2ed3cda267b2dc1b1c17a6c1bfbd349863f97a",
        raw: "1f19b38ed924b20fb4648adc24dea85a2be05460092df83d0d7991fa7a87a269",
      },
      {
        path: "tools/compare/fixtures/howl-opponent-loudred-player-onix.json",
        evidence: "03aa671ccf17f3978744683b1a5f4066140129d4af6042d1fa05be64df827724",
        raw: "83ad92a022ee5484e24c8e78b49996c5692443bc76e7aef430b2ae15cedf0eac",
      },
    ] as const;
    for (const receipt of receipts) {
      const fixture = JSON.parse(readFileSync(receipt.path, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(fixture.schema).toBe("howl-portable-evidence/v1");
      expect(fixture.sourceWindow.frameCount).toBe(102);
      expect(fixture.evidenceSha256).toBe(receipt.evidence);
      expect(fixture.rawRgbSha256).toBe(receipt.raw);
      expect(fixture.battleState).toMatchObject({
        hp: 164,
        maxHp: 177,
        heldItem: 196,
        attackStage: 7,
      });
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
