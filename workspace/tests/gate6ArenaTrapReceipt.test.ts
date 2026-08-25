import { describe, expect, it } from "vitest";
import trapped from "../tools/battle-lab/gate6-arena-trap-trapped-off.json" with { type: "json" };
import control from "../tools/battle-lab/gate6-arena-trap-control-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/gate6-arena-trap-off.json" with { type: "json" };
import {
  createFactoryFullTurnBattleState,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const TRI_ATTACK = 161;
const LIGHT_SCREEN = 113;
const SLUDGE_BOMB = 188;
const RAIN_DANCE = 240;
const SPECIES_DUGTRIO = 51;
const SPECIES_MARILL = 183;
const SPECIES_WEEZING = 110;
const SPECIES_WOOPER = 194;
const ABILITY_LEVITATE = 26;
const ABILITY_THICK_FAT = 47;
const ABILITY_ARENA_TRAP = 71;
const PARTY_ACTION_CHOOSE_MON = 0;
const PARTY_ACTION_ABILITY_PREVENTS = 4;

/**
 * The ROM parties, projected onto the full-turn reducer's staged config so
 * `legalCommandDecisions` (`factoryBattleScriptFullTurnDecision.ts:2122-2153`,
 * via its private `isVoluntarySwitchTrapped` mirror of `battle_main.c:4239-4256`)
 * answers the same question the party menu answered in the receipt. Stats are
 * only load-bearing for turn order, which the receipt already pins.
 */
function config(
  lead: Readonly<{ species: number; ability: number; types: readonly [string, string]; moveId: number }>,
): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 1,
    player: {
      species: lead.species,
      moveId: lead.moveId,
      moves: [lead.moveId, lead.moveId, lead.moveId, lead.moveId],
      pp: [30, 30, 30, 30],
      ability: lead.ability,
      attack: 50, defense: 63, spAttack: 50, spDefense: 77, speed: 45,
      hp: 160, maxHp: 160,
      types: lead.types,
    },
    trainer: {
      species: SPECIES_DUGTRIO,
      moveId: TRI_ATTACK,
      moves: [TRI_ATTACK, TRI_ATTACK, TRI_ATTACK, TRI_ATTACK],
      pp: [10, 10, 10, 10],
      ability: ABILITY_ARENA_TRAP,
      abilityNum: 1,
      attack: 123, defense: 70, spAttack: 63, spDefense: 90, speed: 130,
      hp: 110, maxHp: 110,
      types: ["TYPE_GROUND", "TYPE_GROUND"],
    },
    // The receipt's bench: WOOPER at party slot 1, SANDSHREW at slot 2.
    playerBenchHp: [130, 125],
    playerBenchOverride: [
      { species: SPECIES_WOOPER, moves: [RAIN_DANCE, RAIN_DANCE, RAIN_DANCE, RAIN_DANCE] },
      { species: 27, moves: [28, 28, 28, 28] },
    ],
  };
}

function switchDecisions(lead: Parameters<typeof config>[0]) {
  const state = createFactoryFullTurnBattleState(config(lead));
  const boundary = state.boundary;
  if (boundary.kind !== "decision-required" || boundary.request.kind !== "command") {
    throw new Error("expected an initial player command request");
  }
  return boundary.request.legalDecisions.filter((decision) => decision.kind === "switch");
}

