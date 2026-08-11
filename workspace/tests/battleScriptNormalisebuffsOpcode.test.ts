import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
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
import { createBattleScriptNormalisebuffsOpcodeHandlers } from "../src/engine/battleScriptNormalisebuffsOpcode.ts";

const program = loadBattleScriptProgram();
const HAZE = 114;
const BULK_UP = 339;
const AGILITY = 97;
const GROWTH = 74;
const AMNESIA = 133;
const DOUBLE_TEAM = 104;
const SAND_ATTACK = 28;
const NEUTRAL = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6] as const);

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
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
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) =>
    operand.expression === "B_WAIT_TIME_LONG" || operand.expression === "B_WAIT_TIME_SHORT" ? 1 : null,
  resolveByteOperand: () => null,
});

function battler(side: 0 | 1, changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? ([HAZE, 0, 0, 0] as const),
    pp: changes.pp ?? ([30, 0, 0, 0] as const),
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
    statStages: changes.statStages ?? NEUTRAL,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function initialContext(): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler(0, { status1: 1 << 4, status3: 0x100, disabledMove: 33 }),
      battler(1, { status1: 1 << 3, status3: 0x400, disabledMove: 45 }),
      battler(0, { hp: 0, statStages: [6, 1, 2, 3, 4, 5, 6, 7] }),
      battler(1, { hp: 0, statStages: [6, 11, 10, 9, 8, 7, 6, 5] }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: HAZE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  });
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

function runToTerminal(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 0x1234_5678,
) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 1; result.kind !== "halted" && steps < 500; steps += 1) {
    result = stepBattleScriptMachine(program, ackAllPending(result.state), execution.handlers);
  }
  if (result.kind !== "halted") {
    throw new Error(`${entryLabel} did not reach END`);
  }
  expect(result.state.haltReason).toMatchObject({
    kind: "terminal",
    opcodeName: "B_SCR_OP_END",
  });
  return result.state;
}

function withMove(
  rules: BattleScriptRulesContext,
  attacker: 0 | 1,
  target: 0 | 1,
  move: number,
): BattleScriptRulesContext {
  const battlers = rules.battlers.map((candidate, id) =>
    id === attacker
      ? Object.freeze({ ...candidate, moves: Object.freeze([move, 0, 0, 0]), pp: Object.freeze([40, 0, 0, 0]) })
      : candidate
  ) as unknown as BattleScriptRulesContext["battlers"];
  return Object.freeze({
    ...rules,
    battlers: Object.freeze(battlers),
    selectorRoles: Object.freeze({ attacker, target, effectBattler: target, fainted: null }),
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    currentMove: move,
    currentMovePosition: 0,
    moveResultFlags: 0,
    moveEffectByte: 0,
    missType: 0,
  });
}

function stageAllSevenStatsFromSixMovesPerBattler(): BattleScriptRulesContext {
  let rules = initialContext();
  const selfMoves = [
    ["BattleScript_EffectBulkUp", BULK_UP],
    ["BattleScript_EffectSpeedUp2", AGILITY],
    ["BattleScript_EffectSpecialAttackUp", GROWTH],
    ["BattleScript_EffectSpecialDefenseUp2", AMNESIA],
    ["BattleScript_EffectEvasionUp", DOUBLE_TEAM],
  ] as const;
  for (const battlerId of [0, 1] as const) {
    for (const [entry, move] of selfMoves) {
      rules = runToTerminal(entry, withMove(rules, battlerId, battlerId, move)).rulesContext;
    }
  }
  rules = runToTerminal(
    "BattleScript_EffectAccuracyDown",
    withMove(rules, 0, 1, SAND_ATTACK),
  ).rulesContext;
  rules = runToTerminal(
    "BattleScript_EffectAccuracyDown",
    withMove(rules, 1, 0, SAND_ATTACK),
  ).rulesContext;
  return rules;
}

describe("source-complete B_SCR_OP_NORMALISEBUFFS / EFFECT_HAZE", () => {
  it("pins the sole operand-free Cmd_normalisebuffs instruction in Haze's committed script", () => {
    const instructions = program.instructions.filter(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_NORMALISEBUFFS",
    );
    expect(instructions).toHaveLength(1);
    expect(instructions[0]).toMatchObject({
      opcodeId: 0x8a,
      dispatcher: "Cmd_normalisebuffs",
      operands: [],
      source: { label: "BattleScript_EffectHaze" },
    });
    expect(() => createBattleScriptNormalisebuffsOpcodeHandlers(Object.freeze({
      ...program,
      instructions: Object.freeze(program.instructions.filter(
        (instruction) => instruction !== instructions[0],
      )),
    }))).toThrow(/requires exactly 1 concrete start, got 0/);
  });

  it("resets all eight stage slots on all four modeled battlers and preserves status3/DisableStruct state", () => {
    const rules = initialContext();
    const instruction = program.instructions.find(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_NORMALISEBUFFS",
    )!;
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectHaze",
      rules,
      0x1234_5678,
      ports,
    );
    const state = Object.freeze({ ...execution.state, programCounter: instruction.programCounter });
    const result = stepBattleScriptMachine(
      program,
      state,
      createBattleScriptNormalisebuffsOpcodeHandlers(program),
    );
    expect(result.kind).toBe("advanced");
    for (const candidate of result.state.rulesContext.battlers) {
      expect(candidate.statStages).toEqual(NEUTRAL);
    }
    expect(result.state.rulesContext.battlers.map(({ status1, status3, disabledMove }) =>
      ({ status1, status3, disabledMove })
    )).toEqual(rules.battlers.map(({ status1, status3, disabledMove }) =>
      ({ status1, status3, disabledMove })
    ));
    expect(result.state.rng).toBe(state.rng);
    expect(result.state.events).toBe(state.events);
  });

  it("walks Haze to END after six real prior moves have staged every relevant stat on both sides; Haze itself draws no RNG", () => {
    const staged = stageAllSevenStatsFromSixMovesPerBattler();
    expect(staged.battlers[0].statStages.slice(1)).not.toContain(6);
    expect(staged.battlers[1].statStages.slice(1)).not.toContain(6);
    const state = runToTerminal(
      "BattleScript_EffectHaze",
      withMove(staged, 0, 1, HAZE),
    );
    for (const candidate of state.rulesContext.battlers) {
      expect(candidate.statStages).toEqual(NEUTRAL);
    }
    expect(state.rulesContext.battlers[0]).toMatchObject({
      status1: 1 << 4,
      status3: 0x100,
      disabledMove: 33,
    });
    expect(state.rulesContext.battlers[1]).toMatchObject({
      status1: 1 << 3,
      status3: 0x400,
      disabledMove: 45,
    });
    expect(state.rng).toEqual({ value: 0x1234_5678, calls: 0, ledger: [] });
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_STATCHANGESGONE" }),
    ]));
  });

  it("canonically replays the fully staged committed Haze script byte-for-byte", () => {
    const staged = withMove(stageAllSevenStatsFromSixMovesPerBattler(), 1, 0, HAZE);
    const first = runToTerminal("BattleScript_EffectHaze", staged);
    const replay = runToTerminal("BattleScript_EffectHaze", staged);
    expect(replay.rulesContext).toEqual(first.rulesContext);
    expect(replay.events).toEqual(first.events);
    expect(replay.rng).toEqual(first.rng);
  });
});
