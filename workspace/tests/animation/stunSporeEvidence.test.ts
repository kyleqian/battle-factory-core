import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sha256 = (path: string): string =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

const fixtures = [
  {
    path: "tools/compare/fixtures/stun-spore-player-hoppip-opponent-onix.json",
    orientation: "player HOPPIP -> opponent ONIX",
    startFrame: 380,
    endFrame: 573,
    evidence: "e1842c7c7dc6ac3f37d0ccb97f53ec272e3f1f946d7bf8b0659520c5afa47e68",
    raw: "0adc53f2890301a822c5e7661ec325e851a9a3a3a571be30a805d84751b3e38f",
    changeMap: "b97cb47f20fe6033dffa130140419b098a2b3dc09f2a9f68327dc4addfba169c",
    attackerSide: "player",
    targetSide: "opponent",
  },
  {
    path: "tools/compare/fixtures/stun-spore-opponent-hoppip-player-onix.json",
    orientation: "opponent HOPPIP -> player ONIX",
    startFrame: 385,
    endFrame: 578,
    evidence: "3b7c9ad524337c496e5e2dccc4fc0385a2ad5640e48c4b22bacedef02d503205",
    raw: "b7dbe0847205266086d5e4ab6da26d50fb77260d92503b2e355c3b5ed5a6ef3b",
    changeMap: "e3ebc54f51986502fa81fa1ac54c26af7bd739fc7e2fc30b912540b89a685ba6",
    attackerSide: "opponent",
    targetSide: "player",
  },
] as const;

describe("MOVE_STUN_SPORE complete dense Scene-ON evidence", () => {
  it.each(fixtures)(
    "pins the bilateral %s receipt, raw RGB, and change map",
    (contract) => {
      const receipt = JSON.parse(readFileSync(contract.path, "utf8")) as any;
      const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8")) as any;
      expect(receipt).toMatchObject({
        schema: "stun-spore-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        orientation: contract.orientation,
        probe: "tools/compare/sporeProbe.py",
        appStage: { presentationAge: 0 },
        sourceWindow: {
          startFrame: contract.startFrame,
          endFrame: contract.endFrame,
          frameCount: 194,
        },
        evidenceSha256: contract.evidence,
        rawRgbSha256: contract.raw,
        changeMap: expect.stringContaining("stun-spore-changemap-"),
        changeMapSha256: contract.changeMap,
        acceptance: {
          status: "exact",
          componentMatching: 194,
          framebufferMatching: 194,
        },
        battleState: {
          attackerSide: contract.attackerSide,
          targetSide: contract.targetSide,
          attackerItem: 221,
          targetStatus1: 0,
        },
      });
      expect(receipt.sourceWindow.endFrame - receipt.sourceWindow.startFrame + 1).toBe(194);
      expect(sha256(receipt.changeMap)).toBe(contract.changeMap);
      expect(scenario).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 2,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const allMons = [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ];
      for (const mon of allMons) {
        expect(mon).toMatchObject({
          level: 50,
          nature: expect.any(Number),
          ivs: expect.objectContaining({
            hp: expect.any(Number), attack: expect.any(Number),
            defense: expect.any(Number), speed: expect.any(Number),
            spAttack: expect.any(Number), spDefense: expect.any(Number),
          }),
          evs: expect.objectContaining({
            hp: expect.any(Number), attack: expect.any(Number),
            defense: expect.any(Number), speed: expect.any(Number),
            spAttack: expect.any(Number), spDefense: expect.any(Number),
          }),
          moves: expect.any(Array),
          ppUps: [0, 0, 0, 0],
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          shiny: false,
        });
        expect(mon.moves).toHaveLength(4);
        expect(mon.gender === undefined || mon.gender === "male" || mon.gender === "female").toBe(true);
      }
      const attackerParty = scenario.overrides.parties[contract.attackerSide];
      const targetParty = scenario.overrides.parties[contract.targetSide];
      expect(attackerParty[0]).toMatchObject({ species: 187, moves: [78, 78, 78, 78], item: 221 });
      expect(targetParty[0]).toMatchObject({ species: 95 });
      expect(receipt.attacker).toMatchObject({ species: "HOPPIP", geometry: { side: contract.attackerSide } });
      expect(receipt.target).toMatchObject({ species: "ONIX", geometry: { side: contract.targetSide } });
    },
  );
});
