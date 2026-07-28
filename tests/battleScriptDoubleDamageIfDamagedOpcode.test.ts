import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import type { BattleScriptBattlerId } from "../src/engine/battleScriptEvents.ts";

const REVENGE = 279;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0, ability: changes.ability ?? 0,
    hp: changes.hp ?? 100, maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? ([REVENGE, 0, 0, 0] as const),
    pp: changes.pp ?? ([10, 0, 0, 0] as const),
    status1: changes.status1 ?? 0, status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0, substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0, furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0, rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0, usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0, usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0, item: changes.item ?? 0,
    statStages: changes.statStages ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_FIGHTING", "TYPE_FIGHTING"] as const),
    species: changes.species ?? 67, personality: changes.personality ?? 1,
    attack: changes.attack ?? 100, defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100, spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100, level: changes.level ?? 50,
    friendship: changes.friendship ?? 70, partyIndex: changes.partyIndex ?? 0,
    protectPhysicalDmg: changes.protectPhysicalDmg ?? 0,
    protectPhysicalBattlerId: changes.protectPhysicalBattlerId ?? 0,
    protectSpecialDmg: changes.protectSpecialDmg ?? 0,
    protectSpecialBattlerId: changes.protectSpecialBattlerId ?? 0,
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true, prepareMessage: () => null,
  prepareSelectionMessage: () => null, prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null, resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: () => null, resolveByteOperand: () => null,
});

function step(
  receipt: Partial<BattleScriptRulesBattler>,
  multiplier: number,
  target: BattleScriptBattlerId = 1,
) {
  const rules = createBattleScriptRulesContext({
    battlers: [
      battler(receipt), battler({ side: 1, species: 113 }),
      battler({ hp: 0 }), battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target, effectBattler: target, fainted: null },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: REVENGE, currentMovePosition: 0, moveResultFlags: 0,
    dmgMultiplier: multiplier, critMultiplier: 1, moveEffectByte: 0,
    missType: 0, hitMarker: 0, multiHitCounter: 0,
  });
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectRevenge", rules, 0x1234_5678, ports,
  );
  const before = Object.freeze({ ...execution.state, programCounter: instruction.programCounter });
  const result = stepBattleScriptMachine(program, before, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`Revenge opcode stopped at ${result.kind}`);
  return { before, after: result.state };
}

describe("source-complete B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED registration", () => {
  it("pins the sole operand-free one-byte 0xd6 instruction", () => {
    expect(program.instructions.filter(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xd6, dispatcher: "Cmd_doubledamagedealtifdamaged",
      operands: [], source: { label: "BattleScript_EffectRevenge" },
    });
    expect(1 + instruction.operands.reduce((sum, operand) => sum + operand.widthBytes, 0)).toBe(1);
  });

  it.each([
    ["zero damage", {}, false],
    ["physical owner mismatch", { protectPhysicalDmg: 9, protectPhysicalBattlerId: 2 }, false],
    ["special owner mismatch", { protectSpecialDmg: 11, protectSpecialBattlerId: 2 }, false],
    ["physical match", { protectPhysicalDmg: 9, protectPhysicalBattlerId: 1 }, true],
    ["special match", { protectSpecialDmg: 11, protectSpecialBattlerId: 1 }, true],
    ["both match", {
      protectPhysicalDmg: 9, protectPhysicalBattlerId: 1,
      protectSpecialDmg: 11, protectSpecialBattlerId: 1,
    }, true],
    ["only physical matches", {
      protectPhysicalDmg: 9, protectPhysicalBattlerId: 1,
      protectSpecialDmg: 11, protectSpecialBattlerId: 2,
    }, true],
    ["only special matches", {
      protectPhysicalDmg: 9, protectPhysicalBattlerId: 2,
      protectSpecialDmg: 11, protectSpecialBattlerId: 1,
    }, true],
  ] as const)("%s preserves or doubles an arbitrary incoming multiplier", (_name, receipt, success) => {
    const { before, after } = step(receipt, 7);
    expect(after.programCounter).toBe(instruction.programCounter + 1);
    expect(after.rulesContext.dmgMultiplier).toBe(success ? 2 : 7);
    expect(after.rulesContext).toEqual({
      ...before.rulesContext,
      dmgMultiplier: success ? 2 : 7,
    });
    expect(after.rng).toBe(before.rng);
    expect(after.events).toBe(before.events);
    expect(after.scheduler).toBe(before.scheduler);
  });

  it("uses the current target, not merely an opponent-side receipt", () => {
    const oppositeTarget = step(
      { protectPhysicalDmg: 9, protectPhysicalBattlerId: 1 },
      13,
      3,
    );
    expect(oppositeTarget.after.rulesContext.dmgMultiplier).toBe(13);
  });
});
