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
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_TRANSFORMED } from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const SKETCH = 166;
const TACKLE = 33;
const SPLASH = 150;
const STRUGGLE = 165;
const UNAVAILABLE = 0xffff;
const EMPTY: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };

function battler(side: 0 | 1, changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side, ability: 1, hp: 100, maxHP: 100,
    moves: changes.moves ?? [SKETCH, SPLASH, 0, 0], pp: changes.pp ?? [1, 40, 0, 0],
    ppBonuses: changes.ppBonuses ?? 0x39,
    status1: 0, status2: changes.status2 ?? 0, status3: 0, substituteHP: 0,
    rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0,
    usedTauntedMove: 0, usedImprisonedMove: 0, item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6], types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: 1, attack: 100, defense: 100, spAttack: 100, spDefense: 100,
    speed: 100, level: 50, friendship: 70, partyIndex: 0,
  } as BattleScriptRulesBattler);
}

function party(moves: readonly [number, number, number, number], pp: readonly [number, number, number, number]) {
  return [
    { species: 1, isEgg: false, hp: 100, moves, pp, ppBonuses: 0x39 },
    EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
  ];
}

function rules(lastPrinted = TACKLE, changes: Partial<BattleScriptRulesBattler> = {}, targetStatus2 = 0) {
  const attacker = battler(0, changes);
  return createBattleScriptRulesContext({
    battlers: [
      attacker,
      battler(1, { moves: [TACKLE, 0, 0, 0], status2: targetStatus2 }),
      battler(0),
      battler(1),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: SKETCH, currentMovePosition: 0, chosenMove: SKETCH,
    moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0,
    missType: 0, hitMarker: 0, multiHitCounter: 0,
    moveHistory: { lastPrintedMoves: [9, lastPrinted, 8, 7] },
    party: {
      player: party(attacker.moves, attacker.pp),
      opponent: party([TACKLE, 0, 0, 0], [35, 0, 0, 0]),
    },
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (context, operand) => operand.expression.startsWith("STRINGID_")
    ? Object.freeze({
      kind: "message" as const,
      messageId: operand.expression,
      substitutions: Object.freeze(
        operand.expression === "STRINGID_PKMNSKETCHEDMOVE"
          ? [`MOVE:${context.state.rulesContext.battleTextBuff1Move}`]
          : [],
      ),
    }) : null,
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
    program, "BattleScript_EffectSketch", context, 1, ports,
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 300; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`Sketch did not reach END: ${result.kind}`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result.state;
}

describe("source-complete COPYMOVEPERMANENTLY / EFFECT_SKETCH", () => {
  it("pins the sole pointer-bearing source opcode", () => {
    expect(program.instructions.filter(({ opcodeName }) => opcodeName === "B_SCR_OP_COPYMOVEPERMANENTLY"))
      .toMatchObject([{
        opcodeId: 0xa8,
        dispatcher: "Cmd_copymovepermanently",
        operands: [{ widthBytes: 4, expression: "BattleScript_ButItFailed" }],
      }]);
  });

  it("reads target lastPrintedMoves and atomically persists four moves, PP, PP bonuses, controller payload, and message", () => {
    const state = run(rules());
    expect(state.rulesContext.battlers[0].moves).toEqual([TACKLE, SPLASH, 0, 0]);
    expect(state.rulesContext.battlers[0].pp).toEqual([35, 40, 0, 0]);
    expect(state.rulesContext.battlers[0].ppBonuses).toBe(0x39);
    expect(state.rulesContext.party.player[0]).toMatchObject({
      moves: [TACKLE, SPLASH, 0, 0], pp: [35, 40, 0, 0], ppBonuses: 0x39,
    });
    expect(state.events).toContainEqual(expect.objectContaining({
      kind: "set-battler-moves-pp-data", battler: 0,
      moves: [TACKLE, SPLASH, 0, 0], pp: [35, 40, 0, 0], ppBonuses: 0x39,
    }));
    expect(state.events).toContainEqual(expect.objectContaining({
      kind: "message", messageId: "STRINGID_PKMNSKETCHEDMOVE", substitutions: [`MOVE:${TACKLE}`],
    }));
    expect(state.rulesContext.chosenMove).toBe(UNAVAILABLE);
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it.each([
    ["transformed user", TACKLE, { status2: BATTLE_SCRIPT_STATUS2_TRANSFORMED }, 0],
    ["Struggle", STRUGGLE, {}, 0],
    ["none", 0, {}, 0],
    ["unavailable", UNAVAILABLE, {}, 0],
    ["Sketch", SKETCH, {}, 0],
    ["duplicate outside Sketch slot", TACKLE, { moves: [SKETCH, TACKLE, 0, 0] as const }, 0],
    ["target Substitute", TACKLE, {}, 1 << 24],
  ])("walks the %s failure gate to END without durable mutation or RNG", (_name, move, changes, status2) => {
    const source = rules(move, changes, status2);
    const state = run(source);
    expect(state.rulesContext.battlers[0].moves).toBe(source.battlers[0].moves);
    // ppreduce precedes every Sketch gate and durably spends Sketch's PP.
    expect(state.rulesContext.party.player[0].moves).toBe(source.party.player[0].moves);
    expect(state.rulesContext.party.player[0].pp).toEqual([0, 40, 0, 0]);
    expect(state.events.some(({ kind }) => kind === "set-battler-moves-pp-data")).toBe(false);
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it("canonical replay is exact", () => {
    expect(run(rules())).toEqual(run(rules()));
  });
});
