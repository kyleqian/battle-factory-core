import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptPartyMemberInput,
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
import {
  calculateBattleScriptBaseDamageForCurrentMove,
} from "../src/engine/battleScriptHitChainOpcode.ts";
import { BATTLE_SCRIPT_MOVE_RESULT_MISSED } from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const MOVE_STOCKPILE = 254;
const MOVE_SPIT_UP = 255;
const MOVE_SWALLOW = 256;

function battler(
  side: 0 | 1,
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side,
    ability: 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 167,
    moves: changes.moves ?? ([MOVE_STOCKPILE, MOVE_SPIT_UP, MOVE_SWALLOW, 0] as const),
    pp: changes.pp ?? ([10, 10, 10, 0] as const),
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
    stockpileCounter: changes.stockpileCounter,
    helpingHand: changes.helpingHand,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    level: changes.level ?? 50,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: 1,
    partyIndex: 0,
  });
}

function partyMember(hp: number): BattleScriptPartyMemberInput {
  return Object.freeze({
    species: 1,
    hp,
    moves: [MOVE_STOCKPILE, MOVE_SPIT_UP, MOVE_SWALLOW, 0] as const,
    pp: [10, 10, 10, 0] as const,
  });
}

function rules(
  move: number,
  attacker: Partial<BattleScriptRulesBattler> = {},
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  const movePosition = move === MOVE_STOCKPILE ? 0 : move === MOVE_SPIT_UP ? 1 : 2;
  return createBattleScriptRulesContext({
    battlers: [
      battler(0, attacker),
      battler(1, { hp: 167, maxHP: 167 }),
      battler(0, { hp: 0 }),
      battler(1, { hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: move,
    currentMovePosition: movePosition,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: {
      player: [partyMember(attacker.hp ?? 100), {}, {}, {}, {}, {}],
      opponent: [partyMember(167), {}, {}, {}, {}, {}],
    },
    ...changes,
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (
      context: Readonly<{ state: BattleScriptMachineState<BattleScriptRulesContext> }>,
    ) => context.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (context, operand) => Object.freeze({
      kind: "message" as const,
      messageId: operand.expression,
      substitutions: Object.freeze(
        operand.expression === "STRINGID_PKMNSTOCKPILED"
          ? [`NUMBER:${context.state.rulesContext.battleTextBuff1ByteNumber}`]
          : [],
      ),
    }),
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression.startsWith("B_WAIT_TIME_") ? 1 : Number(operand.expression),
    resolveByteOperand: () => null,
  });
}

function entry(move: number): string {
  if (move === MOVE_STOCKPILE) return "BattleScript_EffectStockpile";
  if (move === MOVE_SPIT_UP) return "BattleScript_EffectSpitUp";
  return "BattleScript_EffectSwallow";
}

function execution(source: BattleScriptRulesContext) {
  return createBattleScriptStatusRulesExecution(
    program,
    entry(source.currentMove),
    source,
    7,
    ports(),
  );
}

function stepOpcode(source: BattleScriptRulesContext, opcodeName: string) {
  const instruction = program.instructions.find((item) => item.opcodeName === opcodeName)!;
  const current = execution(source);
  return stepBattleScriptMachine(
    program,
    Object.freeze({ ...current.state, programCounter: instruction.programCounter }),
    current.handlers,
  );
}

function run(source: BattleScriptRulesContext) {
  const current = execution(source);
  let state = current.state;
  for (let guard = 0; guard < 1000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, current.handlers);
    if (result.kind === "halted") return result.state;
    expect(result.kind).not.toBe("unsupported");
    state = result.state;
    if (result.kind === "blocked") {
      for (const battlerId of state.scheduler.pendingControllerBattlers) {
        state = acknowledgeBattleScriptMachineController(state, battlerId);
      }
    }
  }
  throw new Error(`${entry(source.currentMove)} did not terminate`);
}

describe("Stockpile shared counter", () => {
  it.each([
    ["B_SCR_OP_STOCKPILE", 0x85, "Cmd_stockpile", 0],
    ["B_SCR_OP_STOCKPILETOBASEDAMAGE", 0x86, "Cmd_stockpiletobasedamage", 1],
    ["B_SCR_OP_STOCKPILETOHPHEAL", 0x87, "Cmd_stockpiletohpheal", 1],
  ])("registers %s with its exact source shape", (name, opcodeId, dispatcher, operands) => {
    const instruction = program.instructions.find((item) => item.opcodeName === name);
    expect(instruction).toMatchObject({ opcodeId, dispatcher });
    expect(instruction!.operands).toHaveLength(operands);
  });

  it("increments 0→1→2→3 with typed count and fails at three without a draw", () => {
    for (const counter of [0, 1, 2]) {
      const result = stepOpcode(
        rules(MOVE_STOCKPILE, { stockpileCounter: counter }),
        "B_SCR_OP_STOCKPILE",
      );
      if (result.kind !== "advanced") throw new Error(`Stockpile ${counter} did not advance`);
      expect(result.state.rulesContext.battlers[0].stockpileCounter).toBe(counter + 1);
      expect(result.state.rulesContext.battleTextBuff1ByteNumber).toBe(counter + 1);
      expect(result.state.rulesContext.multistringChooser).toBe(0);
      expect(result.state.rng.calls).toBe(0);
    }
    const failed = stepOpcode(
      rules(MOVE_STOCKPILE, { stockpileCounter: 3 }),
      "B_SCR_OP_STOCKPILE",
    );
    if (failed.kind !== "advanced") throw new Error("fourth Stockpile did not advance");
    expect(failed.state.rulesContext.battlers[0].stockpileCounter).toBe(3);
    expect(failed.state.rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_MISSED)
      .toBe(BATTLE_SCRIPT_MOVE_RESULT_MISSED);
    expect(failed.state.rulesContext.multistringChooser).toBe(1);
    expect(failed.state.rng.calls).toBe(0);
  });

  it("walks successful and fourth-use scripts through their exact tables to END", () => {
    const success = run(rules(MOVE_STOCKPILE, { stockpileCounter: 0 }));
    const replay = run(rules(MOVE_STOCKPILE, { stockpileCounter: 0 }));
    expect(success.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(success.rulesContext.battlers[0]).toMatchObject({
      pp: [9, 10, 10, 0],
      stockpileCounter: 1,
    });
    expect(success.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "message",
        messageId: "STRINGID_PKMNSTOCKPILED",
        substitutions: ["NUMBER:1"],
      }),
    ]));
    expect(success.rng.calls).toBe(0);
    expect(replay).toEqual(success);

    const failed = run(rules(MOVE_STOCKPILE, { stockpileCounter: 3 }));
    expect(failed.rulesContext.battlers[0]).toMatchObject({
      pp: [9, 10, 10, 0],
      stockpileCounter: 3,
    });
    expect(failed.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNCANTSTOCKPILE" }),
    ]));
    expect(failed.rng.calls).toBe(0);
  });
});

