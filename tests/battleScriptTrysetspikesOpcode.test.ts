import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";

const SPIKES = 191;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSETSPIKES")!;
const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: () => null,
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: () => null,
  resolveByteOperand: () => null,
});

function battler(side: 0 | 1, changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side, ability: 0, hp: 100, maxHP: 100,
    moves: [SPIKES, 0, 0, 0] as const, pp: [20, 0, 0, 0] as const,
    status1: 0, status2: 0, status3: 0, substituteHP: 0,
    rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0,
    rechargeTimer: 0, flinchImmobility: 0, disabledMove: 0,
    usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0, statStages: [6, 6, 6, 6, 6, 6, 6, 6] as const,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const, species: 1,
    attack: 100, defense: 100, spAttack: 100, spDefense: 100,
    speed: 100, level: 50, friendship: 70, partyIndex: 0,
    ...changes,
  });
}

function step(attacker: 0 | 1, amount: number) {
  const rules = createBattleScriptRulesContext({
    battlers: [battler(0), battler(1), battler(0, { hp: 0 }), battler(1, { hp: 0 })],
    selectorRoles: { attacker, target: attacker === 0 ? 1 : 0, effectBattler: null, fainted: null },
    scriptingBattler: attacker, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: SPIKES, currentMovePosition: 0, moveResultFlags: 0,
    dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0,
    hitMarker: 0, multiHitCounter: 0,
    sideStatuses: [0x100, 0x100],
    sideTimers: [{ spikesAmount: attacker === 1 ? amount : 7 }, { spikesAmount: attacker === 0 ? amount : 7 }],
  });
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectSpikes", rules, 0x1234_5678, ports,
  );
  const before = Object.freeze({ ...execution.state, programCounter: instruction.programCounter });
  const result = stepBattleScriptMachine(program, before, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`trysetspikes stopped at ${result.kind}`);
  return { rules, before, after: result.state };
}

describe("source-complete B_SCR_OP_TRYSETSPIKES registration", () => {
  it("registers the sole five-byte 0xb0 start and exact failure pointer", () => {
    expect(program.instructions.filter(({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSETSPIKES"))
      .toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xb0,
      dispatcher: "Cmd_trysetspikes",
      operands: [{ widthBytes: 4, expression: "BattleScript_FailedFromAtkString" }],
      source: { label: "BattleScript_EffectSpikes" },
    });
    expect(1 + instruction.operands.reduce((sum, operand) => sum + operand.widthBytes, 0)).toBe(5);
  });

  it.each([
    [0, 1], [1, 2], [2, 3],
  ] as const)("advances normal layer %i -> %i and sets only the attacker-opposite side", (amount, next) => {
    for (const attacker of [0, 1] as const) {
      const { rules, before, after } = step(attacker, amount);
      const targetSide = attacker === 0 ? 1 : 0;
      const ownSide = attacker as 0 | 1;
      expect(after.programCounter).toBe(instruction.programCounter + 1);
      expect(after.rulesContext.sideTimers[targetSide].spikesAmount).toBe(next);
      expect(after.rulesContext.sideStatuses[targetSide] & (1 << 4)).toBe(1 << 4);
      expect(after.rulesContext.sideTimers[ownSide]).toBe(rules.sideTimers[ownSide]);
      expect(after.rulesContext.sideStatuses[ownSide]).toBe(rules.sideStatuses[ownSide]);
      expect(after.rng).toBe(before.rng);
      expect(after.events).toBe(before.events);
      expect(after.scheduler).toBe(before.scheduler);
    }
  });

  it("fails only at exactly three, marks the attacker Pressure-exempt, and jumps without side mutation", () => {
    const { rules, before, after } = step(1, 3);
    expect(after.programCounter).toBe(resolveBattleScriptLabel(program, "BattleScript_FailedFromAtkString")!.programCounter);
    expect(after.rulesContext.battlers[1].ppNotAffectedByPressure).toBe(1);
    expect(after.rulesContext.battlers[0]).toBe(rules.battlers[0]);
    expect(after.rulesContext.sideStatuses).toBe(rules.sideStatuses);
    expect(after.rulesContext.sideTimers).toBe(rules.sideTimers);
    expect(after.rng).toBe(before.rng);
    expect(after.events).toBe(before.events);
    expect(after.scheduler).toBe(before.scheduler);
  });

  it.each([[4, 5], [254, 255], [255, 0]] as const)(
    "preserves source's representable corrupt u8 equality behavior %i -> %i",
    (amount, next) => {
      const { after } = step(0, amount);
      expect(after.programCounter).toBe(instruction.programCounter + 1);
      expect(after.rulesContext.sideTimers[1].spikesAmount).toBe(next);
    },
  );

  it("initializes both layer counters to zero and validates their u8 boundary", () => {
    const zero = createBattleScriptRulesContext({
      battlers: [battler(0), battler(1), battler(0), battler(1)],
      selectorRoles: {}, scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
      currentMove: SPIKES, currentMovePosition: 0, moveResultFlags: 0,
      dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0,
      hitMarker: 0, multiHitCounter: 0,
    });
    expect(zero.sideTimers.map(({ spikesAmount }) => spikesAmount)).toEqual([0, 0]);
    expect(() => createBattleScriptRulesContext({
      ...zero, battlers: zero.battlers, sideTimers: [{ spikesAmount: 256 }, {}],
    })).toThrow(/spikesAmount/);
  });
});
