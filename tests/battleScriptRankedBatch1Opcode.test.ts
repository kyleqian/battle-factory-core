import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  halfTargetHpDamage,
  hiddenPowerFromIvs,
  magnitudeForRoll,
  scaledDamagePower,
} from "../src/engine/battleScriptRankedBatch1Opcode.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";

const program = loadBattleScriptProgram();

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([10, 0, 0, 0]),
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
    ivs: changes.ivs,
    statStages: changes.statStages ?? Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(
  move: number,
  attacker: Partial<BattleScriptRulesBattler> = {},
  target: Partial<BattleScriptRulesBattler> = {},
  changes: Partial<BattleScriptRulesContextInput> = {},
) {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, moves: [move, 0, 0, 0], ...attacker }),
      battler({ side: 1, ...target }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: move,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    ...changes,
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
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
      const numeric = Number(operand.expression);
      return Number.isSafeInteger(numeric) ? numeric : null;
    },
    resolveByteOperand: () => null,
  });
}

function ack(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const id of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, id);
  }
  return next;
}

function run(entry: string, context: BattleScriptRulesContext, seed = 1) {
  const execution = createBattleScriptStatusRulesExecution(program, entry, context, seed, ports());
  let state = execution.state;
  for (let guard = 0; guard < 1000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "halted") return result.state;
    state = result.kind === "blocked" ? ack(result.state) : result.state;
  }
  throw new Error(`${entry} did not terminate at pc ${state.programCounter} scheduler ${JSON.stringify(state.scheduler)}`);
}

describe("ranked Batch 1 source arithmetic", () => {
  it("scales Eruption/Water Spout at full and one HP with the source floor", () => {
    expect(scaledDamagePower(100, 100, 150)).toBe(150);
    expect(scaledDamagePower(1, 100, 150)).toBe(1);
    expect(scaledDamagePower(33, 100, 150)).toBe(49);
  });

  it("selects all seven Magnitude buckets at exact boundaries", () => {
    expect([0, 4, 5, 14, 15, 34, 35, 64, 65, 84, 85, 94, 95, 99].map(magnitudeForRoll))
      .toEqual([
        { magnitude: 4, power: 10 }, { magnitude: 4, power: 10 },
        { magnitude: 5, power: 30 }, { magnitude: 5, power: 30 },
        { magnitude: 6, power: 50 }, { magnitude: 6, power: 50 },
        { magnitude: 7, power: 70 }, { magnitude: 7, power: 70 },
        { magnitude: 8, power: 90 }, { magnitude: 8, power: 90 },
        { magnitude: 9, power: 110 }, { magnitude: 9, power: 110 },
        { magnitude: 10, power: 150 }, { magnitude: 10, power: 150 },
      ]);
  });

  it("floors Super Fang and clamps a one-HP target to one damage", () => {
    expect([1, 2, 3, 100, 101].map(halfTargetHpDamage)).toEqual([1, 1, 1, 50, 50]);
  });

  it("derives Hidden Power's exact degenerate and boundary IV vectors", () => {
    expect(hiddenPowerFromIvs({
      hp: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0,
    })).toEqual({ power: 30, type: 1, dynamicMoveType: 0xc1 });
    expect(hiddenPowerFromIvs({
      hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31,
    })).toEqual({ power: 70, type: 17, dynamicMoveType: 0xd1 });
    expect(hiddenPowerFromIvs({
      hp: 2, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0,
    })).toEqual({ power: 30, type: 1, dynamicMoveType: 0xc1 });
    expect(hiddenPowerFromIvs({
      hp: 3, attack: 2, defense: 2, speed: 2, spAttack: 2, spDefense: 2,
    })).toEqual({ power: 70, type: 1, dynamicMoveType: 0xc1 });
  });

  it("validates each IV as a frozen source 5-bit field", () => {
    const context = rules(237, {
      ivs: { hp: 1, attack: 2, defense: 3, speed: 4, spAttack: 5, spDefense: 6 },
    });
    expect(context.battlers[0].ivs).toEqual({
      hp: 1, attack: 2, defense: 3, speed: 4, spAttack: 5, spDefense: 6,
    });
    expect(Object.isFrozen(context.battlers[0].ivs)).toBe(true);
    expect(() => rules(237, {
      ivs: { hp: 32, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0 },
    })).toThrow("battlers[0].ivs.hp");
  });
});

