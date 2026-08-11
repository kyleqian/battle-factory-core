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
  BATTLE_SCRIPT_ENVIRONMENT_TYPES,
  conversion2FallbackTypeWithStaleIndexBug,
} from "../src/engine/battleScriptTypeChangeOpcode.ts";

const program = loadBattleScriptProgram();
const CONVERSION = 160;
const CONVERSION_2 = 176;
const CAMOUFLAGE = 293;
const BIDE = 117;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0, ability: 1, hp: 100, maxHP: 100,
    moves: changes.moves ?? [CONVERSION, 1, 52, 0],
    pp: changes.pp ?? [30, 35, 25, 0],
    status1: 0, status2: changes.status2 ?? 0, status3: 0, substituteHP: 0,
    rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0,
    usedTauntedMove: 0, usedImprisonedMove: 0, item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: 1, attack: 100, defense: 100, spAttack: 100, spDefense: 100,
    speed: 100, level: 50, friendship: 70, partyIndex: 0,
  } as BattleScriptRulesBattler);
}

function rules(
  move: number,
  changes: {
    attacker?: Partial<BattleScriptRulesBattler>;
    source?: Partial<BattleScriptRulesBattler>;
    lastMove?: number;
    lastType?: number;
    environment?: number;
  } = {},
) {
  return createBattleScriptRulesContext({
    battlers: [
      battler(changes.attacker),
      battler({ side: 1, moves: [1, 0, 0, 0], pp: [35, 0, 0, 0], ...changes.source }),
      battler(),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: move, currentMovePosition: 0, chosenMove: move,
    moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0,
    missType: 0, hitMarker: 0, multiHitCounter: 0,
    gBattleEnvironment: changes.environment ?? 8,
    moveHistory: {
      lastLandedMoves: [changes.lastMove ?? 1, 0, 0, 0],
      lastHitByType: [changes.lastType ?? 0, 0, 0, 0],
      lastHitBy: [1, 0, 0, 0],
    },
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (_context, operand) => operand.expression.startsWith("STRINGID_")
    ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
    : null,
  prepareSelectionMessage: () => null, prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null, resolveBattlerAtPosition: () => null,
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

function run(entry: string, context: BattleScriptRulesContext, seed: number) {
  const execution = createBattleScriptStatusRulesExecution(program, entry, context, seed, ports);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 2500; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`${entry} did not halt: ${result.kind}`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result.state;
}

describe("source-complete Conversion type-change setters", () => {
  it("Conversion rejects a current-type draw, then writes both types and the exact typed buffer", () => {
    const state = run("BattleScript_EffectConversion", rules(CONVERSION, {
      attacker: { moves: [CONVERSION, 52, 1, 0], types: ["TYPE_NORMAL", "TYPE_NORMAL"] },
    }), 1);
    expect(state.rulesContext.battlers[0].types).toEqual(["TYPE_FIRE", "TYPE_FIRE"]);
    expect(state.rulesContext.battleTextBuff1Type).toBe("TYPE_FIRE");
    expect(state.rng.ledger).toMatchObject([
      { call: 1, reason: "conversion-move-slot", randomValue: 16838 },
      { call: 2, reason: "conversion-move-slot", randomValue: 44065 },
    ]);
  });

  it("Conversion's already-same-type failure draws zero and the complete script reaches END", () => {
    const state = run("BattleScript_EffectConversion", rules(CONVERSION, {
      attacker: { moves: [CONVERSION, 1, 0, 0], types: ["TYPE_NORMAL", "TYPE_NORMAL"] },
    }), 1);
    expect(state.rulesContext.battleTextBuff1Type).toBeNull();
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it("Conversion 2 has exact one-draw and two-draw resistance samples", () => {
    const one = run("BattleScript_EffectConversion2", rules(CONVERSION_2, {
      attacker: { moves: [CONVERSION_2, 0, 0, 0], pp: [30, 0, 0, 0] },
      lastType: 11,
    }), 2);
    expect(one.rulesContext.battleTextBuff1Type).toBe("TYPE_GRASS");
    expect(one.rng.ledger).toHaveLength(1);

    const two = run("BattleScript_EffectConversion2", rules(CONVERSION_2, {
      attacker: { moves: [CONVERSION_2, 0, 0, 0], pp: [30, 0, 0, 0] },
      lastType: 2,
    }), 2);
    expect(two.rulesContext.battleTextBuff1Type).toBe("TYPE_ROCK");
    expect(two.rng.ledger).toMatchObject([
      { call: 1, randomValue: 33676 },
      { call: 2, randomValue: 28355 },
    ]);
  });

  it("Conversion 2 no-history and live two-turn histories fail without RNG", () => {
    const none = run("BattleScript_EffectConversion2", rules(CONVERSION_2, { lastMove: 0 }), 1);
    const twoTurn = run("BattleScript_EffectConversion2", rules(CONVERSION_2, {
      lastMove: BIDE, source: { status2: 1 << 12 },
    }), 1);
    expect(none.rng.calls).toBe(0);
    expect(twoTurn.rng.calls).toBe(0);
  });

  it("pins Emerald's stale-i Conversion 2 fallback bug by name", () => {
    // Water's deterministic first resistance is Grass. A stale row whose
    // defensive type is already Grass suppresses every candidate in source.
    expect(conversion2FallbackTypeWithStaleIndexBug(
      "TYPE_WATER", ["TYPE_GRASS", "TYPE_NORMAL"], 12,
    )).toBeNull();
    expect(conversion2FallbackTypeWithStaleIndexBug(
      "TYPE_WATER", ["TYPE_FIRE", "TYPE_NORMAL"], 12,
    )).toBe("TYPE_WATER");
  });

  it("Conversion 2 exhausts 1,000 accepted attempts, rejection-draws unboundedly, then runs fallback", () => {
    const state = run("BattleScript_EffectConversion2", rules(CONVERSION_2, {
      attacker: { moves: [CONVERSION_2, 0, 0, 0], pp: [30, 0, 0, 0] },
      lastType: 9,
    }), 1);
    expect(state.rulesContext.battleTextBuff1Type).toBeNull();
    expect(state.rng.calls).toBe(1140);
    expect(state.rng.ledger[0]).toMatchObject({
      call: 1, reason: "conversion2-resistance-row", randomValue: 16838,
    });
    expect(state.rng.ledger.at(-1)).toMatchObject({
      call: 1140, reason: "conversion2-resistance-row", randomValue: 41163,
    });
  });

  it("Camouflage maps all source environments and Factory Building to Normal", () => {
    expect(BATTLE_SCRIPT_ENVIRONMENT_TYPES).toEqual([
      "TYPE_GRASS", "TYPE_GRASS", "TYPE_GROUND", "TYPE_WATER", "TYPE_WATER",
      "TYPE_WATER", "TYPE_ROCK", "TYPE_ROCK", "TYPE_NORMAL", "TYPE_NORMAL",
    ]);
    const state = run("BattleScript_EffectCamouflage", rules(CAMOUFLAGE, {
      attacker: { moves: [CAMOUFLAGE, 0, 0, 0], pp: [20, 0, 0, 0], types: ["TYPE_FIRE", "TYPE_FIRE"] },
      environment: 8,
    }), 1);
    expect(state.rulesContext.battlers[0].types).toEqual(["TYPE_NORMAL", "TYPE_NORMAL"]);
    expect(state.rulesContext.battleTextBuff1Type).toBe("TYPE_NORMAL");
    expect(state.rng.calls).toBe(0);
  });

  it("Camouflage already-that-type fails and canonical replay is exact", () => {
    const input = rules(CAMOUFLAGE, {
      attacker: { moves: [CAMOUFLAGE, 0, 0, 0], pp: [20, 0, 0, 0] },
    });
    const first = run("BattleScript_EffectCamouflage", input, 1);
    const replay = run("BattleScript_EffectCamouflage", input, 1);
    expect(replay).toEqual(first);
    expect(first.rulesContext.battleTextBuff1Type).toBeNull();
    expect(first.rng.calls).toBe(0);
  });
});
