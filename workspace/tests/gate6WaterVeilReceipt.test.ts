import { describe, expect, it } from "vitest";
import prevents from "../tools/battle-lab/gate6-water-veil-prevents-off.json" with { type: "json" };
import control from "../tools/battle-lab/gate6-water-veil-control-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/gate6-water-veil-off.json" with { type: "json" };
import { gate6Context, runGate6ScriptToTerminal } from "./gate6StatusInteractionHelpers.ts";

const WILL_O_WISP = 261;
const STATUS1_BURN = 1 << 4;
const ABILITY_FLASH_FIRE = 18;
const ABILITY_OBLIVIOUS = 12;
const ABILITY_WATER_VEIL = 41;
const SPECIES_NINETALES = 38;
const SPECIES_WAILORD = 314;
// The ROM's gRngValue immediately before WILL-O-WISP's accuracycheck in the
// Oblivious control arm (receipt arms.control.rngLedger[0].rngBefore).
const CONTROL_ACCURACY_RNG = 2797792354;

function wispContext(targetAbility: number) {
  return gate6Context(
    1,
    {
      species: SPECIES_NINETALES,
      ability: ABILITY_FLASH_FIRE,
      hp: 148,
      maxHP: 148,
      level: 50,
      types: ["TYPE_FIRE", "TYPE_FIRE"],
      moves: [WILL_O_WISP, WILL_O_WISP, WILL_O_WISP, WILL_O_WISP],
      pp: [15, 15, 15, 15],
    },
    {
      species: SPECIES_WAILORD,
      ability: targetAbility,
      hp: 245,
      maxHP: 245,
      level: 50,
      types: ["TYPE_WATER", "TYPE_WATER"],
      status1: 0,
    },
    { currentMove: WILL_O_WISP },
  );
}

