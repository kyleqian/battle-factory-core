import { describe, expect, it } from "vitest";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_FAILED,
  BATTLE_SCRIPT_STATUS2_TRANSFORMED,
  BATTLE_SCRIPT_STATUS3_ON_AIR,
  BATTLE_SCRIPT_STATUS3_UNDERGROUND,
  BATTLE_SCRIPT_STATUS3_UNDERWATER,
} from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const TRANSFORM = 144;
const EXPLOSION = 153;
const TACKLE = 33;
const SPLASH = 150;
const DITTO = 132;
const SNORLAX = 143;
const UNAVAILABLE = 0xffff;

function battler(side: 0 | 1, changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side, ability: 7, hp: 100, maxHP: 111,
    moves: [TRANSFORM, TACKLE, SPLASH, 0], pp: [10, 35, 40, 0],
    status1: 0, status2: 0x400, status3: 0x200, substituteHP: 0,
    rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 99, disableTimer: 3, usedDisabledMove: 0,
    tauntTimer: 0, usedTauntedMove: 0, usedImprisonedMove: 0, item: 77,
    statStages: [1, 2, 3, 4, 5, 6, 7, 8], types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: DITTO, attack: 40, defense: 41, speed: 42, spAttack: 43, spDefense: 44,
    level: 50, friendship: 200, partyIndex: 0, personality: 15, experience: 125000,
    ivs: { hp: 1, attack: 2, defense: 3, speed: 4, spAttack: 5, spDefense: 6 },
    isEgg: false, abilityNum: 0, unknown: 0xaa, mimickedMoves: 0xb, ppBonuses: 0x55,
    transformedMonPersonality: 0xfeed_beef,
    ...changes,
  } as BattleScriptRulesBattler);
}

const targetLedger: Partial<BattleScriptRulesBattler> = Object.freeze({
  species: SNORLAX,
  attack: 161,
  defense: 84,
  speed: 49,
  spAttack: 83,
  spDefense: 128,
  moves: [EXPLOSION, TACKLE, SPLASH, 0] as const,
  pp: [1, 2, 3, 4] as const,
  ivs: { hp: 31, attack: 30, defense: 29, speed: 28, spAttack: 27, spDefense: 26 },
  isEgg: false,
  abilityNum: 1,
  statStages: [6, 7, 8, 9, 10, 11, 12, 5] as const,
  ability: 17,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  unknown: 0x5a,
  personality: 50,
  hp: 160,
  maxHP: 220,
  level: 50,
  friendship: 70,
  experience: 150000,
  status1: 0x8000,
  status2: 0x1000,
});

function rules(targetChanges: Partial<BattleScriptRulesBattler> = {}) {
  return createBattleScriptRulesContext({
    battlers: [
      battler(0),
      battler(1, { ...targetLedger, ...targetChanges }),
      battler(0),
      battler(1),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: TRANSFORM, currentMovePosition: 0, chosenMove: TRANSFORM,
    moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0,
    missType: 0, hitMarker: 0, multiHitCounter: 0,
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (context, operand) => operand.expression.startsWith("STRINGID_")
    ? Object.freeze({
      kind: "message" as const,
      messageId: operand.expression,
      substitutions: Object.freeze(
        operand.expression === "STRINGID_PKMNTRANSFORMEDINTO"
          ? [`SPECIES:${context.state.rulesContext.battleTextBuff1Species}`]
          : [],
      ),
    }) : null,
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) => operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
  resolveByteOperand: () => null,
});

function ack(state: BattleScriptMachineState<BattleScriptRulesContext>) {
  let next = state;
  for (const id of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, id);
  }
  return next;
}

function run(source: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectTransform", source, 0x1234_5678, ports,
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 300; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`Transform did not reach END: ${result.kind}`);
  if (result.state.haltReason?.kind !== "terminal") {
    throw new Error(`Transform did not reach move-end terminal: ${JSON.stringify(result.state.haltReason)}`);
  }
  return result.state;
}

