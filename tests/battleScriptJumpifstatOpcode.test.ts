import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  resolveRulesBattlerForBattleScript,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import { createBattleScriptJumpifstatOpcodeHandlers } from "../src/engine/battleScriptJumpifstatOpcode.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();
const TICKLE = 321; // EFFECT_TICKLE

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 50,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([TICKLE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([20, 0, 0, 0]),
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
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function context(
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, ...attackerChanges }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: TICKLE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    ...contextChanges,
  });
}

function externalPorts(
  overrides: Partial<BattleScriptStatusRulesExternalPorts> = {},
): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
    ...overrides,
  });
}

describe("production jumpifstat (Cmd_jumpifstat) registration", () => {
  it("registers B_SCR_OP_JUMPIFSTAT across all 18 concrete committed call sites", () => {
    const starts = program.instructions.filter((i) => i.opcodeName === "B_SCR_OP_JUMPIFSTAT");
    expect(starts.length).toBe(18);
    const handlers = createBattleScriptJumpifstatOpcodeHandlers(program, resolveRulesBattlerForBattleScript);
    expect(Object.keys(handlers).length).toBe(1);
    expect(handlers[starts[0]!.opcodeId]).toBeDefined();
  });
});

describe("Tickle's own two jumpifstat gates (BattleScript_EffectTickle)", () => {
  const tickleGate1Pc = program.instructions.findIndex(
    (i) => i.opcodeName === "B_SCR_OP_JUMPIFSTAT"
      && i.operands[2]!.expression === "STAT_ATK"
      && i.operands[3]!.expression === "MIN_STAT_STAGE"
      && i.operands[4]!.expression === "BattleScript_TickleDoMoveAnim",
  );
  const tickleGate2Pc = program.instructions.findIndex(
    (i) => i.opcodeName === "B_SCR_OP_JUMPIFSTAT"
      && i.operands[2]!.expression === "STAT_DEF"
      && i.operands[4]!.expression === "BattleScript_CantLowerMultipleStats",
  );

  function stepAt(pc: number, rc: BattleScriptRulesContext) {
    const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectTickle", rc, 1, externalPorts());
    const patched = Object.freeze({ ...execution.state, programCounter: program.instructions[pc]!.programCounter });
    return stepBattleScriptMachine(program, patched, execution.handlers);
  }

  /** Both Tickle gates read BS_TARGET (battler 1, per selectorRoles.target below), not BS_ATTACKER. */
  function withTargetStatStages(statStages: readonly number[]): BattleScriptRulesContext {
    const rc = context();
    const battlers = rc.battlers.map((b, i) => (i === 1 ? { ...b, statStages } : b));
    return Object.freeze({ ...rc, battlers: Object.freeze(battlers) }) as unknown as BattleScriptRulesContext;
  }

  it("CMP_GREATER_THAN, STAT_ATK vs MIN_STAT_STAGE(0): jumps when target's ATK stage > 0", () => {
    const rc = withTargetStatStages([6, 7, 6, 6, 6, 6, 6, 6]);
    const result = stepAt(tickleGate1Pc, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_TickleDoMoveAnim")!.programCounter,
    );
  });

  it("CMP_GREATER_THAN, STAT_ATK vs MIN_STAT_STAGE(0): falls through (does not jump) when target's ATK stage is already 0", () => {
    const rc = withTargetStatStages([6, 0, 6, 6, 6, 6, 6, 6]);
    const result = stepAt(tickleGate1Pc, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).not.toBe(
      resolveBattleScriptLabel(program, "BattleScript_TickleDoMoveAnim")!.programCounter,
    );
  });

  it("CMP_EQUAL, STAT_DEF vs MIN_STAT_STAGE(0): jumps to CantLowerMultipleStats when target's DEF stage is exactly 0", () => {
    const rc = withTargetStatStages([6, 6, 0, 6, 6, 6, 6, 6]);
    const result = stepAt(tickleGate2Pc, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_CantLowerMultipleStats")!.programCounter,
    );
  });

  it("CMP_EQUAL, STAT_DEF vs MIN_STAT_STAGE(0): falls through when target's DEF stage is nonzero", () => {
    const rc = withTargetStatStages([6, 6, 3, 6, 6, 6, 6, 6]);
    const result = stepAt(tickleGate2Pc, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).not.toBe(
      resolveBattleScriptLabel(program, "BattleScript_CantLowerMultipleStats")!.programCounter,
    );
  });

  it("reads BS_TARGET (battler 1), not BS_ATTACKER -- an attacker-side stage change doesn't affect the gate", () => {
    const rc = context({}, { statStages: [6, 0, 6, 6, 6, 6, 6, 6] }); // attacker's own ATK stage zeroed
    const result = stepAt(tickleGate1Pc, rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    // target (battler 1) keeps its default ATK stage of 6 -- CMP_GREATER_THAN vs MIN_STAT_STAGE is true -- jumps.
    expect(result.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_TickleDoMoveAnim")!.programCounter,
    );
  });
});

describe("all six CMP_* comparators (source-complete compare logic, synthetic-operand dispatch)", () => {
  const basePc = program.instructions.findIndex(
    (i) => i.opcodeName === "B_SCR_OP_JUMPIFSTAT"
      && i.operands[1]!.expression === "CMP_GREATER_THAN"
      && i.operands[4]!.expression === "BattleScript_CurseTrySpeed",
  );
  const baseInstruction = program.instructions[basePc]!;

  function syntheticInstruction(comparator: string) {
    return Object.freeze({
      ...baseInstruction,
      operands: Object.freeze([
        baseInstruction.operands[0]!,
        Object.freeze({ ...baseInstruction.operands[1]!, expression: comparator }),
        baseInstruction.operands[2]!,
        baseInstruction.operands[3]!,
        baseInstruction.operands[4]!,
      ]),
    });
  }

  function evaluate(comparator: string, statStageValue: number): boolean {
    const rc = context({}, { statStages: [6, 6, 6, statStageValue, 6, 6, 6, 6] });
    const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectTickle", rc, 1, externalPorts());
    const handlers = createBattleScriptJumpifstatOpcodeHandlers(program, resolveRulesBattlerForBattleScript);
    const handler = handlers[baseInstruction.opcodeId]!;
    const state = Object.freeze({ ...execution.state, programCounter: baseInstruction.programCounter });
    const transition = handler({ program, instruction: syntheticInstruction(comparator), state });
    return transition.control.kind === "jump";
  }

  it("CMP_EQUAL: taken iff stat stage equals MIN_STAT_STAGE(0)", () => {
    expect(evaluate("CMP_EQUAL", 0)).toBe(true);
    expect(evaluate("CMP_EQUAL", 1)).toBe(false);
  });
  it("CMP_NOT_EQUAL: taken iff stat stage differs from MIN_STAT_STAGE(0)", () => {
    expect(evaluate("CMP_NOT_EQUAL", 1)).toBe(true);
    expect(evaluate("CMP_NOT_EQUAL", 0)).toBe(false);
  });
  it("CMP_GREATER_THAN: taken iff stat stage > MIN_STAT_STAGE(0)", () => {
    expect(evaluate("CMP_GREATER_THAN", 1)).toBe(true);
    expect(evaluate("CMP_GREATER_THAN", 0)).toBe(false);
  });
  it("CMP_LESS_THAN: taken iff stat stage < MIN_STAT_STAGE(0) -- never true for an unsigned stage, still exercised", () => {
    expect(evaluate("CMP_LESS_THAN", 0)).toBe(false);
    expect(evaluate("CMP_LESS_THAN", 1)).toBe(false);
  });
  it("CMP_COMMON_BITS: taken iff (stat stage & MIN_STAT_STAGE) != 0 -- always false since MIN_STAT_STAGE is 0", () => {
    expect(evaluate("CMP_COMMON_BITS", 5)).toBe(false);
  });
  it("CMP_NO_COMMON_BITS: taken iff (stat stage & MIN_STAT_STAGE) == 0 -- always true since MIN_STAT_STAGE is 0", () => {
    expect(evaluate("CMP_NO_COMMON_BITS", 5)).toBe(true);
    expect(evaluate("CMP_NO_COMMON_BITS", 0)).toBe(true);
  });
});
