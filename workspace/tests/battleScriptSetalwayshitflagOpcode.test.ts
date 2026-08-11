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
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";
import { BATTLE_SCRIPT_STATUS3_ALWAYS_HITS_TURN_2 } from "../src/engine/battleScriptSetalwayshitflagOpcode.ts";

const program = loadBattleScriptProgram();
const LOCK_ON = 199;
const MIND_READER = 170;
const ZAP_CANNON = 192;
const TACKLE = 33;
/** Granbull has the same ability in both source slots. */
const GRANBULL = 210;

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
  resolveHalfwordOperand: (_context, operand) =>
    operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
  resolveByteOperand: () => null,
});

function battler(side: 0 | 1, changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side,
    ability: 22,
    hp: 200,
    maxHP: 200,
    moves: changes.moves ?? [LOCK_ON, ZAP_CANNON, TACKLE, 0] as const,
    pp: changes.pp ?? [5, 5, 35, 0] as const,
    status1: 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
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
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    species: GRANBULL,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: 0,
    battlerWithSureHit: changes.battlerWithSureHit,
  });
}

function rules(move: number, position: number, targetChanges: Partial<BattleScriptRulesBattler> = {}) {
  return createBattleScriptRulesContext({
    battlers: [
      battler(0, { moves: [move, ZAP_CANNON, TACKLE, 0] }),
      battler(1, targetChanges),
      battler(0),
      battler(1),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: move,
    currentMovePosition: position,
    chosenMove: move,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: 1 << 19,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
}

function ack(state: BattleScriptMachineState<BattleScriptRulesContext>) {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

function run(label: string, context: BattleScriptRulesContext, seed: number) {
  const execution = createBattleScriptStatusRulesExecution(program, label, context, seed, ports);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 500; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`${label} did not halt`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result.state;
}

describe("source-complete B_SCR_OP_SETALWAYSHITFLAG / Lock On and Mind Reader", () => {
  it("pins the sole opcode and maps both moves to EFFECT_LOCK_ON", () => {
    expect(program.instructions.filter(({ opcodeName }) => opcodeName === "B_SCR_OP_SETALWAYSHITFLAG"))
      .toMatchObject([{
        opcodeId: 0xa7,
        dispatcher: "Cmd_setalwayshitflag",
        operands: [],
        source: { label: "BattleScript_EffectLockOn" },
      }]);
    for (const move of [LOCK_ON, MIND_READER]) {
      const state = run("BattleScript_EffectLockOn", rules(move, 0), 0xa15ab8e2);
      expect(state.rulesContext.battlers[1]).toMatchObject({
        status3: BATTLE_SCRIPT_STATUS3_ALWAYS_HITS_TURN_2,
        battlerWithSureHit: 0,
      });
      expect(state.rng.calls).toBe(1);
    }
  });

  it("replaces the packed counter, preserves unrelated status3, and records attacker identity", () => {
    const state = run(
      "BattleScript_EffectLockOn",
      rules(LOCK_ON, 0, { status3: (1 << 3) | (1 << 10), battlerWithSureHit: 1 }),
      0xa15ab8e2,
    );
    expect(state.rulesContext.battlers[1]).toMatchObject({
      status3: BATTLE_SCRIPT_STATUS3_ALWAYS_HITS_TURN_2 | (1 << 10),
      battlerWithSureHit: 0,
    });
  });

  it("matches the OFF receipt shape: setter draws once, then owned Zap Cannon skips accuracy but keeps later draws", () => {
    const lock = run("BattleScript_EffectLockOn", rules(LOCK_ON, 0), 0xa15ab8e2);
    expect(lock.rng.calls).toBe(1);
    const consumeRules = Object.freeze({
      ...lock.rulesContext,
      currentMove: ZAP_CANNON,
      chosenMove: ZAP_CANNON,
      currentMovePosition: 1,
      moveResultFlags: 0,
    });
    const hit = run("BattleScript_EffectHit", consumeRules, lock.rng.value);
    expect(hit.rng.calls).toBe(3);
    expect(hit.rng.ledger).toHaveLength(3);
  });

  it("Substitute rejection occurs before accuracy and setter, consuming PP but zero RNG", () => {
    const state = run(
      "BattleScript_EffectLockOn",
      rules(LOCK_ON, 0, {
        status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE,
        substituteHP: 40,
      }),
      0xa15ab8e2,
    );
    expect(state.rng.calls).toBe(0);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(4);
    expect(state.rulesContext.battlers[1].status3).toBe(0);
  });
});
