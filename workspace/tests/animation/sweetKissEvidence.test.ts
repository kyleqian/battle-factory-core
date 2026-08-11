import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_SWEET_KISS complete dense evidence", () => {
  it("pins both legal Level-50 Scene-ON receipts and complete parties", () => {
    const contracts = [
      {
        path: "tools/compare/fixtures/sweet-kiss-player-luvdisc-opponent-onix.json",
        orientation: "player-back",
        evidence: "5117db12992b65aadfc65a448ea2260dfd5848be19fc3d6e2df733d90604af21",
        raw: "61870ad0f56694de71f2d492c51fbe208216ef88b8550eca8a3a17fca8f73f11",
      },
      {
        path: "tools/compare/fixtures/sweet-kiss-opponent-luvdisc-player-onix.json",
        orientation: "opponent-front",
        evidence: "db45d09de25efa0d267f53c0337017c98094b0d174e8b99babfaa7dabf496821",
        raw: "76f32756df4d9bbdbfee5daf5d5ecf5b72bcdbacc3c4eab909c44cd7a8759876",
      },
    ] as const;

    for (const contract of contracts) {
      const fixture = JSON.parse(readFileSync(contract.path, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(fixture).toMatchObject({
        schema: "sweet-kiss-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        orientation: contract.orientation,
        sourceWindow: { frameCount: 159 },
        evidenceSha256: contract.evidence,
        rawRgbSha256: contract.raw,
        battleState: {
          attackerItem: 183,
          targetConfusionTurns: 0,
        },
      });
      expect(
        fixture.sourceWindow.endFrame - fixture.sourceWindow.startFrame + 1,
      ).toBe(159);
      expect(scenario).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      for (const party of Object.values(scenario.overrides.parties) as any[][]) {
        for (const mon of party) {
          expect(mon).toMatchObject({
            level: 50,
            nature: expect.any(Number),
            ivs: {
              hp: expect.any(Number), attack: expect.any(Number),
              defense: expect.any(Number), speed: expect.any(Number),
              spAttack: expect.any(Number), spDefense: expect.any(Number),
            },
            evs: {
              hp: expect.any(Number), attack: expect.any(Number),
              defense: expect.any(Number), speed: expect.any(Number),
              spAttack: expect.any(Number), spDefense: expect.any(Number),
            },
            moves: expect.any(Array),
            ppUps: [0, 0, 0, 0],
            item: expect.any(Number),
            abilitySlot: expect.any(Number),
            friendship: expect.any(Number),
            shiny: false,
          });
          expect(mon.moves).toHaveLength(4);
          expect(mon.gender === "male" || mon.gender === "female").toBe(true);
        }
      }
    }
  });
});
