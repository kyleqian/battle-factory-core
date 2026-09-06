import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_SPORE complete dense evidence", () => {
  it("pins both legal Level-50 Scene-ON receipts and complete parties", () => {
    const contracts = [
      {
        path: "tools/compare/fixtures/spore-player-parasect-opponent-onix.json",
        orientation: "player-back",
        evidence: "5b275a53b8339e818fa56c158a04df729d1316fee0005ab11cc1ad1b9c446d40",
        raw: "9730e4ea34ffdaab25796ea069be7270eb36eb9ea05d13cb32c834cb8ea9d0a7",
      },
      {
        path: "tools/compare/fixtures/spore-opponent-parasect-player-onix.json",
        orientation: "opponent-front",
        evidence: "7d723ded7813648cb6a29b9a5aaa651b1d677d9698f35f0aff9005f0410e687b",
        raw: "59a82fde62ce4c89b2a73f0053186df940bd51b39340339ef8fff92282f64e51",
      },
    ] as const;

    for (const contract of contracts) {
      const fixture = JSON.parse(readFileSync(contract.path, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(fixture).toMatchObject({
        schema: "spore-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        orientation: contract.orientation,
        sourceWindow: { frameCount: 207 },
        evidenceSha256: contract.evidence,
        rawRgbSha256: contract.raw,
        battleState: {
          attackerItem: 200,
          targetStatus1: 0,
        },
      });
      expect(
        fixture.sourceWindow.endFrame - fixture.sourceWindow.startFrame + 1,
      ).toBe(207);
      expect(scenario).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 2,
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

  it("fulfills only the independently receipted spore-particles track", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SPORE"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_COTTON_SPORE"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) => track.id === "spore-particles"))
      .toEqual({
        id: "spore-particles",
        components: [
          "asset:ANIM_TAG_SPORE",
          "subroutine:CreateSpore",
          "subroutine:CreateCottonSpores",
          "task:AnimTask_SporeDoubleBattle",
          "visualCommand:create_spore_particle_sprite",
          "visualCommand:setalpha",
          "visualCommand:blendoff",
          "visualCommand:splitbgprio",
        ],
        representatives: ["MOVE_SPORE", "MOVE_COTTON_SPORE"],
        fulfilled: true,
        goal: "FULFILLED: This exact 8-component boundary is fulfilled only because MOVE_SPORE and MOVE_COTTON_SPORE independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual receipts. Spore independently owns 207/207 player-back and opponent-front blended 12:8-alpha/blendoff/SporeDoubleBattle bodies; Cotton Spore independently owns 204/204 player-back and opponent-front splitbgprio/opaque/no-alpha/no-blendoff/no-SporeDoubleBattle bodies. Their shared AnimSporeParticle source component remains proven only through those two independent move bodies. No sibling, component, or latch transfer is granted, including neither the distinct Powder AnimMovePowderParticle_Step latch nor acceptance for Sleep Powder, Stun Spore, Poison Powder, or any other sibling.",
      });
  });
});
