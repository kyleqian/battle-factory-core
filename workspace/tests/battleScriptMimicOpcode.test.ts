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
  BATTLE_SCRIPT_STATUS2_TRANSFORMED,
} from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const MIMIC = 102;
const TACKLE = 33;
const SPLASH = 150;
const METRONOME = 118;
const STRUGGLE = 165;
const SKETCH = 166;
const NONE = 0;
const UNAVAILABLE = 0xffff;
const STATUS2_SUBSTITUTE = 1 << 24;

function battler(side: 0 | 1, changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side, ability: 1, hp: 100, maxHP: 100,
    moves: changes.moves ?? [MIMIC, SPLASH, 0, 0], pp: changes.pp ?? [10, 40, 0, 0],
    status1: 0, status2: changes.status2 ?? 0, status3: 0, substituteHP: 0,
    rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0,
    usedTauntedMove: 0, usedImprisonedMove: 0, item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6], types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: 1, attack: 100, defense: 100, spAttack: 100, spDefense: 100,
    speed: 100, level: 50, friendship: 70, partyIndex: 0,
  } as BattleScriptRulesBattler);
}

function rules(lastMove = TACKLE, attackerChanges: Partial<BattleScriptRulesBattler> = {}, targetStatus2 = 0) {
  return createBattleScriptRulesContext({
    battlers: [
      battler(0, attackerChanges),
      battler(1, { moves: [TACKLE, 0, 0, 0], status2: targetStatus2 }),
      battler(0),
      battler(1),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: MIMIC, currentMovePosition: 0, chosenMove: MIMIC,
    moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0,
    missType: 0, hitMarker: 0, multiHitCounter: 0,
    moveHistory: { lastMoves: [9, lastMove, 8, 7] },
  });
}

const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: (context, operand) => operand.expression.startsWith("STRINGID_")
    ? Object.freeze({
      kind: "message" as const,
      messageId: operand.expression,
      substitutions: Object.freeze(
        operand.expression === "STRINGID_PKMNLEARNEDMOVE2"
          ? [`MOVE:${context.state.rulesContext.battleTextBuff1Move}`]
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

function run(context: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectMimic", context, 1, ports,
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 300; steps += 1) {
    result = stepBattleScriptMachine(program, ack(result.state), execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`Mimic did not reach END: ${result.kind}`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result.state;
}

describe("source-complete MIMICATTACKCOPY / EFFECT_MIMIC", () => {
  it("pins the sole pointer-bearing source opcode", () => {
    expect(program.instructions.filter(({ opcodeName }) => opcodeName === "B_SCR_OP_MIMICATTACKCOPY"))
      .toMatchObject([{
        opcodeId: 0x9d,
        dispatcher: "Cmd_mimicattackcopy",
        operands: [{ widthBytes: 4, expression: "BattleScript_ButItFailed" }],
      }]);
  });

  it("reads exactly target lastMoves, replaces the active slot temporarily, clamps PP to five, sets the volatile bit, and names the move", () => {
    const state = run(rules());
    expect(state.rulesContext.battlers[0].moves).toEqual([TACKLE, SPLASH, 0, 0]);
    expect(state.rulesContext.battlers[0].pp).toEqual([5, 40, 0, 0]);
    expect(state.rulesContext.battlers[0].mimickedMoves).toBe(1);
    expect(state.rulesContext.chosenMove).toBe(UNAVAILABLE);
    expect(state.rulesContext.battleTextBuff1Move).toBe(TACKLE);
    expect(state.events).toContainEqual(expect.objectContaining({
      kind: "message", messageId: "STRINGID_PKMNLEARNEDMOVE2", substitutions: [`MOVE:${TACKLE}`],
    }));
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it.each([
    ["Metronome", METRONOME, {}, 0],
    ["Struggle", STRUGGLE, {}, 0],
    ["Sketch", SKETCH, {}, 0],
    ["Mimic", MIMIC, {}, 0],
    ["none", NONE, {}, 0],
    ["unavailable", UNAVAILABLE, {}, 0],
    ["duplicate", TACKLE, { moves: [MIMIC, TACKLE, 0, 0] as const }, 0],
    ["transformed user", TACKLE, { status2: BATTLE_SCRIPT_STATUS2_TRANSFORMED }, 0],
    ["target Substitute", TACKLE, {}, STATUS2_SUBSTITUTE],
  ])("walks the %s failure gate to END without mutation or RNG", (_name, lastMove, changes, targetStatus) => {
    const source = rules(lastMove, changes, targetStatus);
    const state = run(source);
    expect(state.rulesContext.battlers[0].moves).toBe(source.battlers[0].moves);
    expect(state.rulesContext.battlers[0].mimickedMoves).toBe(0);
    expect(state.rng).toMatchObject({ calls: 0, ledger: [] });
  });

  it("canonical replay is exact", () => {
    expect(run(rules())).toEqual(run(rules()));
  });
});
