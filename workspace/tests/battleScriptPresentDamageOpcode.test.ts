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
  createBattleScriptMachine,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import { createBattleScriptPresentDamageOpcodeHandlers } from "../src/engine/battleScriptPresentDamageOpcode.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const program = loadBattleScriptProgram();
const PRESENT = 217;
const instruction = program.instructions.find(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_PRESENTDAMAGECALCULATION",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 200,
    maxHP: changes.maxHP ?? 200,
    moves: changes.moves ?? [PRESENT, 0, 0, 0],
    pp: changes.pp ?? [15, 0, 0, 0],
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
    types: changes.types ?? ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: changes.species ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  } as BattleScriptRulesBattler);
}

function rules(target: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [battler(), battler({ side: 1, ...target }), battler(), battler({ side: 1 })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: PRESENT,
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

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (_context, operand) => operand.expression.startsWith("STRINGID_")
    ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
    : null,
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) =>
    operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
  resolveByteOperand: () => null,
});

function ack(state: BattleScriptMachineState<BattleScriptRulesContext>) {
  let next = state;
  for (const id of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, id);
  }
  return next;
}

function runToEnd(rc: BattleScriptRulesContext, seed: number) {
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectPresent", rc, seed, ports,
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 500; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`Present did not reach END: ${result.kind}`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result.state;
}

function seedForPresentByte(byte: number, includeAccuracy = false): number {
  for (let seed = 0; seed < 2_000_000; seed += 1) {
    let value = advanceRngValue(seed);
    if (includeAccuracy) {
      if ((((value >>> 16) & 0xffff) % 100) >= 90) continue;
      value = advanceRngValue(value);
    }
    if ((((value >>> 16) & 0xffff) & 0xff) === byte) return seed;
  }
  throw new Error(`no seed found for Present byte ${byte}`);
}

function direct(byte: number, target: Partial<BattleScriptRulesBattler> = {}) {
  const seed = seedForPresentByte(byte);
  const initial = createBattleScriptMachine(program, "BattleScript_EffectPresent", rules(target), seed);
  const state = Object.freeze({ ...initial, programCounter: instruction.programCounter });
  const result = stepBattleScriptMachine(
    program, state, createBattleScriptPresentDamageOpcodeHandlers(program),
  );
  if (result.kind !== "advanced") throw new Error(`direct Present result: ${result.kind}`);
  return result.state;
}

describe("source-complete PRESENTDAMAGECALCULATION / EFFECT_PRESENT", () => {
  it("pins the sole opcode shape and every exact Random() band boundary", () => {
    expect(instruction).toMatchObject({
      opcodeId: 0xb7,
      dispatcher: "Cmd_presentdamagecalculation",
      operands: [],
      source: { label: "BattleScript_EffectPresent" },
    });
    for (const [byte, power] of [[0, 40], [101, 40], [102, 80], [177, 80], [178, 120], [203, 120]] as const) {
      const state = direct(byte);
      expect(state.rulesContext.dynamicBasePower).toBe(power);
      expect(state.rng.calls).toBe(1);
      expect(state.rng.ledger[0]).toMatchObject({
        reason: "Cmd_presentdamagecalculation: Random() & 0xFF outcome",
        randomValue: expect.any(Number),
      });
    }
  });

  it("heal draw 204 uses negative floor(maxHP/4), minimum 1, clears only immunity, and jumps to the shared heal tail", () => {
    const state = direct(204, { hp: 2, maxHP: 3 });
    expect(state.rulesContext.battleMoveDamage).toBe(-1);
    expect(state.programCounter).toBe(resolveBattleScriptLabel(program, "BattleScript_PresentHealTarget")!.programCounter);
    expect(state.rng.calls).toBe(1);
  });

  it("full-HP heal draw 255 writes the heal amount then takes AlreadyAtFullHp", () => {
    const state = direct(255, { hp: 201, maxHP: 201 });
    expect(state.rulesContext.battleMoveDamage).toBe(-50);
    expect(state.programCounter).toBe(resolveBattleScriptLabel(program, "BattleScript_AlreadyAtFullHp")!.programCounter);
    expect(state.rng.calls).toBe(1);
  });

  it("damage path walks the committed shared hit chain to END with the exact five-draw ledger", () => {
    const state = runToEnd(rules({ hp: 500, maxHP: 500 }), seedForPresentByte(102, true));
    expect(state.rulesContext.battlers[1].hp).toBeLessThan(500);
    expect(state.rng.ledger.map(({ reason }) => reason)).toEqual([
      "accuracycheck",
      "Cmd_presentdamagecalculation: Random() & 0xFF outcome",
      "critcalc",
      "adjustnormaldamage",
      "seteffectwithchance",
    ]);
  });

  it("heal and full-HP failure paths both walk to END with exactly accuracy+Present draws", () => {
    const seed = seedForPresentByte(204, true);
    const healed = runToEnd(rules({ hp: 100, maxHP: 200 }), seed);
    expect(healed.rulesContext.battlers[1].hp).toBe(150);
    expect(healed.rng.calls).toBe(2);
    const full = runToEnd(rules({ hp: 200, maxHP: 200 }), seed);
    expect(full.rulesContext.battlers[1].hp).toBe(200);
    expect(full.rng.calls).toBe(2);
  });

  it("canonical replay is exact, including RNG ledger and terminal state", () => {
    const seed = seedForPresentByte(178, true);
    expect(runToEnd(rules({ hp: 500, maxHP: 500 }), seed))
      .toEqual(runToEnd(rules({ hp: 500, maxHP: 500 }), seed));
  });
});