describe("ranked Batch 1 committed scripts", () => {
  it.each([
    ["B_SCR_OP_SCALEDAMAGEBYHEALTHRATIO", "Cmd_scaledamagebyhealthratio", 0],
    ["B_SCR_OP_JUMPIFARRAYEQUAL", "Cmd_jumpifarrayequal", 4],
    ["B_SCR_OP_MAGNITUDEDAMAGECALCULATION", "Cmd_magnitudedamagecalculation", 0],
    ["B_SCR_OP_MAXATTACKHALVEHP", "Cmd_maxattackhalvehp", 1],
    ["B_SCR_OP_DAMAGETOHALFTARGETHP", "Cmd_damagetohalftargethp", 0],
    ["B_SCR_OP_HIDDENPOWERCALC", "Cmd_hiddenpowercalc", 0],
  ])("registers %s with its source dispatcher/shape", (name, dispatcher, operands) => {
    const instructions = program.instructions.filter((item) => item.opcodeName === name);
    expect(instructions).toHaveLength(1);
    expect(instructions[0]).toMatchObject({ dispatcher });
    expect(instructions[0]!.operands).toHaveLength(operands);
  });

  it("walks Eruption and Water Spout to their own terminal with four ordinary draws", () => {
    for (const move of [284, 323]) {
      const state = run("BattleScript_EffectEruption", rules(move), 7);
      expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(state.rng.calls).toBe(4);
    }
  });

  it("walks Super Fang to terminal with exactly accuracy + zero-effect draws", () => {
    const state = run("BattleScript_EffectSuperFang", rules(162, {}, { hp: 101, maxHP: 101 }), 7);
    expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(state.rng.calls).toBe(2);
  });

  it("Belly Drum succeeds above half, floors odd max HP, and fails at half/max stage", () => {
    const success = run("BattleScript_EffectBellyDrum", rules(187, { hp: 51, maxHP: 101 }), 7);
    expect(success.rulesContext.battlers[0].statStages[1]).toBe(12);
    expect(success.rulesContext.battlers[0].hp).toBe(1);
    const even = run("BattleScript_EffectBellyDrum", rules(187, { hp: 51, maxHP: 100 }), 7);
    expect(even.rulesContext.battlers[0].hp).toBe(1);
    for (const attacker of [
      { hp: 50, maxHP: 101 },
      { hp: 100, maxHP: 100, statStages: [6, 12, 6, 6, 6, 6, 6, 6] as const },
    ]) {
      const failed = run("BattleScript_EffectBellyDrum", rules(187, attacker), 7);
      expect(failed.rulesContext.battlers[0].hp).toBe(attacker.hp);
    }
  });

  it("Teeter Dance covers attacker skip, Own Tempo, existing confusion, and Substitute", () => {
    for (const target of [
      {},
      { ability: 20 },
      { status2: 1 << 28 },
      { status2: 1 << 24, substituteHP: 20 },
      { hp: 0, maxHP: 100 },
    ]) {
      const state = run("BattleScript_EffectTeeterDance", rules(298, {}, target), 7);
      expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    }
    const safeguarded = run(
      "BattleScript_EffectTeeterDance",
      rules(298, {}, {}, { sideStatuses: [0, 1 << 5] }),
      7,
    );
    expect(safeguarded.haltReason).toMatchObject({ kind: "terminal" });
  });

  it("Magnitude consumes one table draw before the ordinary hit path", () => {
    const state = run("BattleScript_EffectMagnitude", rules(222), 7);
    expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(state.rng.calls).toBe(4);
    expect(state.rulesContext.battleTextBuff1ByteNumber).toBeGreaterThanOrEqual(4);
  });

  it("Magnitude doubles the same seeded hit while its target is Underground", () => {
    const ordinary = run("BattleScript_EffectMagnitude", rules(222), 7);
    const underground = run(
      "BattleScript_EffectMagnitude",
      rules(222, {}, { status3: 1 << 7 }),
      7,
    );
    // Source doubles the base-damage multiplier before the later integer
    // damage formula, so its floors produce 41 versus 20 (not post-hoc 40).
    expect([ordinary.rulesContext.hpDealt, underground.rulesContext.hpDealt]).toEqual([20, 41]);
    expect(underground.rng.calls).toBe(ordinary.rng.calls);
  });

  it("Hidden Power walks to terminal with four shared-tail draws and frozen IV state", () => {
    const ivs = { hp: 31, attack: 30, defense: 31, speed: 30, spAttack: 31, spDefense: 30 };
    const state = run("BattleScript_EffectHiddenPower", rules(237, { ivs }), 7);
    expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(state.rng.calls).toBe(4);
    expect(state.rulesContext.dynamicBasePower).toBe(hiddenPowerFromIvs(ivs).power);
    expect(state.rulesContext.dynamicMoveType).toBe(hiddenPowerFromIvs(ivs).dynamicMoveType);
    expect(Object.isFrozen(state.rulesContext.battlers[0].ivs)).toBe(true);
  });
});