describe("Gate-6 WATER VEIL x WILL-O-WISP Battle Scene OFF receipt", () => {
  it("keeps both complete legal three-mon fixtures varying only the Wailord ability slot", () => {
    for (const fixture of [prevents, control]) {
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
      // Ninetales (set 430) has one ability, so the attacker never varies.
      expect(fixture.overrides.parties.player[0]).toMatchObject({
        species: SPECIES_NINETALES,
        abilitySlot: 0,
        moves: [WILL_O_WISP, WILL_O_WISP, WILL_O_WISP, WILL_O_WISP],
      });
      // All four opponent slots are SURF (set 429), so the Factory AI has one
      // legal choice, and Wailord's speed IV 0 keeps the order strict.
      expect(fixture.overrides.parties.opponent[0]).toMatchObject({
        species: SPECIES_WAILORD,
        moves: [57, 57, 57, 57],
        ivs: expect.objectContaining({ speed: 0 }),
      });
    }
    expect(prevents.overrides.parties.opponent[0]!.abilitySlot).toBe(0);
    expect(control.overrides.parties.opponent[0]!.abilitySlot).toBe(1);
    expect(receipt.arms.prevents.parties.targetWailord).toEqual({
      species: SPECIES_WAILORD, item: 0, abilitySlot: 0, ability: ABILITY_WATER_VEIL, moves: [57, 57, 57, 57],
    });
    expect(receipt.arms.control.parties.targetWailord).toEqual({
      species: SPECIES_WAILORD, item: 0, abilitySlot: 1, ability: ABILITY_OBLIVIOUS, moves: [57, 57, 57, 57],
    });
  });

  it("pins two byte-identical fresh mGBA probe runs per arm", () => {
    expect(receipt).toMatchObject({
      schema: "gate6-water-veil-off-semantic-receipt/v1",
      oracleProfile: "battle-scene-off",
      probe: "tools/probe/probe-gate6-water-veil-off.py",
      freshRunCountPerArm: 2,
      byteIdenticalAcrossFreshRuns: true,
    });
    expect(receipt.probeOutputSha256).toEqual({
      prevents: expect.stringMatching(/^[0-9a-f]{64}$/),
      control: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(receipt.arms.prevents.fixture).toBe("tools/battle-lab/gate6-water-veil-prevents-off.json");
    expect(receipt.arms.control.fixture).toBe("tools/battle-lab/gate6-water-veil-control-off.json");
  });

  it("records the stock ROM refusing the burn and drawing no Random() for it", () => {
    const arm = receipt.arms.prevents;
    expect(arm.targetStatus1After).toBe(0);
    expect(arm.targetHpAfter).toBe(245);
    expect(arm.targetMaxHp).toBe(245);
    expect(arm.attackerPpAfter).toEqual([14, 15, 15, 15]);
    expect(arm.checkpoints.willOWispSpent).toEqual({ frame: 69, targetStatus1: 0 });
    expect(arm.checkpoints).not.toHaveProperty("burnApplied");
    expect(arm.scriptsVisited).toEqual([
      { frame: 73, symbol: "BattleScript_WaterVeilPrevents" },
      { frame: 76, symbol: "BattleScript_BRNPrevention" },
    ]);
    expect(arm.messageEvents.map((event) => event.text)).toEqual([
      "WILL-O-WISP",
      "TYPE/<FC><06><01>FIRE",
      "NINETALES used\nWILL-O-WISP!",
      "Foe WAILORD’s WATER VEIL\nprevents burns!",
      "Foe WAILORD used\nSURF!",
      "It’s super effective!",
      "What will\nNINETALES do?",
    ]);
    // The refusal precedes accuracycheck, so the battle's first Random() call
    // belongs to the opponent's SURF, not to WILL-O-WISP.
    expect(arm.rngLedger[0]).toMatchObject({ frame: 227, currentMove: 57 });
    expect(arm.rngLedger.every((entry) => entry.currentMove !== WILL_O_WISP)).toBe(true);
  });

  it("records the Oblivious control burning normally after one accuracy Random()", () => {
    const arm = receipt.arms.control;
    expect(arm.targetStatus1After).toBe(STATUS1_BURN);
    expect(arm.attackerPpAfter).toEqual([14, 15, 15, 15]);
    expect(arm.checkpoints.willOWispSpent).toEqual({ frame: 69, targetStatus1: 0 });
    expect(arm.checkpoints.burnApplied).toEqual({ frame: 113, targetStatus1: STATUS1_BURN });
    expect(arm.scriptsVisited).toEqual([]);
    expect(arm.messageEvents.map((event) => event.text)).toEqual([
      "WILL-O-WISP",
      "TYPE/<FC><06><01>FIRE",
      "NINETALES used\nWILL-O-WISP!",
      "Foe WAILORD was burned!",
      "Foe WAILORD used\nSURF!",
      "It’s super effective!",
      "Foe WAILORD is hurt\nby its burn!",
      "What will\nNINETALES do?",
    ]);
    expect(arm.rngLedger[0]).toEqual({
      frame: 75,
      randomCalls: 1,
      rngBefore: CONTROL_ACCURACY_RNG,
      rngAfter: 449897005,
      currentMove: WILL_O_WISP,
    });
    // End-of-turn burn chip: 245 - 245/8 = 215.
    expect(arm.targetHpAfter).toBe(215);
  });

  it("drives the same WILL-O-WISP script through the engine and reproduces both arms", () => {
    const prevented = runGate6ScriptToTerminal(
      "BattleScript_EffectWillOWisp",
      wispContext(ABILITY_WATER_VEIL),
      CONTROL_ACCURACY_RNG,
    );
    expect(prevented.rulesContext.battlers[0]!.status1).toBe(receipt.arms.prevents.targetStatus1After);
    expect(prevented.rulesContext.battlers[0]!.hp).toBe(receipt.arms.prevents.targetHpAfter);
    expect(prevented.rulesContext.battlers[1]!.pp).toEqual(receipt.arms.prevents.attackerPpAfter);
    expect(prevented.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNSXPREVENTSBURNS" }),
    ]));
    expect(prevented.events.some((event) => event.kind === "message" && event.messageId === "STRINGID_PKMNWASBURNED")).toBe(false);
    // Matches the ROM: the prevention jump precedes accuracycheck.
    expect(prevented.rng.ledger.map((entry) => entry.reason)).toEqual([]);

    const burned = runGate6ScriptToTerminal(
      "BattleScript_EffectWillOWisp",
      wispContext(ABILITY_OBLIVIOUS),
      CONTROL_ACCURACY_RNG,
    );
    expect(burned.rulesContext.battlers[0]!.status1).toBe(STATUS1_BURN);
    expect(burned.rulesContext.battlers[1]!.pp).toEqual(receipt.arms.control.attackerPpAfter);
    expect(burned.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNWASBURNED" }),
      expect.objectContaining({ kind: "status-icon-update", battler: 0, status1: STATUS1_BURN }),
    ]));
    expect(burned.rng.ledger.map((entry) => entry.reason)).toEqual(["accuracycheck"]);
  });
});
