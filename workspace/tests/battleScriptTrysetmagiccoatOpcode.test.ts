import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";

const MAGIC_COAT = 277;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSETMAGICCOAT",
)!;
const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true, prepareMessage: () => null,
  prepareSelectionMessage: () => null, prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null, resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: () => null, resolveByteOperand: () => null,
});

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0, ability: changes.ability ?? 0,
    hp: changes.hp ?? 100, moves: changes.moves ?? ([MAGIC_COAT, 0, 0, 0] as const),
    pp: changes.pp ?? ([15, 0, 0, 0] as const), status1: 0, status2: 0, status3: 0,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0,
    rechargeTimer: 0, flinchImmobility: 0, disabledMove: 0,
    usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0, bounceMove: changes.bounceMove ?? 0,
    ppNotAffectedByPressure: changes.ppNotAffectedByPressure ?? 0,
  });
}

function step(actionNumber: number, bounceMove: 0 | 1 = 0) {
  const rules = createBattleScriptRulesContext({
    battlers: [battler({ bounceMove }), battler({ side: 1 }), battler(), battler({ side: 1 })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: MAGIC_COAT, currentMovePosition: 0, moveResultFlags: 0,
    dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0,
    hitMarker: 0, multiHitCounter: 0, currentTurnActionNumber: actionNumber,
  });
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectMagicCoat", rules, 0x1234_5678, ports,
  );
  return stepBattleScriptMachine(program, Object.freeze({
    ...execution.state, programCounter: instruction.programCounter,
  }), execution.handlers);
}

describe("source-complete B_SCR_OP_TRYSETMAGICCOAT registration", () => {
  it("pins opcode 0xdf and its exact four-byte failure pointer", () => {
    expect(instruction).toMatchObject({
      opcodeId: 0xdf, dispatcher: "Cmd_trysetmagiccoat",
      operands: [{ widthBytes: 4, expression: "BattleScript_FailedFromAtkString" }],
    });
    expect(1 + instruction.operands.reduce((sum, operand) => sum + operand.widthBytes, 0)).toBe(5);
  });

  it("targets and arms the non-last attacker, preserving a repeated arm", () => {
    for (const before of [0, 1] as const) {
      const result = step(0, before);
      expect(result.kind).toBe("advanced");
      expect(result.state.programCounter).toBe(instruction.programCounter + 1);
      expect(result.state.rulesContext.selectorRoles.target).toBe(0);
      expect(result.state.rulesContext.battlers[0]).toMatchObject({
        bounceMove: 1, ppNotAffectedByPressure: 1,
      });
      expect(result.state.rng.calls).toBe(0);
      expect(result.state.events).toEqual([]);
    }
  });

  it("acts-last failure still targets and marks Pressure exemption without arming", () => {
    const result = step(1, 0);
    expect(result.kind).toBe("advanced");
    expect(result.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_FailedFromAtkString")!.programCounter,
    );
    expect(result.state.rulesContext.selectorRoles.target).toBe(0);
    expect(result.state.rulesContext.battlers[0]).toMatchObject({
      bounceMove: 0, ppNotAffectedByPressure: 1,
    });
  });
});
