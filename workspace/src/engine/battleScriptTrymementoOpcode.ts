/**
 * Memento's `B_SCR_OP_TRYMEMENTO` / `Cmd_trymemento`
 * (`battle_script_commands.c:9072-9091`).
 *
 * The command fails only when both target Attack and Sp. Attack are already
 * at the minimum stage and the move was not stopped by Protect. Protect is
 * deliberately a success here because the protected script arm still makes
 * the user faint. Substitute is not a gate: the effect script checks it only
 * after the user's HP has been set to zero and skips the two stat drops.
 */
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import { STAT_ATK, STAT_SPATK } from "./battleScriptStatBuffs.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

const B_MSG_PROTECTED = 1;
const MIN_STAT_STAGE = 0;
const INSTANT_HP_BAR_DROP = 0x7fff;

function createTrymementoHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [failureOperand] = context.instruction.operands;
    if (
      context.instruction.opcodeId !== 0xc9
      || context.instruction.dispatcher !== "Cmd_trymemento"
      || context.instruction.operands.length !== 1
      || failureOperand?.widthBytes !== 4
    ) {
      throw new Error(
        `invalid B_SCR_OP_TRYMEMENTO shape at program counter ${context.state.programCounter}`,
      );
    }
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const target = requireBattlerRole(rules, "target");
    const targetState = rules.battlers[target];
    if (
      targetState.statStages[STAT_ATK] === MIN_STAT_STAGE
      && targetState.statStages[STAT_SPATK] === MIN_STAT_STAGE
      && rules.missType !== B_MSG_PROTECTED
    ) {
      const failure = resolveBattleScriptLabel(context.program, failureOperand.expression);
      if (!failure) throw new Error(`Cmd_trymemento: unresolved failure target ${failureOperand.expression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rules,
          battleMoveDamage: rules.battlers[attacker].hp,
        }),
        scheduler: markBattleScriptControllerPending(context.state.scheduler, attacker),
        events: Object.freeze([
          Object.freeze({
            kind: "health-bar-update" as const,
            battler: attacker,
            healthValue: INSTANT_HP_BAR_DROP,
          }),
        ]),
      },
    );
  };
}

export function createBattleScriptTrymementoOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYMEMENTO",
  );
  if (instructions.length !== 2) {
    throw new Error(`B_SCR_OP_TRYMEMENTO requires exactly 2 concrete starts, got ${instructions.length}`);
  }
  for (const instruction of instructions) {
    if (
      instruction.opcodeId !== 0xc9
      || instruction.dispatcher !== "Cmd_trymemento"
      || instruction.operands.length !== 1
      || instruction.operands[0]?.widthBytes !== 4
    ) {
      throw new Error(`invalid B_SCR_OP_TRYMEMENTO shape at program counter ${instruction.programCounter}`);
    }
  }
  return Object.freeze({ [instructions[0]!.opcodeId]: createTrymementoHandler() });
}
