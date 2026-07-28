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
import {
  loadBattleScriptProgram,
} from "../src/engine/battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_B_MSG_SET_SUBSTITUTE,
  BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED,
} from "../src/engine/battleScriptSetsubstituteOpcode.ts";
import {
  BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
} from "../src/engine/battleScriptSourceConstants.ts";

const SUBSTITUTE = 164;
const STATUS2_UNRELATED = 1 << 20;
const HITMARKER_UNRELATED = 1 << 18;
const program = loadBattleScriptProgram();
const setInstruction = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_SETSUBSTITUTE",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? ([SUBSTITUTE, 0, 0, 0] as const),
    pp: changes.pp ?? ([10, 0, 0, 0] as const),
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
    types: changes.types ?? (["TYPE_ROCK", "TYPE_GROUND"] as const),
    species: changes.species ?? 76,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
    speed: changes.speed ?? 50,
  });
}

function rules(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, ...attackerChanges }),
      battler({ side: 1, species: 213 }),
      battler({ side: 0, hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: SUBSTITUTE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: HITMARKER_UNRELATED,
    multiHitCounter: 0,
    multistringChooser: 77,
    battleMoveDamage: 777,
    ...changes,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) => Object.freeze({
      kind: "message" as const,
      messageId: operand.expression,
      substitutions: Object.freeze([]),
    }),
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) => {
      if (operand.expression === "B_WAIT_TIME_LONG") return 64;
      if (operand.expression === "B_WAIT_TIME_SHORT") return 32;
      return null;
    },
    resolveByteOperand: () => null,
  });
}

function executionAtSet(source: BattleScriptRulesContext, seed = 0x1234_5678) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectSubstitute",
    source,
    seed,
    externalPorts(),
  );
  return {
    ...execution,
    state: Object.freeze({ ...execution.state, programCounter: setInstruction.programCounter }),
  };
}

function stepSet(source: BattleScriptRulesContext, seed = 0x1234_5678) {
  const execution = executionAtSet(source, seed);
  const result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`setsubstitute did not advance: ${result.kind}`);
  return result;
}

function ackAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function runToTerminal(source: BattleScriptRulesContext, seed = 0x1234_5678) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectSubstitute",
    source,
    seed,
    externalPorts(),
  );
  let state = execution.state;
  for (let guard = 0; guard < 1000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "halted") {
      expect(result.state.haltReason).toMatchObject({
        kind: "terminal",
        opcodeName: "B_SCR_OP_END",
      });
      return result.state;
    }
    if (result.kind === "blocked") {
      state = ackAllPending(result.state);
      continue;
    }
    state = result.state;
  }
  throw new Error("BattleScript_EffectSubstitute did not reach END");
}

function messageIds(state: BattleScriptMachineState<BattleScriptRulesContext>): string[] {
  return state.events
    .filter((event) => event.kind === "message")
    .map((event) => event.messageId);
}

describe("B_SCR_OP_SETSUBSTITUTE / Cmd_setsubstitute", () => {
  it("is the sole operand-free one-byte 0x9c instruction with the exact source dispatcher", () => {
    expect(program.instructions.filter(
      (instruction) => instruction.opcodeName === "B_SCR_OP_SETSUBSTITUTE",
    )).toHaveLength(1);
    expect(setInstruction).toMatchObject({
      opcodeId: 0x9c,
      opcodeName: "B_SCR_OP_SETSUBSTITUTE",
      dispatcher: "Cmd_setsubstitute",
      operands: [],
    });
    const nextInstruction = program.instructions.find(
      (instruction) => instruction.programCounter > setInstruction.programCounter,
    )!;
    expect(nextInstruction.programCounter - setInstruction.programCounter).toBe(1);
  });

  it("fails strictly at HP == quarter, changing only move damage and chooser", () => {
    const source = rules({
      hp: 25,
      maxHP: 100,
      status2: STATUS2_UNRELATED | BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
      substituteHP: 9,
    });
    const result = stepSet(source);
    expect(result.state.programCounter).toBe(setInstruction.programCounter + 1);
    expect(result.state.rulesContext).toEqual({
      ...source,
      battleMoveDamage: 0,
      multistringChooser: BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED,
    });
    expect(result.state.rng).toEqual({ value: 0x1234_5678, calls: 0, ledger: [] });
    expect(result.state.events).toEqual([]);
    expect(result.state.scheduler).toEqual(executionAtSet(source).state.scheduler);
  });

  it("succeeds at HP == quarter + 1, owns only attacker fields, and preserves unrelated bits", () => {
    const source = rules({
      hp: 26,
      maxHP: 100,
      status2: STATUS2_UNRELATED | BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
      substituteHP: 9,
    });
    const result = stepSet(source);
    expect(result.state.rulesContext).toEqual({
      ...source,
      battlers: [
        {
          ...source.battlers[0],
          status2: STATUS2_UNRELATED | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE,
          substituteHP: 25,
        },
        source.battlers[1],
        source.battlers[2],
        source.battlers[3],
      ],
      battleMoveDamage: 25,
      multistringChooser: BATTLE_SCRIPT_B_MSG_SET_SUBSTITUTE,
      hitMarker: HITMARKER_UNRELATED | BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE,
    });
    expect(result.state.rng).toEqual({ value: 0x1234_5678, calls: 0, ledger: [] });
    expect(result.state.events).toEqual([]);
    expect(result.state.scheduler).toEqual(executionAtSet(source).state.scheduler);
  });

  it("uses the defensive minimum-one quarter for tiny max HP on both boundaries", () => {
    const failed = stepSet(rules({ hp: 1, maxHP: 3 }));
    expect(failed.state.rulesContext.battleMoveDamage).toBe(0);
    expect(failed.state.rulesContext.multistringChooser).toBe(BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED);

    const succeeded = stepSet(rules({ hp: 2, maxHP: 3 }));
    expect(succeeded.state.rulesContext.battleMoveDamage).toBe(1);
    expect(succeeded.state.rulesContext.battlers[0]).toMatchObject({
      hp: 2,
      maxHP: 3,
      substituteHP: 1,
      status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE,
    });
  });

  it("rejects a missing attacker role before changing any state", () => {
    const source = rules({}, {
      selectorRoles: { attacker: null, target: 1, effectBattler: 0 },
    });
    expect(() => stepSet(source)).toThrow(/requires an attacker role/);
  });
});