describe("source-complete TRANSFORMDATAEXECUTION / EFFECT_TRANSFORM", () => {
  it("pins the sole zero-operand source opcode", () => {
    expect(program.instructions.filter(({ opcodeName }) => opcodeName === "B_SCR_OP_TRANSFORMDATAEXECUTION"))
      .toMatchObject([{ opcodeId: 0x9b, dispatcher: "Cmd_transformdataexecution", operands: [] }]);
  });

  it("reproduces the OFF receipt's complete copied ledger, post-boundary exclusions, PP reset, clears, species buffer, saved personality, and controller packet", () => {
    const source = rules();
    const state = run(source);
    const before = source.battlers[0];
    const after = state.rulesContext.battlers[0];
    const target = source.battlers[1];

    // Raw BattlePokemon [0x00,0x24), field-for-field.
    expect({
      species: after.species,
      stats: [after.attack, after.defense, after.speed, after.spAttack, after.spDefense],
      moves: after.moves,
      ivs: after.ivs,
      isEgg: after.isEgg,
      abilityNum: after.abilityNum,
      statStages: after.statStages,
      ability: after.ability,
      types: after.types,
      unknown: after.unknown,
    }).toEqual({
      species: target.species,
      stats: [161, 84, 49, 83, 128],
      moves: [EXPLOSION, TACKLE, SPLASH, 0],
      ivs: target.ivs,
      isEgg: target.isEgg,
      abilityNum: 1,
      statStages: target.statStages,
      ability: 17,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      unknown: 0x5a,
    });
    expect(after.pp).toEqual([5, 5, 5, 0]);

    // Every receipt-named field after byte 0x24 remains the user's own.
    expect({
      hp: after.hp, maxHP: after.maxHP, level: after.level,
      friendship: after.friendship, item: after.item, ppBonuses: after.ppBonuses,
      experience: after.experience, personality: after.personality, status1: after.status1,
    }).toEqual({
      hp: before.hp, maxHP: before.maxHP, level: before.level,
      friendship: before.friendship, item: before.item, ppBonuses: before.ppBonuses,
      experience: before.experience, personality: 15, status1: before.status1,
    });
    expect(after.status2).toBe((before.status2 | BATTLE_SCRIPT_STATUS2_TRANSFORMED) >>> 0);
    expect(after.disabledMove).toBe(0);
    expect(after.disableTimer).toBe(0);
    expect(after.mimickedMoves).toBe(0);
    expect(after.transformedMonPersonality).toBe(50);
    expect(state.rulesContext.chosenMove).toBe(UNAVAILABLE);
    expect(state.rulesContext.battleTextBuff1Species).toBe(SNORLAX);
    expect(state.events).toContainEqual(expect.objectContaining({
      kind: "reset-action-move-selection", battler: 0,
      reset: "move-selection", command: 54, argument: 2,
    }));
    expect(state.events).toContainEqual(expect.objectContaining({
      kind: "message", messageId: "STRINGID_PKMNTRANSFORMEDINTO",
      substitutions: [`SPECIES:${SNORLAX}`],
    }));
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it.each([
    ["already transformed", { status2: BATTLE_SCRIPT_STATUS2_TRANSFORMED }],
    ["on air", { status3: BATTLE_SCRIPT_STATUS3_ON_AIR }],
    ["underground", { status3: BATTLE_SCRIPT_STATUS3_UNDERGROUND }],
    ["underwater", { status3: BATTLE_SCRIPT_STATUS3_UNDERWATER }],
  ])("fails for a target that is %s, prints table index 1, reaches move end, and still makes chosenMove unavailable", (_name, targetChanges) => {
    const source = rules(targetChanges);
    const state = run(source);
    expect(state.rulesContext.battlers[0]).toMatchObject({
      species: source.battlers[0].species,
      moves: source.battlers[0].moves,
      ability: source.battlers[0].ability,
      status2: source.battlers[0].status2,
      transformedMonPersonality: source.battlers[0].transformedMonPersonality,
    });
    expect(state.rulesContext.chosenMove).toBe(UNAVAILABLE);
    expect(state.rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_FAILED).toBeTruthy();
    expect(state.rulesContext.multistringChooser).toBe(1);
    expect(state.events).toContainEqual(expect.objectContaining({
      kind: "message", messageId: "STRINGID_BUTITFAILED",
    }));
    expect(state.events.some(({ kind }) => kind === "reset-action-move-selection")).toBe(false);
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });
});