describe("Gate-6 ARENA TRAP player-switch Battle Scene OFF receipt", () => {
  it("keeps both complete legal three-mon fixtures varying only the player lead", () => {
    for (const fixture of [trapped, control]) {
      expect(fixture).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-off",
        level: 50,
        seed: 305419897,
      });
      expect(Object.keys(fixture.overrides)).toEqual(["parties"]);
      expect(fixture.overrides.parties.player).toHaveLength(3);
      expect(fixture.overrides.parties.opponent).toHaveLength(3);
      // All four DUGTRIO slots are TRI ATTACK (its own set-372 move, not
      // SAND TOMB, which would trap by itself), so the Factory AI has one
      // legal choice; speed IV 31 vs the player lead's 0 keeps the order strict.
      expect(fixture.overrides.parties.opponent[0]).toMatchObject({
        species: SPECIES_DUGTRIO,
        abilitySlot: 1,
        moves: [TRI_ATTACK, TRI_ATTACK, TRI_ATTACK, TRI_ATTACK],
        ivs: expect.objectContaining({ speed: 31 }),
      });
      expect(fixture.overrides.parties.player[0]!.ivs.speed).toBe(0);
      // Identical bench in both arms, so bench slot 1 is the same WOOPER.
      expect(fixture.overrides.parties.player[1]).toMatchObject({ species: SPECIES_WOOPER });
      // Both traces replay the identical button script.
      expect(fixture.trace).toEqual(trapped.trace);
    }
    expect(trapped.overrides.parties.player[0]).toMatchObject({
      species: SPECIES_MARILL,
      abilitySlot: 0,
      moves: [LIGHT_SCREEN, LIGHT_SCREEN, LIGHT_SCREEN, LIGHT_SCREEN],
    });
    expect(control.overrides.parties.player[0]).toMatchObject({
      species: SPECIES_WEEZING,
      abilitySlot: 0,
      moves: [SLUDGE_BOMB, SLUDGE_BOMB, SLUDGE_BOMB, SLUDGE_BOMB],
    });
    expect(receipt.arms.trapped.parties.playerLead.ability).toBe(ABILITY_THICK_FAT);
    expect(receipt.arms.control.parties.playerLead.ability).toBe(ABILITY_LEVITATE);
    expect(receipt.arms.trapped.parties.trapperDugtrio.ability).toBe(ABILITY_ARENA_TRAP);
    expect(receipt.arms.control.parties.trapperDugtrio.ability).toBe(ABILITY_ARENA_TRAP);
  });

  it("pins two byte-identical fresh mGBA probe runs per arm", () => {
    expect(receipt).toMatchObject({
      schema: "gate6-arena-trap-off-semantic-receipt/v1",
      oracleProfile: "battle-scene-off",
      probe: "tools/probe/probe-gate6-arena-trap-off.py",
      freshRunCountPerArm: 2,
      byteIdenticalAcrossFreshRuns: true,
    });
    expect(receipt.probeOutputSha256).toEqual({
      trapped: expect.stringMatching(/^[0-9a-f]{64}$/),
      control: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(receipt.arms.trapped.fixture).toBe("tools/battle-lab/gate6-arena-trap-trapped-off.json");
    expect(receipt.arms.control.fixture).toBe("tools/battle-lab/gate6-arena-trap-control-off.json");
  });

  it("records the stock ROM refusing the switch in the party menu, drawing no Random() for it", () => {
    const arm = receipt.arms.trapped;
    // gPartyMenu.action = PARTY_ACTION_ABILITY_PREVENTS for the whole menu.
    expect(arm.partyMenuEvents).toEqual([
      { frame: 64, action: PARTY_ACTION_ABILITY_PREVENTS, slotId: 0 },
      { frame: 161, action: PARTY_ACTION_ABILITY_PREVENTS, slotId: 1 },
      { frame: 603, action: PARTY_ACTION_ABILITY_PREVENTS, slotId: 7 },
    ]);
    expect(arm.menuMessageEvents[2]).toEqual({
      frame: 241,
      text: "Foe DUGTRIO’s ARENA TRAP\nprevents switching!\n",
      lastUsedAbility: ABILITY_ARENA_TRAP,
    });
    // The active never leaves: gBattlerPartyIndexes[0] stays 0.
    expect(arm.partyIndexEvents).toEqual([]);
    expect(arm.playerPartyIndexBefore).toBe(0);
    expect(arm.playerPartyIndexAfter).toBe(0);
    // No battle script runs for the refusal: the first battle-string change is
    // the post-refusal healthbox refresh, long after the message at frame 241.
    expect(arm.battleMessageEvents[0]!.frame).toBeGreaterThan(241);
    expect(
      arm.menuMessageEvents.concat(arm.battleMessageEvents as never[])
        .every((event) => !event.text.includes("prevents\nescape")),
    ).toBe(true);
    // The refusal itself draws ZERO Random(): sRandCount first moves when the
    // player's forced FIGHT resolves.
    expect(arm.firstRandomFrame).toBe(814);
    expect(arm.randomCallsBeforeFirstRandomFrame).toBe(0);
  });

  it("records the LEVITATE control taking the exemption and switching for free", () => {
    const arm = receipt.arms.control;
    expect(arm.partyMenuEvents).toEqual([
      { frame: 161, action: PARTY_ACTION_CHOOSE_MON, slotId: 1 },
    ]);
    expect(arm.menuMessageEvents.map((event) => event.text)).toEqual([
      "Choose a POK<1B>MON.",
      "Do what with this <53><54>?",
    ]);
    expect(arm.partyIndexEvents).toEqual([
      { frame: 399, from: 0, to: 1, randomCallsSoFar: 0 },
    ]);
    expect(arm.playerPartyIndexAfter).toBe(1);
    expect(arm.battleMessageEvents.slice(2, 4).map((event) => event.text)).toEqual([
      "WEEZING, that’s enough!\nCome back!",
      "Go! WOOPER!",
    ]);
    expect(arm.firstRandomFrame).toBe(521);
  });

  it("publishes no switch command for the trapped arm and both bench switches for the LEVITATE arm", () => {
    expect(switchDecisions({
      species: SPECIES_MARILL,
      ability: ABILITY_THICK_FAT,
      types: ["TYPE_WATER", "TYPE_WATER"],
      moveId: LIGHT_SCREEN,
    })).toEqual([]);
    expect(switchDecisions({
      species: SPECIES_WEEZING,
      ability: ABILITY_LEVITATE,
      types: ["TYPE_POISON", "TYPE_POISON"],
      moveId: SLUDGE_BOMB,
    })).toEqual([
      { kind: "switch", partyIndex: 1 },
      { kind: "switch", partyIndex: 2 },
    ]);
  });

  it("keeps the Flying-type half of battle_main.c:4253's exemption on record too", () => {
    // Same grounded-vs-exempt contrast, taken through the type test rather
    // than the ability test; the ROM arms only cover the LEVITATE half.
    expect(switchDecisions({
      species: SPECIES_MARILL,
      ability: ABILITY_THICK_FAT,
      types: ["TYPE_WATER", "TYPE_FLYING"],
      moveId: LIGHT_SCREEN,
    })).toEqual([
      { kind: "switch", partyIndex: 1 },
      { kind: "switch", partyIndex: 2 },
    ]);
  });
});
