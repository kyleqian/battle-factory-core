import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  lowKickPowerForWeight,
  sourceSpeciesWeightHectograms,
} from "../src/engine/battleScriptWeightDamageOpcode.ts";

const LOW_KICK = 67;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_WEIGHTDAMAGECALCULATION",
)!;

function battler(
  species: number,
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0, ability: changes.ability ?? 0,
    hp: changes.hp ?? 100, maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? ([LOW_KICK, 0, 0, 0] as const),
    pp: changes.pp ?? ([20, 0, 0, 0] as const),
    status1: changes.status1 ?? 0, status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0, substituteHP: changes.substituteHP ?? 0,
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
    statStages: changes.statStages ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species, personality: changes.personality ?? 1,
    attack: changes.attack ?? 100, defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100, spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100, level: changes.level ?? 50,
    friendship: changes.friendship ?? 70, partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(target: 0 | 1, targetSpecies: number) {
  return createBattleScriptRulesContext({
    battlers: [
      battler(target === 0 ? targetSpecies : 67),
      battler(target === 1 ? targetSpecies : 113, { side: 1 }),
      battler(1, { hp: 0 }),
      battler(143, { side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target, effectBattler: target, fainted: null },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: LOW_KICK, currentMovePosition: 0, moveResultFlags: 0,
    dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0,
    hitMarker: 0, multiHitCounter: 0, dynamicBasePower: 777,
  });
}

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

function stepOpcode(target: 0 | 1, targetSpecies: number) {
  const source = rules(target, targetSpecies);
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectLowKick", source, 0x1234_5678, ports,
  );
  const before = Object.freeze({
    ...execution.state,
    programCounter: instruction.programCounter,
  });
  const result = stepBattleScriptMachine(program, before, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`weight opcode stopped at ${result.kind}`);
  return { source, before, after: result.state };
}

describe("source-complete B_SCR_OP_WEIGHTDAMAGECALCULATION registration", () => {
  it("registers the sole operand-free 0xdd start with exact one-byte fallthrough", () => {
    expect(program.instructions.filter(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_WEIGHTDAMAGECALCULATION",
    )).toEqual([instruction]);
    expect(instruction).toMatchObject({
      opcodeId: 0xdd,
      dispatcher: "Cmd_weightdamagecalculation",
      operands: [],
      source: { label: "BattleScript_EffectLowKick" },
    });
    expect(1 + instruction.operands.reduce(
      (sum, operand) => sum + operand.widthBytes, 0,
    )).toBe(1);
    expect(stepOpcode(1, 113).after.programCounter)
      .toBe(instruction.programCounter + 1);
  });

  it.each([
    [0, 20], [99, 20], [100, 40], [249, 40],
    [250, 60], [499, 60], [500, 80], [999, 80],
    [1000, 100], [1999, 100], [2000, 120], [9999, 120],
  ] as const)("maps strict source boundary %i hg to %i power", (weight, power) => {
    expect(lowKickPowerForWeight(weight)).toBe(power);
  });

  it("reads arbitrary source-derived species rows rather than curated move cases", () => {
    expect(sourceSpeciesWeightHectograms(1)).toBe(69);
    expect(sourceSpeciesWeightHectograms(113)).toBe(346);
    expect(sourceSpeciesWeightHectograms(143)).toBe(4600);
    expect(sourceSpeciesWeightHectograms(300)).toBe(596);
    expect(sourceSpeciesWeightHectograms(386)).toBe(177);
  });

  it.each([
    [1, 20], [386, 40], [113, 60], [300, 80], [95, 120],
  ] as const)("uses target species %i through the generated catalog", (species, power) => {
    const { after } = stepOpcode(1, species);
    expect(after.rulesContext.dynamicBasePower).toBe(power);
  });

  it("owns only the selected target lookup and immutable dynamic-power write", () => {
    const targetZero = stepOpcode(0, 1);
    const targetOne = stepOpcode(1, 143);
    expect(targetZero.after.rulesContext.dynamicBasePower).toBe(20);
    expect(targetOne.after.rulesContext.dynamicBasePower).toBe(120);
    expect(targetZero.after.rulesContext.battlers).toBe(targetZero.source.battlers);
    expect(targetOne.after.rulesContext.battlers).toBe(targetOne.source.battlers);
    expect(targetOne.after.rulesContext.selectorRoles).toBe(
      targetOne.source.selectorRoles,
    );
    expect(targetOne.after.rng).toBe(targetOne.before.rng);
    expect(targetOne.after.events).toBe(targetOne.before.events);
    expect(targetOne.after.scheduler).toBe(targetOne.before.scheduler);
    expect(Object.isFrozen(targetOne.after.rulesContext)).toBe(true);
  });
});