describe("Swallow", () => {
  it.each([
    [1, 41],
    [2, 83],
    [3, 167],
  ])("heals maxHP by the corrected counter-%i fraction (%i HP)", (counter, heal) => {
    const result = stepOpcode(
      rules(MOVE_SWALLOW, { hp: 67, maxHP: 167, stockpileCounter: counter }),
      "B_SCR_OP_STOCKPILETOHPHEAL",
    );
    if (result.kind !== "advanced") throw new Error(`Swallow ${counter} did not advance`);
    expect(result.state.rulesContext).toMatchObject({
      battleMoveDamage: -heal,
      animTurn: counter,
      selectorRoles: { target: 0 },
    });
    expect(result.state.rulesContext.battlers[0].stockpileCounter).toBe(0);
    expect(result.state.rng.calls).toBe(0);
  });

  it("clamps a sub-one quarter heal to one HP", () => {
    const result = stepOpcode(
      rules(MOVE_SWALLOW, { hp: 1, maxHP: 3, stockpileCounter: 1 }),
      "B_SCR_OP_STOCKPILETOHPHEAL",
    );
    if (result.kind !== "advanced") throw new Error("minimum Swallow did not advance");
    expect(result.state.rulesContext.battleMoveDamage).toBe(-1);
    expect(result.state.rulesContext.battlers[0].stockpileCounter).toBe(0);
    expect(result.state.rng.calls).toBe(0);
  });

  it("distinguishes zero-counter and full-HP failures, clearing only the latter", () => {
    const zero = stepOpcode(
      rules(MOVE_SWALLOW, { hp: 67, stockpileCounter: 0 }),
      "B_SCR_OP_STOCKPILETOHPHEAL",
    );
    if (zero.kind !== "advanced") throw new Error("zero Swallow did not jump");
    expect(zero.state.rulesContext).toMatchObject({
      multistringChooser: 0,
      selectorRoles: { target: 1 },
    });
    const full = stepOpcode(
      rules(MOVE_SWALLOW, { hp: 167, maxHP: 167, stockpileCounter: 2 }),
      "B_SCR_OP_STOCKPILETOHPHEAL",
    );
    if (full.kind !== "advanced") throw new Error("full Swallow did not jump");
    expect(full.state.rulesContext).toMatchObject({
      multistringChooser: 1,
      selectorRoles: { target: 0 },
    });
    expect(full.state.rulesContext.battlers[0].stockpileCounter).toBe(0);
    expect(zero.state.rng.calls).toBe(0);
    expect(full.state.rng.calls).toBe(0);
  });

  it("pins the OFF count-two receipt 67→150 and resets before the next Stockpile", () => {
    const first = run(rules(MOVE_SWALLOW, { hp: 67, maxHP: 167, stockpileCounter: 2 }));
    const replay = run(rules(MOVE_SWALLOW, { hp: 67, maxHP: 167, stockpileCounter: 2 }));
    expect(first.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(first.rulesContext.battlers[0]).toMatchObject({
      hp: 150,
      pp: [10, 10, 9, 0],
      stockpileCounter: 0,
    });
    expect(first.rulesContext.party.player[0].hp).toBe(150);
    expect(first.rng.calls).toBe(0);
    expect(replay).toEqual(first);
  });

  it("walks both failure-table strings through END", () => {
    const empty = run(rules(MOVE_SWALLOW, { hp: 67, stockpileCounter: 0 }));
    const full = run(rules(MOVE_SWALLOW, { hp: 167, maxHP: 167, stockpileCounter: 2 }));
    expect(empty.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_FAILEDTOSWALLOW" }),
    ]));
    expect(full.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNHPFULL" }),
    ]));
    expect(empty.rng.calls).toBe(0);
    expect(full.rng.calls).toBe(0);
  });
});

