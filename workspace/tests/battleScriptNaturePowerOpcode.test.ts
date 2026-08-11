import { describe, expect, it } from "vitest";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_NATURE_POWER_MOVES } from "../src/engine/battleScriptEnvironmentAttackOpcode.ts";

const program = loadBattleScriptProgram();
const NATURE_POWER = 267;
const SWIFT = 129;

function battler(side: 0 | 1): BattleScriptRulesBattler {
  return Object.freeze({
    side,
    ability: 1,
    hp: 500,
    maxHP: 500,
    moves: [NATURE_POWER, 0, 0, 0],
    pp: [20, 0, 0, 0],
    status1: 0,
    status2: 0,
    status3: 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: 1,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: 0,
  } as BattleScriptRulesBattler);
}

function rules(environment: number): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [battler(0), battler(1), battler(0), battler(1)],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: NATURE_POWER,
    currentMovePosition: 0,
    chosenMove: NATURE_POWER,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 1 << 10,
    multiHitCounter: 0,
    gBattleEnvironment: environment,
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
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
    if (operand.expression.startsWith("B_WAIT_TIME_")) return 1;
    const numeric = Number(operand.expression);
    return Number.isSafeInteger(numeric) ? numeric : null;
  },
  resolveByteOperand: () => null,
});

function ack(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function run(environment: number) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectNaturePower",
    rules(environment),
    1,
    ports,
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 1000; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") {
    throw new Error(
      `Nature Power environment ${environment} did not halt: ${result.kind} `
      + `${JSON.stringify(result.state.scheduler)} pc=${result.state.programCounter}`,
    );
  }
  expect(result.state.haltReason).toMatchObject({
    kind: "terminal",
    opcodeName: "B_SCR_OP_END",
  });
  return result.state;
}

describe("source-complete B_SCR_OP_CALLENVIRONMENTATTACK / EFFECT_NATURE_POWER", () => {
  it("pins the source environment table, including Factory Building -> Swift", () => {
    expect(BATTLE_SCRIPT_NATURE_POWER_MOVES).toEqual([
      78, 75, 89, 56, 57, 61, 157, 247, SWIFT, SWIFT,
    ]);
    expect(program.instructions.filter(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_CALLENVIRONMENTATTACK",
    )).toMatchObject([{
      opcodeId: 0xcc,
      dispatcher: "Cmd_callenvironmentattack",
      operands: [],
      source: { label: "BattleScript_EffectNaturePower" },
    }]);
  });

  it("pushes Swift, runs Nature Power's continuation first, and only then returns into the selected effect", () => {
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectNaturePower",
      rules(8),
      1,
      ports,
    );
    const opcode = program.instructions.find(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_CALLENVIRONMENTATTACK",
    )!;
    const selectedEntry = resolveBattleScriptLabel(program, "BattleScript_EffectHit")!;
    const dispatch = stepBattleScriptMachine(
      program,
      Object.freeze({ ...execution.state, programCounter: opcode.programCounter }),
      execution.handlers,
    );
    if (dispatch.kind !== "advanced") throw new Error(`Nature Power dispatch: ${dispatch.kind}`);
    expect(dispatch.state.programCounter).toBe(opcode.programCounter + 1);
    expect(dispatch.state.callStack).toEqual([selectedEntry.programCounter]);
    expect(dispatch.state.rulesContext).toMatchObject({
      currentMove: SWIFT,
      currentMovePower: 60,
      chosenMove: NATURE_POWER,
      selectorRoles: { target: 1 },
    });
    expect(dispatch.state.rulesContext.hitMarker & (1 << 10)).toBe(0);
    expect(dispatch.state.rulesContext.battlers[0].pp[0]).toBe(20);
    expect(dispatch.state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it("Building-selected Swift owns the later hit RNG and move end while Nature Power's slot spends PP", () => {
    const state = run(8);
    expect(state.rulesContext.currentMove).toBe(SWIFT);
    expect(state.rulesContext.chosenMove).toBe(NATURE_POWER);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(19);
    expect(state.rulesContext.moveHistory).toMatchObject({
      lastPrintedMoves: [NATURE_POWER, 0, 0, 0],
      lastMoves: [NATURE_POWER, 0, 0, 0],
      lastResultingMoves: [SWIFT, 0, 0, 0],
      lastLandedMoves: [0, SWIFT, 0, 0],
      lastHitByType: [0, 0, 0, 0],
    });
    expect(state.rng.ledger).toMatchObject([
      { call: 1, reason: "critcalc", randomValue: 16838 },
      { call: 2, reason: "adjustnormaldamage", randomValue: 44065 },
      { call: 3, reason: "seteffectwithchance", randomValue: 53998 },
    ]);
  });

  it("executes every source environment's selected effect to END", () => {
    const states = BATTLE_SCRIPT_NATURE_POWER_MOVES.map((_move, environment) =>
      run(environment)
    );
    expect(states.map((state) => state.rulesContext.currentMove))
      .toEqual(BATTLE_SCRIPT_NATURE_POWER_MOVES);
    expect(states.map((state) =>
      state.rng.ledger.map(({ reason, randomValue }) => [reason, randomValue])
    )).toEqual([
      [
        ["nature-power-selected-move-target", 16838],
        ["nature-power-selected-move-target", 44065],
        ["accuracycheck", 53998],
      ],
      [
        ["accuracycheck", 16838],
        ["critcalc", 44065],
        ["adjustnormaldamage", 53998],
        ["seteffectwithchance", 8119],
      ],
      [
        ["accuracycheck", 16838],
        ["critcalc", 44065],
        ["adjustnormaldamage", 53998],
      ],
      [
        ["nature-power-selected-move-target", 16838],
        ["nature-power-selected-move-target", 44065],
        ["accuracycheck", 53998],
      ],
      [
        ["accuracycheck", 16838],
        ["critcalc", 44065],
        ["adjustnormaldamage", 53998],
        ["seteffectwithchance", 8119],
      ],
      [
        ["nature-power-selected-move-target", 16838],
        ["nature-power-selected-move-target", 44065],
        ["accuracycheck", 53998],
        ["critcalc", 8119],
        ["adjustnormaldamage", 31203],
        ["seteffectwithchance", 46760],
      ],
      [
        ["accuracycheck", 16838],
        ["critcalc", 44065],
        ["adjustnormaldamage", 53998],
        ["seteffectwithchance", 8119],
      ],
      [
        ["nature-power-selected-move-target", 16838],
        ["nature-power-selected-move-target", 44065],
        ["accuracycheck", 53998],
        ["critcalc", 8119],
        ["adjustnormaldamage", 31203],
        ["seteffectwithchance", 46760],
      ],
      [
        ["critcalc", 16838],
        ["adjustnormaldamage", 44065],
        ["seteffectwithchance", 53998],
      ],
      [
        ["critcalc", 16838],
        ["adjustnormaldamage", 44065],
        ["seteffectwithchance", 53998],
      ],
    ]);
  });

  it("canonical Building replay is exact", () => {
    expect(run(8)).toEqual(run(8));
  });
});
