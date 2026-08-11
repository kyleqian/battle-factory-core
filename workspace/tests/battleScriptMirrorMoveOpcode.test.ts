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

const program = loadBattleScriptProgram();
const MIRROR_MOVE = 119;
const SPLASH = 150;
const SNATCH = 289;
const PRESSURE = 46;

function battler(side: 0 | 1, changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side, ability: changes.ability ?? 1, hp: 100, maxHP: 100,
    moves: changes.moves ?? [MIRROR_MOVE, 0, 0, 0], pp: changes.pp ?? [20, 0, 0, 0],
    status1: 0, status2: 0, status3: 0, substituteHP: 0,
    rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0,
    usedTauntedMove: 0, usedImprisonedMove: 0, item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6], types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: 1, attack: 100, defense: 100, spAttack: 100, spDefense: 100,
    speed: 100, level: 50, friendship: 70, partyIndex: 0,
  } as BattleScriptRulesBattler);
}

function packed(length: number, writes: ReadonlyArray<readonly [number, number]>) {
  const bytes = new Array(length).fill(0);
  for (const [offset, move] of writes) {
    bytes[offset] = move & 0xff;
    bytes[offset + 1] = move >>> 8;
  }
  return bytes;
}

function rules(preferred = 0, fallback = 0, targetAbility = 1) {
  return createBattleScriptRulesContext({
    battlers: [
      battler(0),
      battler(1, { ability: targetAbility, moves: [SPLASH, 0, 0, 0], pp: [40, 0, 0, 0] }),
      battler(0),
      battler(1),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: MIRROR_MOVE, currentMovePosition: 0, chosenMove: MIRROR_MOVE,
    moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0,
    missType: 0, hitMarker: 1 << 10, multiHitCounter: 0,
    moveHistory: {
      lastTakenMove: packed(16, preferred ? [[0, preferred]] : []),
      // [sourceBattler][attacker] => source*2 + attacker*8.
      lastTakenMoveFrom: packed(32, fallback ? [[2, fallback]] : []),
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

function run(context: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectMirrorMove", context, 1, ports,
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 400; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`Mirror Move did not halt: ${result.kind}`);
  return result.state;
}

describe("source-complete TRYMIRRORMOVE / EFFECT_MIRROR_MOVE", () => {
  it("pins the sole operand-free source opcode", () => {
    expect(program.instructions.filter(({ opcodeName }) => opcodeName === "B_SCR_OP_TRYMIRRORMOVE"))
      .toMatchObject([{ opcodeId: 0x7c, dispatcher: "Cmd_trymirrormove", operands: [] }]);
  });

  it("prefers the packed lastTakenMove cell, clears the attack-string marker, and dynamically executes an executable selected effect with no selector RNG", () => {
    const source = rules(SPLASH, SNATCH);
    const execution = createBattleScriptStatusRulesExecution(
      program, "BattleScript_EffectMirrorMove", source, 1, ports,
    );
    const opcode = program.instructions.find(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYMIRRORMOVE",
    )!;
    const dispatch = stepBattleScriptMachine(
      program,
      Object.freeze({ ...execution.state, programCounter: opcode.programCounter }),
      execution.handlers,
    );
    if (dispatch.kind !== "advanced") throw new Error(`Mirror dispatch did not advance: ${dispatch.kind}`);
    expect(dispatch.state.rulesContext.hitMarker & (1 << 10)).toBe(0);

    const state = run(source);
    expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(state.rulesContext.currentMove).toBe(SPLASH);
    expect(state.rulesContext.selectorRoles.target).toBe(0);
    expect(state.events).toContainEqual(expect.objectContaining({
      kind: "game-stat-increment",
      gameStat: expect.objectContaining({ symbol: "GAME_STAT_USED_SPLASH" }),
    }));
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it("uses the packed lastTakenMoveFrom fallback list and draws exactly once even for its one legal candidate", () => {
    const state = run(rules(0, SPLASH));
    expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(state.rulesContext.currentMove).toBe(SPLASH);
    expect(state.rng.calls).toBe(1);
    expect(state.rng.ledger).toMatchObject([{
      call: 1,
      reason: "trymirrormove-fallback-candidate",
      randomValue: 16838,
    }]);
  });

  it("falls through with no candidate, suppresses Pressure's extra PP, prints failure, and reaches END without RNG", () => {
    const state = run(rules(0, 0, PRESSURE));
    expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(state.rulesContext.battlers[0].pp[0]).toBe(19);
    expect(state.events).toContainEqual(expect.objectContaining({
      kind: "message", messageId: "STRINGID_MIRRORMOVEFAILED",
    }));
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it("dynamically enters the now-registered Snatch effect with zero selector or setter draws", () => {
    const state = run(rules(SNATCH));
    expect(state.rulesContext.currentMove).toBe(SNATCH);
    expect(state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(state.rulesContext.battlers[0]).toMatchObject({
      stealMove: 1,
      ppNotAffectedByPressure: 1,
    });
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it("canonical replay is exact", () => {
    expect(run(rules(0, SPLASH))).toEqual(run(rules(0, SPLASH)));
  });
});