describe("Spit Up", () => {
  it("multiplies source CalculateBaseDamage after calculation, applies Helping Hand, and clears", () => {
    for (const counter of [1, 2, 3]) {
      const source = rules(MOVE_SPIT_UP, { stockpileCounter: counter });
      const base = calculateBattleScriptBaseDamageForCurrentMove(source);
      const result = stepOpcode(source, "B_SCR_OP_STOCKPILETOBASEDAMAGE");
      if (result.kind !== "advanced") throw new Error(`Spit Up ${counter} did not advance`);
      expect(result.state.rulesContext).toMatchObject({
        battleMoveDamage: base * counter,
        animTurn: counter,
      });
      expect(result.state.rulesContext.battlers[0].stockpileCounter).toBe(0);
      expect(result.state.rng.calls).toBe(0);
    }
    const helped = rules(MOVE_SPIT_UP, { stockpileCounter: 2, helpingHand: 1 });
    const helpedResult = stepOpcode(helped, "B_SCR_OP_STOCKPILETOBASEDAMAGE");
    if (helpedResult.kind !== "advanced") throw new Error("helped Spit Up did not advance");
    expect(helpedResult.state.rulesContext.battleMoveDamage)
      .toBe(Math.trunc((calculateBattleScriptBaseDamageForCurrentMove(helped) * 2 * 15) / 10));
  });

  it("jumps at zero, and Protect clears without recalculating damage or animTurn", () => {
    const zero = stepOpcode(
      rules(MOVE_SPIT_UP, { stockpileCounter: 0 }),
      "B_SCR_OP_STOCKPILETOBASEDAMAGE",
    );
    if (zero.kind !== "advanced") throw new Error("zero Spit Up did not jump");
    expect(zero.state.rulesContext).toMatchObject({ battleMoveDamage: 0, animTurn: 0 });

    const protectedResult = stepOpcode(
      rules(
        MOVE_SPIT_UP,
        { stockpileCounter: 3 },
        { missType: 1, battleMoveDamage: 77, animTurn: 9 },
      ),
      "B_SCR_OP_STOCKPILETOBASEDAMAGE",
    );
    if (protectedResult.kind !== "advanced") throw new Error("protected Spit Up did not advance");
    expect(protectedResult.state.rulesContext).toMatchObject({
      battleMoveDamage: 77,
      animTurn: 9,
    });
    expect(protectedResult.state.rulesContext.battlers[0].stockpileCounter).toBe(0);
    expect(zero.state.rng.calls).toBe(0);
    expect(protectedResult.state.rng.calls).toBe(0);
  });

  it("walks success, zero-counter, and Protect scripts to END with exact ledgers", () => {
    const success = run(rules(MOVE_SPIT_UP, { stockpileCounter: 2 }));
    const replay = run(rules(MOVE_SPIT_UP, { stockpileCounter: 2 }));
    expect(success.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(success.rulesContext.battlers[0]).toMatchObject({
      pp: [10, 9, 10, 0],
      stockpileCounter: 0,
    });
    expect(success.rng.calls).toBe(2);
    expect(success.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
      "seteffectwithchance",
    ]);
    expect(replay).toEqual(success);

    const zero = run(rules(MOVE_SPIT_UP, { stockpileCounter: 0 }));
    expect(zero.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_FAILEDTOSPITUP" }),
    ]));
    expect(zero.rng.calls).toBe(1);

    const protectedResult = run(rules(
      MOVE_SPIT_UP,
      { stockpileCounter: 3 },
      { missType: 1 },
    ));
    expect(protectedResult.rulesContext.battlers[0].stockpileCounter).toBe(0);
    expect(protectedResult.rng.calls).toBe(0);
  });
});
