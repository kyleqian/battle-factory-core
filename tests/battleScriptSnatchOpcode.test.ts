import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";

const SNATCH = 289;
const SYNTHESIS = 235;
const program = loadBattleScriptProgram();
const ports: BattleScriptStatusRulesExternalPorts = Object.freeze({
  isControllerIdle: () => true, prepareMessage: () => null,
  prepareSelectionMessage: () => null, prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => null, resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: () => null, resolveByteOperand: () => null,
});

function battler(side: 0 | 1, move: number, pp: number, changes: Partial<BattleScriptRulesBattler> = {}) {
  return Object.freeze({
    side, ability: changes.ability ?? 0, hp: 100,
    moves: [move, 0, 0, 0] as const, pp: [pp, 0, 0, 0] as const,
    status1: 0, status2: 0, status3: 0, substituteHP: 0, rolloutTimer: 0,
    furyCutterCounter: 0, truantCounter: 0 as const, rechargeTimer: 0,
    flinchImmobility: 0 as const, disabledMove: 0, usedDisabledMove: 0 as const,
    tauntTimer: 0, usedTauntedMove: 0 as const, usedImprisonedMove: 0 as const,
    stealMove: changes.stealMove ?? 0, ppNotAffectedByPressure: 0 as const,
  });
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext({
    battlers: [
      battler(0, SNATCH, 10),
      battler(1, SYNTHESIS, 5),
      battler(0, 33, 35),
      battler(1, 33, 35),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: SNATCH, currentMovePosition: 0, moveResultFlags: 0,
    dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0,
    hitMarker: 0, multiHitCounter: 0,
    ...changes,
  });
}

function stepAt(label: string, context: BattleScriptRulesContext, programCounter?: number) {
  const execution = createBattleScriptStatusRulesExecution(program, label, context, 0xa15a_b8e2, ports);
  return stepBattleScriptMachine(program, Object.freeze({
    ...execution.state,
    programCounter: programCounter ?? execution.state.programCounter,
  }), execution.handlers);
}

describe("source-complete Snatch setter and redirect role commands", () => {
  it("registers opcode e0, arms with zero draws, and fails only on the last action after setting Pressure exemption", () => {
    const instruction = program.instructions.find(({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSETSNATCH")!;
    expect(instruction).toMatchObject({
      opcodeId: 0xe0, dispatcher: "Cmd_trysetsnatch",
      operands: [{ expression: "BattleScript_FailedFromAtkString", widthBytes: 4 }],
    });
    for (const [action, armed, failure] of [[0, 1, false], [1, 0, true]] as const) {
      const result = stepAt(
        "BattleScript_EffectSnatch",
        rules({ currentTurnActionNumber: action }),
        instruction.programCounter,
      );
      expect(result.kind).toBe("advanced");
      expect(result.state.rulesContext.battlers[0]).toMatchObject({
        stealMove: armed, ppNotAffectedByPressure: 1,
      });
      expect(result.state.rng.calls).toBe(0);
      expect(result.state.programCounter).toBe(failure
        ? resolveBattleScriptLabel(program, "BattleScript_FailedFromAtkString")!.programCounter
        : instruction.programCounter + 1);
      if (!failure) {
        const ppreducePc = program.instructions.find(
          ({ opcodeName, programCounter }) =>
            opcodeName === "B_SCR_OP_PPREDUCE"
            && programCounter > instruction.programCounter
            && programCounter < instruction.programCounter + 8,
        )!.programCounter;
        const reduced = stepBattleScriptMachine(program, Object.freeze({
          ...result.state, programCounter: ppreducePc,
        }), createBattleScriptStatusRulesExecution(
          program, "BattleScript_EffectSnatch", result.state.rulesContext, 0xa15a_b8e2, ports,
        ).handlers);
        expect(reduced.state.rulesContext.battlers[0].pp[0]).toBe(9);
      }
    }

    const doubles = rules({
      battlers: [
        battler(0, SNATCH, 10),
        battler(1, SYNTHESIS, 5, { ability: 46 }),
        battler(0, 33, 35),
        battler(1, 33, 35, { ability: 46 }),
      ],
      battleTopology: {
        battlersCount: 4, battleTypeFlags: 1, battlerPositions: [0, 1, 2, 3],
      },
    });
    const set = stepAt("BattleScript_EffectSnatch", doubles, instruction.programCounter);
    const ppreducePc = program.instructions.find(
      ({ opcodeName, programCounter }) =>
        opcodeName === "B_SCR_OP_PPREDUCE"
        && programCounter > instruction.programCounter
        && programCounter < instruction.programCounter + 8,
    )!.programCounter;
    const reduced = stepBattleScriptMachine(program, Object.freeze({
      ...set.state, programCounter: ppreducePc,
    }), createBattleScriptStatusRulesExecution(
      program, "BattleScript_EffectSnatch", set.state.rulesContext, 0xa15a_b8e2, ports,
    ).handlers);
    expect(reduced.state.rulesContext.battlers[0].pp[0]).toBe(9);
    expect(reduced.state.rng.calls).toBe(0);
  });

  it("reproduces the OFF self-target receipt roles and returns to the same canceler continuation", () => {
    const source = rules({
      battlers: [
        battler(0, SNATCH, 9, { stealMove: 1 }),
        battler(1, SYNTHESIS, 5),
        battler(0, 33, 35),
        battler(1, 33, 35),
      ],
      selectorRoles: { attacker: 1, target: 1, effectBattler: 1 },
      scriptingBattler: 1, currentMove: SYNTHESIS, battlerByTurnOrder: [0, 1, 2, 3],
    });
    const execution = createBattleScriptStatusRulesExecution(
      program, "BattleScript_EffectSynthesis", source, 0xa15a_b8e2, ports,
    );
    const redirected = stepBattleScriptMachine(program, execution.state, execution.handlers);
    expect(redirected.kind).toBe("advanced");
    expect(redirected.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_SnatchedMove")!.programCounter,
    );
    expect(redirected.state.callStack).toEqual([
      resolveBattleScriptLabel(program, "BattleScript_EffectSynthesis")!.programCounter,
    ]);

    const stolenPpPc = program.instructions.find(
      ({ opcodeName, programCounter }) =>
        opcodeName === "B_SCR_OP_PPREDUCE"
        && programCounter > redirected.state.programCounter
        && programCounter < redirected.state.programCounter + 8,
    )!.programCounter;
    const reduced = stepBattleScriptMachine(program, Object.freeze({
      ...redirected.state, programCounter: stolenPpPc,
    }), execution.handlers);
    expect(reduced.state.rulesContext.battlers[0].pp[0]).toBe(9);
    expect(reduced.state.rulesContext.battlers[1].pp[0]).toBe(4);

    const snatchSetPc = program.instructions.find(
      ({ opcodeName }) => opcodeName === "B_SCR_OP_SNATCHSETBATTLERS",
    )!.programCounter;
    const roles = stepBattleScriptMachine(program, Object.freeze({
      ...reduced.state, programCounter: snatchSetPc,
    }), execution.handlers);
    expect(roles.state.rulesContext.selectorRoles).toMatchObject({
      attacker: 0, target: 0, effectBattler: 1,
    });
    expect(roles.state.rulesContext.scriptingBattler).toBe(1);

    const returnPc = program.instructions.find(
      ({ opcodeName, programCounter }) =>
        opcodeName === "B_SCR_OP_RETURN" && programCounter > snatchSetPc,
    )!.programCounter;
    const returned = stepBattleScriptMachine(program, Object.freeze({
      ...roles.state, programCounter: returnPc,
    }), execution.handlers);
    expect(returned.kind).toBe("advanced");
    expect(returned.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_EffectSynthesis")!.programCounter,
    );
    expect(returned.state.callStack).toEqual([]);
    expect(returned.state.rng.calls).toBe(0);
  });
});
