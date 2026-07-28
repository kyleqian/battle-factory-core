import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";

const DEFENSE_CURL = 111;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) => candidate.opcodeName === "B_SCR_OP_SETDEFENSECURLBIT",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? ([DEFENSE_CURL, 0, 0, 0] as const),
    pp: changes.pp ?? ([40, 0, 0, 0] as const),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_ROCK", "TYPE_BUG"] as const),
    species: changes.species ?? 213,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 30,
    defense: changes.defense ?? 282,
    spAttack: changes.spAttack ?? 33,
    spDefense: changes.spDefense ?? 282,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
    speed: changes.speed ?? 22,
  });
}

function rules(
  attacker: 0 | 1,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const battlers = [
    battler({ side: 0, ...(attacker === 0 ? attackerChanges : {}) }),
    battler({ side: 1, ...(attacker === 1 ? attackerChanges : {}) }),
    battler({ side: 0, hp: 0 }),
    battler({ side: 1, hp: 0 }),
  ] as const;
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: {
      attacker,
      target: attacker === 0 ? 1 : 0,
      effectBattler: attacker,
      fainted: null,
    },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: DEFENSE_CURL,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  } satisfies BattleScriptRulesContextInput);
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({
            kind: "message" as const,
            messageId: operand.expression,
            substitutions: Object.freeze([]),
          })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: (context) =>
      context.state.rulesContext.selectorRoles.attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" ? 64 : null,
    resolveByteOperand: () => null,
  });
}

function runToHalt(
  initial: BattleScriptMachineState<BattleScriptRulesContext>,
  handlers: ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"],
): BattleScriptMachineState<BattleScriptRulesContext> {
  let state = initial;
  for (let guard = 0; guard < 3000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, handlers);
    state = result.state;
    if (result.kind === "blocked") {
      for (const battlerId of state.scheduler.pendingControllerBattlers) {
        state = acknowledgeBattleScriptMachineController(state, battlerId);
      }
    } else if (result.kind === "halted") {
      return state;
    } else {
      expect(result.kind).not.toBe("unsupported");
    }
  }
  throw new Error("Defense Curl script did not halt within the guard");
}

describe("B_SCR_OP_SETDEFENSECURLBIT / EFFECT_DEFENSE_CURL", () => {
  it("registers the sole source-complete one-byte opcode 0xbf with no operands", () => {
    expect(program.instructions.filter(
      (candidate) => candidate.opcodeName === "B_SCR_OP_SETDEFENSECURLBIT",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xbf,
      dispatcher: "Cmd_setdefensecurlbit",
      source: {
        label: "BattleScript_EffectDefenseCurl",
        statementLine: 2018,
      },
      operands: [],
    });
  });

  it.each([0, 1] as const)(
    "unconditionally ORs only attacker %i's bit and advances exactly one byte",
    (attacker) => {
      const source = rules(attacker, { status2: 0x0200_0081 });
      const target = attacker === 0 ? 1 : 0;
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_EffectDefenseCurl",
        source,
        0x1234_5678,
        externalPorts(),
      );
      const state = Object.freeze({
        ...execution.state,
        programCounter: instruction.programCounter,
      });
      const result = stepBattleScriptMachine(program, state, execution.handlers);
      if (result.kind !== "advanced") {
        throw new Error(`expected advance, got ${result.kind}`);
      }
      expect(result.state.programCounter).toBe(instruction.programCounter + 1);
      expect(result.state.rulesContext.battlers[attacker]!.status2).toBe(
        0x4200_0081,
      );
      expect(result.state.rulesContext.battlers[target]).toBe(source.battlers[target]);
      expect(result.state.scheduler).toBe(state.scheduler);
      expect(result.state.rng).toBe(state.rng);
      expect(result.state.events).toBe(state.events);
    },
  );

  it("sets the bit before a maxed Defense failure and preserves it through the effect END", () => {
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectDefenseCurl",
      rules(0, {
        statStages: [6, 6, 12, 6, 6, 6, 6, 6],
      }),
      0x1234_5678,
      externalPorts(),
    );
    const final = runToHalt(execution.state, execution.handlers);
    expect(final.haltReason).toMatchObject({
      kind: "terminal",
      opcodeName: "B_SCR_OP_END",
    });
    expect(final.rulesContext.battlers[0]!.pp).toEqual([39, 0, 0, 0]);
    expect(final.rulesContext.battlers[0]!.statStages[2]).toBe(12);
    expect(
      final.rulesContext.battlers[0]!.status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL
    ).toBe(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DEFENSE_CURL);
    expect(final.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "set-battler-pp-data",
        battler: 0,
        movePosition: 0,
        pp: 39,
      }),
      expect.objectContaining({
        kind: "message",
        messageId: "STRINGID_STATSWONTINCREASE",
      }),
    ]));
    expect(final.rng.calls).toBe(0);
  });
});
