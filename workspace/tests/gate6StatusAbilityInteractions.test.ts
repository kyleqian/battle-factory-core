import { describe, expect, it } from "vitest";
import {
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
} from "../src/engine/battleScriptRulesContext.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import { calculateBaseDamage } from "../src/engine/damageCalc.ts";
import {
  gate6Battler,
  gate6Context,
  gate6Ports,
  gate6Program,
  runGate6ScriptToTerminal,
} from "./gate6StatusInteractionHelpers.ts";

const FACADE = 263;
const WILL_O_WISP = 261;
const STATUS1_BURN = 1 << 4;
const ABILITY_GUTS = 62;
const SEED_1_WISP_RNG = 919694434;
const SEED_1_FACADE_RNG = 3690816045;
const SEED_2_FACADE_RNG = 3605420052;

function facadeContext() {
  return gate6Context(
    0,
    {
      species: 217,
      ability: ABILITY_GUTS,
      hp: 165,
      maxHP: 165,
      attack: 121,
      defense: 104,
      speed: 75,
      spAttack: 95,
      spDefense: 95,
      level: 50,
      status1: STATUS1_BURN,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      moves: [FACADE, FACADE, FACADE, FACADE],
      pp: [20, 20, 20, 20],
    },
    {
      species: 38,
      ability: 18,
      hp: 180,
      maxHP: 180,
      attack: 96,
      defense: 127,
      speed: 120,
      spAttack: 101,
      spDefense: 120,
      level: 50,
      types: ["TYPE_FIRE", "TYPE_FIRE"],
    },
    { currentMove: FACADE },
  );
}

describe("Gate-6 R7 burn x Guts/Facade", () => {
  it("runs Will-O-Wisp's complete effect script, spends PP, and durably burns Ursaring", () => {
    const context = gate6Context(
      1,
      {
        species: 38,
        ability: 18,
        moves: [WILL_O_WISP, WILL_O_WISP, WILL_O_WISP, WILL_O_WISP],
        pp: [15, 15, 15, 15],
      },
      { species: 217, ability: ABILITY_GUTS, status1: 0 },
      { currentMove: WILL_O_WISP },
    );
    const state = runGate6ScriptToTerminal(
      "BattleScript_EffectWillOWisp",
      context,
      SEED_1_WISP_RNG,
    );

    expect(state.rulesContext.battlers[0]!.status1).toBe(STATUS1_BURN);
    expect(state.rulesContext.battlers[1]!.pp).toEqual([14, 15, 15, 15]);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "message",
        messageId: "STRINGID_PKMNWASBURNED",
      }),
      expect.objectContaining({
        kind: "status-icon-update",
        battler: 0,
        status1: STATUS1_BURN,
      }),
    ]));
    expect(state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
    ]);
  });

  it.each([
    ["seed 1", SEED_1_FACADE_RNG, 122, 58, 24745],
    ["seed 324508639", SEED_2_FACADE_RNG, 135, 45, 28096],
  ] as const)(
    "runs Facade's complete burned-Guts branch for %s at the exact ROM damage",
    (_label, rngSeed, damage, remainingHp, damageRoll) => {
      const state = runGate6ScriptToTerminal(
        "BattleScript_EffectFacade",
        facadeContext(),
        rngSeed,
      );

      expect(state.rulesContext.battlers[1]!.hp).toBe(remainingHp);
      expect(180 - state.rulesContext.battlers[1]!.hp).toBe(damage);
      expect(state.rulesContext.battlers[0]!.pp).toEqual([19, 20, 20, 20]);
      expect(state.rng.ledger.map((entry) => entry.reason)).toEqual([
        "accuracycheck",
        "critcalc",
        "adjustnormaldamage",
        "seteffectwithchance",
      ]);
      expect(state.rng.ledger[2]!.randomValue).toBe(damageRoll);
    },
  );

  it("pins both load-bearing arithmetic branches and the exact burn end-turn chip", () => {
    const common = {
      defender: {
        attack: 96,
        defense: 127,
        spAttack: 101,
        spDefense: 120,
        level: 50,
        types: ["TYPE_FIRE", "TYPE_FIRE"] as const,
        statStages: { atk: 6, def: 6, spAtk: 6, spDef: 6 },
      },
      movePower: 70,
      moveType: "TYPE_NORMAL",
      isCriticalHit: false,
    } as const;
    const burnedGuts = calculateBaseDamage({
      ...common,
      attacker: {
        attack: 121,
        defense: 104,
        spAttack: 95,
        spDefense: 95,
        level: 50,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
        statStages: { atk: 6, def: 6, spAtk: 6, spDef: 6 },
        ability: "ABILITY_GUTS",
        isBurned: true,
        hasStatus1: true,
      },
    });
    const burnedWithoutGuts = calculateBaseDamage({
      ...common,
      attacker: {
        attack: 121,
        defense: 104,
        spAttack: 95,
        spDefense: 95,
        level: 50,
        types: ["TYPE_NORMAL", "TYPE_NORMAL"],
        statStages: { atk: 6, def: 6, spAtk: 6, spDef: 6 },
        isBurned: true,
        hasStatus1: true,
      },
    });
    expect(burnedGuts).toBe(45);
    expect(burnedWithoutGuts).toBe(16);
    // BattleScript_FacadeDoubleDmg then supplies x2; typecalc supplies STAB:
    // 45 * 2 * 1.5 = 135 before the 85..100% damage roll.
    expect(Math.trunc((burnedGuts * 2 * 15) / 10)).toBe(135);

    const endTurnContext = gate6Context(
      0,
      gate6Battler({
        species: 217,
        ability: ABILITY_GUTS,
        hp: 165,
        maxHP: 165,
        status1: STATUS1_BURN,
      }),
      gate6Battler({ species: 38, hp: 180, maxHP: 180 }),
    );
    const ports = gate6Ports();
    const handlers = createBattleScriptStatusRulesHandlers(gate6Program, ports);
    const initial = createBattleScriptStatusRulesExecution(
      gate6Program,
      "BattleScript_HandleFaintedMon",
      endTurnContext,
      1,
      ports,
    ).state;
    const result = runBattleEndTurnOrchestration(
      gate6Program,
      handlers,
      initial,
    );
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[0]!.hp).toBe(145);
    expect(result.state.rulesContext.battlers[0]!.status1).toBe(STATUS1_BURN);
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "message",
        messageId: "STRINGID_PKMNHURTBYBURN",
      }),
    ]));
  });
});
