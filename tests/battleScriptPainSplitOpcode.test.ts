import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { BATTLE_SCRIPT_IGNORE_SHELL_BELL } from "../src/engine/battleScriptPainSplitOpcode.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";
import { handleBattleActionFinished } from "../src/engine/battleActionFinished.ts";

const program = loadBattleScriptProgram();
const MOVE_PAIN_SPLIT = 220;
const instruction = program.instructions.find(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_PAINSPLITDMGCALC",
)!;

function battler(
  side: 0 | 1,
  hp: number,
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side,
    ability: 0,
    hp,
    maxHP: changes.maxHP ?? hp,
    moves: changes.moves ?? ([MOVE_PAIN_SPLIT, 0, 0, 0] as const),
    pp: changes.pp ?? ([20, 0, 0, 0] as const),
    status1: 0,
    status2: changes.status2 ?? 0,
    status3: 0,
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
    partyIndex: 0,
  });
}

function party(hp: number): readonly BattleScriptPartyMemberInput[] {
  return Object.freeze([
    Object.freeze({
      species: 1,
      hp,
      moves: [MOVE_PAIN_SPLIT, 0, 0, 0] as const,
      pp: [20, 0, 0, 0] as const,
    }),
    {}, {}, {}, {}, {},
  ]);
}

function rules(attackerHp: number, targetHp: number, targetStatus2 = 0) {
  return createBattleScriptRulesContext({
    battlers: [
      battler(0, attackerHp, { maxHP: 167 }),
      battler(1, targetHp, { maxHP: 116, status2: targetStatus2 }),
      battler(0, 0),
      battler(1, 0),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_PAIN_SPLIT,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: { player: party(attackerHp), opponent: party(targetHp) },
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (
      context: Readonly<{ state: BattleScriptMachineState<BattleScriptRulesContext> }>,
    ) => context.state.scheduler.pendingControllerBattlers.length === 0,
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
      operand.expression.startsWith("B_WAIT_TIME_") ? 1 : Number(operand.expression),
    resolveByteOperand: () => null,
  });
}

function execution(source: BattleScriptRulesContext) {
  return createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectPainSplit",
    source,
    7,
    ports(),
  );
}

function stepOpcode(source: BattleScriptRulesContext) {
  const run = execution(source);
  return stepBattleScriptMachine(
    program,
    Object.freeze({ ...run.state, programCounter: instruction.programCounter }),
    run.handlers,
  );
}

function run(source: BattleScriptRulesContext) {
  const current = execution(source);
  let state = current.state;
  for (let guard = 0; guard < 1000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, current.handlers);
    if (result.kind === "halted") return result.state;
    expect(result.kind).not.toBe("unsupported");
    state = result.state;
    if (result.kind === "blocked") {
      for (const battlerId of state.scheduler.pendingControllerBattlers) {
        state = acknowledgeBattleScriptMachineController(state, battlerId);
      }
    }
  }
  throw new Error("Pain Split did not reach its terminal");
}

describe("B_SCR_OP_PAINSPLITDMGCALC / EFFECT_PAIN_SPLIT", () => {
  it("registers the exact pointer shape and derives both signed floor-average deltas", () => {
    expect(instruction).toMatchObject({
      opcodeId: 0xa5,
      dispatcher: "Cmd_painsplitdmgcalc",
      operands: [{ widthBytes: 4, expression: "BattleScript_ButItFailed" }],
    });
    for (const [attackerHp, targetHp, attackerDamage, targetDamage] of [
      [117, 100, 9, -8],
      [100, 117, -8, 9],
      [100, 101, 0, 1],
      [100, 100, 0, 0],
    ]) {
      const result = stepOpcode(rules(attackerHp, targetHp));
      if (result.kind !== "advanced") throw new Error(`Pain Split did not advance: ${result.kind}`);
      expect(result.state.rulesContext).toMatchObject({
        battleMoveDamage: attackerDamage,
        painSplitHp: targetDamage,
      });
      expect(result.state.rulesContext.battlers[1].specialStatus.shellBellDmg)
        .toBe(BATTLE_SCRIPT_IGNORE_SHELL_BELL);
      expect(result.state.rng.calls).toBe(0);
    }
  });

  it("takes the Substitute failure pointer without changing scratch or Shell Bell state", () => {
    const result = stepOpcode(rules(
      117,
      100,
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE,
    ));
    if (result.kind !== "advanced") throw new Error(`Pain Split did not jump: ${result.kind}`);
    expect(result.state.programCounter).not.toBe(instruction.programCounter + 1);
    expect(result.state.rulesContext).toMatchObject({ battleMoveDamage: 0, painSplitHp: 0 });
    expect(result.state.rulesContext.battlers[1].specialStatus.shellBellDmg).toBe(0);
    expect(result.state.rng.calls).toBe(0);
  });

  it("pins the OFF receipt and walks both controller HP writes to END with zero draws", () => {
    const first = run(rules(117, 100));
    const replay = run(rules(117, 100));
    expect(first.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(first.rulesContext.battlers[0]).toMatchObject({ hp: 108, pp: [19, 0, 0, 0] });
    expect(first.rulesContext.battlers[1].hp).toBe(108);
    expect(first.rulesContext.party.player[0]).toMatchObject({ hp: 108, pp: [19, 0, 0, 0] });
    expect(first.rulesContext.party.opponent[0].hp).toBe(108);
    expect(first.rulesContext.battlers[1].specialStatus.shellBellDmg)
      .toBe(BATTLE_SCRIPT_IGNORE_SHELL_BELL);
    expect(first.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_SHAREDPAIN" }),
    ]));
    expect(first.rng.calls).toBe(0);
    expect(replay).toEqual(first);

    const finished = handleBattleActionFinished(first, 0);
    expect(finished.rulesContext.painSplitHp).toBe(0);
    expect(finished.rulesContext.battlers[1].specialStatus.shellBellDmg).toBe(0);
  });
});
