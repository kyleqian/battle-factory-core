/**
 * `B_SCR_OP_TRYSETSPIKES` / `Cmd_trysetspikes`
 * (`battle_script_commands.c:8485-8500`).
 *
 * Spikes belongs to the side opposite the attacker. The normal source
 * invariant is 0..3 layers; the literal equality check means a representable
 * corrupt value above 3 still takes the u8 increment branch.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import type {
  BattleScriptRulesBattlers,
  BattleScriptRulesContext,
  BattleScriptSideTimerState,
} from "./battleScriptRulesContext.ts";

export const BATTLE_SCRIPT_SIDE_STATUS_SPIKES = 1 << 4;

function withPressureExemption(
  rules: BattleScriptRulesContext,
  attacker: 0 | 1 | 2 | 3,
): BattleScriptRulesContext {
  const battlers = rules.battlers.map((battler, index) =>
    index === attacker
      ? Object.freeze({ ...battler, ppNotAffectedByPressure: 1 as const })
      : battler
  ) as unknown as BattleScriptRulesBattlers;
  return Object.freeze({ ...rules, battlers: Object.freeze(battlers) });
}

function createHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [failurePointer] = context.instruction.operands;
    if (context.instruction.operands.length !== 1 || failurePointer?.widthBytes !== 4) {
      throw new Error("Cmd_trysetspikes requires exactly one four-byte failure pointer");
    }
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const targetSide = rules.battlers[attacker].side === 0 ? 1 : 0;
    const amount = rules.sideTimers[targetSide].spikesAmount;

    if (amount === 3) {
      const target = resolveBattleScriptLabel(program, failurePointer.expression);
      if (!target) throw new Error(`Cmd_trysetspikes unresolved failure target ${failurePointer.expression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: target.programCounter }),
        { rulesContext: withPressureExemption(rules, attacker) },
      );
    }

    const sideStatuses = [...rules.sideStatuses] as [number, number];
    sideStatuses[targetSide] = (sideStatuses[targetSide] | BATTLE_SCRIPT_SIDE_STATUS_SPIKES) >>> 0;
    const sideTimers = [...rules.sideTimers] as [
      BattleScriptSideTimerState,
      BattleScriptSideTimerState,
    ];
    sideTimers[targetSide] = Object.freeze({
      ...sideTimers[targetSide],
      spikesAmount: (amount + 1) & 0xff,
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rules,
          sideStatuses: Object.freeze(sideStatuses),
          sideTimers: Object.freeze(sideTimers),
        }),
      },
    );
  };
}

export function createBattleScriptTrysetspikesOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSETSPIKES",
  );
  if (instructions.length !== 1) {
    throw new Error(`B_SCR_OP_TRYSETSPIKES requires exactly 1 concrete start, got ${instructions.length}`);
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xb0
    || instruction!.dispatcher !== "Cmd_trysetspikes"
    || instruction!.operands.length !== 1
    || instruction!.operands[0]!.widthBytes !== 4
  ) {
    throw new Error(`invalid B_SCR_OP_TRYSETSPIKES shape at program counter ${instruction!.programCounter}`);
  }
  return Object.freeze({ [instruction!.opcodeId]: createHandler(program) });
}