describe("BattleScript_EffectSubstitute genuine terminal routes", () => {
  it("success spends PP, applies the later HP debit, prints made-substitute, and preserves the live state", () => {
    const state = runToTerminal(rules({ hp: 155, maxHP: 155, pp: [10, 0, 0, 0] }));
    expect(state.rulesContext.battlers[0]).toMatchObject({
      hp: 117,
      maxHP: 155,
      pp: [9, 0, 0, 0],
      status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE,
      substituteHP: 38,
    });
    expect(state.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE)
      .toBe(BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE);
    expect(messageIds(state)).toEqual([
      "STRINGID_USEDMOVE",
      "STRINGID_PKMNMADESUBSTITUTE",
    ]);
    expect(state.rng).toEqual({ value: 0x1234_5678, calls: 0, ledger: [] });
  });

  it("low HP spends PP but loses no HP and prints too-weak without constructing state", () => {
    const state = runToTerminal(rules({
      hp: 25,
      maxHP: 100,
      pp: [10, 0, 0, 0],
      status2: STATUS2_UNRELATED | BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
      substituteHP: 7,
    }));
    expect(state.rulesContext.battlers[0]).toMatchObject({
      hp: 25,
      pp: [9, 0, 0, 0],
      status2: STATUS2_UNRELATED | BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
      substituteHP: 7,
    });
    expect(state.rulesContext.battleMoveDamage).toBe(0);
    expect(messageIds(state)).toEqual([
      "STRINGID_USEDMOVE",
      "STRINGID_TOOWEAKFORSUBSTITUTE",
    ]);
    expect(state.rng.calls).toBe(0);
  });

  it("already-live bypasses the handler, spends PP, and preserves HP/substitute/status fields", () => {
    const status2 = STATUS2_UNRELATED
      | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE
      | BATTLE_SCRIPT_STATUS2_WRAPPED_MASK;
    const state = runToTerminal(rules({
      hp: 117,
      maxHP: 155,
      pp: [9, 0, 0, 0],
      status2,
      substituteHP: 38,
    }, {
      battleMoveDamage: 777,
      multistringChooser: 77,
    }));
    expect(state.rulesContext.battlers[0]).toMatchObject({
      hp: 117,
      pp: [8, 0, 0, 0],
      status2,
      substituteHP: 38,
    });
    expect(state.rulesContext.battleMoveDamage).toBe(777);
    expect(state.rulesContext.multistringChooser).toBe(77);
    expect(state.rulesContext.alreadyStatusedMoveAttempt & 1).toBe(1);
    expect(messageIds(state)).toEqual([
      "STRINGID_USEDMOVE",
      "STRINGID_PKMNHASSUBSTITUTE",
    ]);
    expect(state.rng.calls).toBe(0);
  });

  it("persists into a second genuine action: HP 155→117 and PP 10→9→8", () => {
    const first = runToTerminal(rules({ hp: 155, maxHP: 155, pp: [10, 0, 0, 0] }));
    const secondRules = createBattleScriptRulesContext({
      ...first.rulesContext,
      battlers: first.rulesContext.battlers,
      atkCancelerTracker: 0,
      hitMarker: 0,
      alreadyStatusedMoveAttempt: 0,
    });
    const second = runToTerminal(secondRules);
    expect(second.rulesContext.battlers[0]).toMatchObject({
      hp: 117,
      maxHP: 155,
      pp: [8, 0, 0, 0],
      status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE,
      substituteHP: 38,
    });
    expect(messageIds(second)).toContain("STRINGID_PKMNHASSUBSTITUTE");
  });
});
